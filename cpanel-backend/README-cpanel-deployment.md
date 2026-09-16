# FieldPulse EHS - cPanel Shared Hosting & Local Deployment Guide
## PHP Backend: MySQL / MariaDB & SQLite Engines

This guide details the procedure to deploy the **FieldPulse EHS Mobile Application Backend** onto any standard **cPanel shared-hosting account** or Apache/PHP server running **PHP 7.4/8.x** with either **SQLite** (zero-configuration portable database) or **MySQL/MariaDB**.

---

### Backend Directory Structure

All necessary PHP files are pre-built inside the `/cpanel-backend/` directory:

```
cpanel-backend/
├── .htaccess                   # Apache rewrite rules for REST routing & security
├── config.php                  # Dual-engine connection (MySQL/SQLite PDO), CORS & helpers
├── index.php                   # REST API Front Controller
├── schema.sql                  # MySQL/MariaDB database schema with default seed data
├── schema.sqlite.sql           # SQLite database schema with default seed data
├── README-cpanel-deployment.md # This deployment guide
└── uploads/                    # Local storage folder for field photos
    └── .htaccess               # Prevents script execution in uploads directory
```

---

### Database Options: Choose SQLite or MySQL/MariaDB

You can choose either database engine simply by setting `DB_DRIVER` in `config.php`:

#### Option 1: SQLite (Recommended for Fastest Zero-Config Setup)
- **Zero setup**: No database wizard, no phpMyAdmin, no user passwords!
- In `config.php`:
  ```php
  define('DB_DRIVER', 'sqlite');
  define('DB_SQLITE_PATH', __DIR__ . '/fieldpulse.sqlite');
  ```
- The backend will **automatically create `fieldpulse.sqlite`** and populate all tables and seed data upon the first request!

#### Option 2: MySQL / MariaDB
- Standard relational database setup via cPanel.
- In `config.php`:
  ```php
  define('DB_DRIVER', 'mysql');
  define('DB_HOST', 'sql211.infinityfree.com');
  define('DB_NAME', 'if0_42929742_fieldpulse');
  define('DB_USER', 'if0_42929742');
  define('DB_PASS', 'paperglow2026');
  define('DB_PORT', 3306);
  define('DB_CHARSET', 'utf8mb4');
  ```
- Import `schema.sql` into phpMyAdmin (instructions below).

---

### Step 1 (MySQL Only): Create the MySQL Database in cPanel

1. Log into your **cPanel** control panel.
2. In the **Databases** section, click on **MySQL Database Wizard**.
3. **Step 1 - Create A Database**:
   - Enter a name, e.g. `fieldpulse` (cPanel will prepend your account username, e.g. `cpaneluser_fieldpulse`).
   - Click **Next Step**.
4. **Step 2 - Create Database Users**:
   - Enter a username, e.g. `dbuser` (e.g. `cpaneluser_dbuser`).
   - Generate a strong password and save it securely.
   - Click **Create User**.
5. **Step 3 - Add User to Database**:
   - Check **ALL PRIVILEGES**.
   - Click **Make Changes**.

---

### Step 2: Import the Database Schema & Seed Data

1. Return to the cPanel main dashboard.
2. Under the **Databases** section, open **phpMyAdmin**.
3. In the left-hand column, select your newly created database (`cpaneluser_fieldpulse`).
4. Click on the **Import** tab in the top navigation bar.
5. Click **Choose File** and select the `/cpanel-backend/schema.sql` file.
6. Ensure the format is set to **SQL**, then click **Import** (or **Go**).
7. You should see 5 tables created with seed data:
   - `users` (Field technicians and administrators)
   - `daily_reports` (Clock-in records, GPS metadata, photos, tamper flags)
   - `ehs_questions` (Pre-shift safety questions)
   - `system_settings` (Expected start time, grace periods, geofence rules)
   - `audit_logs` (Administrative overrides and sync audit trails)

---

### Step 3: Configure Database Credentials in `config.php`

Open `/cpanel-backend/config.php` in a code editor (or cPanel File Manager Editor) and update lines 18–22:

```php
define('DB_HOST', 'sql211.infinityfree.com');
define('DB_NAME', 'if0_42929742_fieldpulse');
define('DB_USER', 'if0_42929742');
define('DB_PASS', 'paperglow2026');
define('DB_PORT', 3306);
define('DB_CHARSET', 'utf8mb4');
```

---

### Step 4: Upload the PHP Backend to cPanel

Depending on how you wish to structure your domain:

#### Option A: Unified Domain (Recommended)
Host the frontend at `https://yourdomain.com/` and the PHP API at `https://yourdomain.com/api/`.

1. In cPanel, open **File Manager** and navigate into `public_html/`.
2. Create a folder named `api`.
3. Upload the contents of `/cpanel-backend/` into `public_html/api/`:
   - `public_html/api/config.php`
   - `public_html/api/index.php`
   - `public_html/api/.htaccess`
   - `public_html/api/uploads/`
   - `public_html/api/uploads/.htaccess`
