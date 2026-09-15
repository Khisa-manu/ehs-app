import express from 'express';
import path from 'path';
import fs from 'fs';
import { createSqliteApiMiddleware } from './vite-sqlite-api';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount backend SQLite API and uploads handler
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
