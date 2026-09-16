import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { createSqliteApiMiddleware } from './vite-sqlite-api';

function handlePhpDashboard(req: express.Request, res: express.Response) {
  const phpScript = path.join(process.cwd(), 'cpanel-backend', 'dashboard.php');
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : '';

  const bodyChunks: Buffer[] = [];
  req.on('data', chunk => bodyChunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(bodyChunks);

    const phpProcess = spawn('php', [phpScript], {
      env: {
        ...process.env,
        REQUEST_METHOD: req.method,
        QUERY_STRING: query,
        HTTP_HOST: req.headers.host || 'localhost:3000',
        HTTP_ACCEPT: req.headers.accept || 'text/html',
        CONTENT_TYPE: req.headers['content-type'] || '',
        CONTENT_LENGTH: String(body.length),
      }
    });

    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    phpProcess.stdout.on('data', chunk => chunks.push(chunk));
    phpProcess.stderr.on('data', chunk => errChunks.push(chunk));

    phpProcess.on('close', code => {
      if (code !== 0 && chunks.length === 0) {
        res.status(500).send('PHP Error: ' + Buffer.concat(errChunks).toString());
        return;
      }

      const output = Buffer.concat(chunks);
      const text = output.toString('utf-8');

      if (query.includes('action=export_csv')) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Spectrum_EHS_Compliance_${Date.now()}.csv"`);
      } else if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      } else {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      res.send(output);
    });

    if (body.length > 0) {
      phpProcess.stdin.write(body);
    }
    phpProcess.stdin.end();
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'cpanel-backend', 'uploads')));

  // Direct PHP Dashboard routes
  app.all(['/dashboard', '/dashboard.php', '/admin', '/index.php'], handlePhpDashboard);

  // If user visits root path with browser (HTML), serve PHP Admin Dashboard
  app.get('/', (req, res, next) => {
    const accept = req.headers.accept || '';
    if (accept.includes('text/html') || !accept || accept === '*/*') {
      return handlePhpDashboard(req, res);
    }
    next();
  });

  // Mount backend SQLite API for Android / Mobile sync
  const sqliteMiddleware = createSqliteApiMiddleware();
  app.use(sqliteMiddleware);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'Spectrum Engineering EHS' });
  });

  const isProd = process.env.NODE_ENV === 'production' || !process.env.npm_lifecycle_event?.includes('dev');
  const distPath = path.join(process.cwd(), 'dist');

  // If in production or dist/ exists and not running dev, serve static files
  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Dynamic import of Vite in dev to keep production bundle lean & isolated
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