4. Set permissions for `public_html/api/uploads/` to `755` (Read/Write/Execute for owner).

#### Option B: Dedicated API Subdomain
Host the API at `https://api.yourdomain.com/`.

1. In cPanel, create a Subdomain `api.yourdomain.com` pointing to document root `public_html/api/` or `api/`.
2. Upload all files from `/cpanel-backend/` directly into that root.
3. Update `.htaccess` if needed to match root `RewriteBase /`.

---

### Step 5: Test the PHP API Endpoints

You can verify your PHP backend is live using a browser or `curl`:

```bash
# 1. Check API Health
curl -s https://yourdomain.com/api/v1/health
# Response: {"status":"ok","database":"connected","engine":"MySQL (cPanel Shared Hosting)"}

# 2. Check Technicians Roster
curl -s https://yourdomain.com/api/v1/technicians

# 3. Check EHS Safety Checklist Questions
curl -s https://yourdomain.com/api/v1/ehs/questions
```

---

### Step 6: Deploy the React / PWA Frontend to cPanel

1. In your local development workspace, build the production static files:
   ```bash
   npm run build
   ```
   *(If hosting the frontend on a separate domain from the API, create a `.env.production` file containing `VITE_API_BASE_URL=https://api.yourdomain.com` before running `npm run build`)*.

2. The compilation will produce production assets in the `/dist` directory.
3. In cPanel **File Manager**, upload all files from `/dist` into `public_html/`:
   - `public_html/index.html`
   - `public_html/assets/` (bundled JS & CSS)
   - `public_html/manifest.json`
   - `public_html/icon.svg` / PWA icons

4. Add the following SPA fallback rule to `public_html/.htaccess` so refreshing routes (e.g. `/admin`) loads `index.html`:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     # Don't rewrite calls to the /api folder or existing files
     RewriteRule ^api/ - [L]
     RewriteCond %{REQUEST_FILENAME} -f [OR]
     RewriteCond %{REQUEST_FILENAME} -d
     RewriteRule ^ - [L]
     RewriteRule ^ index.html [L]
   </IfModule>
   ```

---

### REST API Endpoint Reference (PHP/MySQL)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Verifies MySQL connection and database status. |
| `POST` | `/api/v1/auth/login` | Technician / Admin login by email. |
| `GET` | `/api/v1/users` | List of all system users. |
| `GET` | `/api/v1/technicians` | Roster of active field technicians. |
| `POST` | `/api/v1/technicians` | Create a new technician. |
| `PATCH` | `/api/v1/technicians/{id}` | Update technician details / status. |
| `DELETE` | `/api/v1/technicians/{id}` | Deactivate technician. |
| `GET` | `/api/v1/ehs/questions` | Mandatory OSHA checklist questions. |
| `POST` | `/api/v1/photos/presign-upload` | Generates storage path for photo uploads. |
| `POST` | `/api/v1/photos/upload-direct` | Uploads base64 photo to server `uploads/` directory. |
| `POST` | `/api/v1/sync/batch` | Idempotent clock-in synchronization with automatic late status calculation. |
| `GET` | `/api/v1/reports/today?technicianId={id}` | Check today's clock-in status for technician. |
| `GET` | `/api/v1/admin/dashboard/summary` | Real-time counts (total, clocked in, on-time, late, offline). |
| `GET` | `/api/v1/admin/reports` | Filterable reports by date, technician, status, or search term. |
| `GET` | `/api/v1/admin/reports/{id}` | Single report details. |
| `POST` | `/api/v1/admin/reports/{id}/override` | Admin status override with mandatory reason. |
| `GET` | `/api/v1/admin/reports/export` | Download daily reports as CSV. |
| `GET` | `/api/v1/admin/settings` | System-wide grace period and expected start time. |
| `PUT` | `/api/v1/admin/settings` | Update system settings. |
| `GET` | `/api/v1/admin/audit-logs` | Immutable audit trail. |

---

### Troubleshooting Common cPanel Issues

1. **404 Not Found on API Routes (`/api/v1/...`)**:
   - Ensure Apache `mod_rewrite` is enabled on your hosting account (enabled by default on all standard cPanel hosts).
   - Ensure `public_html/api/.htaccess` is uploaded and contains `RewriteEngine On`.

2. **Database Connection Refused**:
   - Verify that `DB_HOST` is set to `localhost`. On a few hosts (e.g. GoDaddy or DreamHost), the host might be an IP address or hostname shown in your cPanel MySQL section.
   - Verify that the database user was added to the database with **ALL PRIVILEGES** in the MySQL Database Wizard.

3. **Photo Upload Errors / File Size Limit**:
   - In cPanel, navigate to **Select PHP Version** -> **Options** and increase:
     - `upload_max_filesize` to `32M`
     - `post_max_size` to `32M`
     - `memory_limit` to `128M`
