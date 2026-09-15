<?php
/**
 * FieldPulse EHS Mobile Application - PHP/MySQL Backend
 * Configuration & Core Database Utilities for cPanel Shared Hosting
 */

// Enable error reporting during development (set to 0 in production if desired)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// -------------------------------------------------------------------------
// 1. DATABASE CONFIGURATION (MySQL / MariaDB or SQLite)
// -------------------------------------------------------------------------
// Driver: 'mysql' for cPanel MySQL/MariaDB, or 'sqlite' for portable zero-config SQLite
define('DB_DRIVER', getenv('DB_DRIVER') ?: 'sqlite');

// SQLite Settings (Used when DB_DRIVER is 'sqlite')
define('DB_SQLITE_PATH', getenv('DB_SQLITE_PATH') ?: __DIR__ . '/fieldpulse.sqlite');

// MySQL / MariaDB Settings (Used when DB_DRIVER is 'mysql')
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'fieldpulse_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_PORT', getenv('DB_PORT') ?: 3306);
define('DB_CHARSET', 'utf8mb4');

// -------------------------------------------------------------------------
// 2. JWT & AUTHENTICATION CONFIGURATION
// -------------------------------------------------------------------------
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'spectrum-fieldpulse-production-secret-key-2026');
define('JWT_EXPIRY_SECONDS', (int)(getenv('JWT_EXPIRY_SECONDS') ?: 604800)); // 7 days

// -------------------------------------------------------------------------
// 2B. CORS HEADERS (Required for Mobile PWA, Capacitor, and Cross-Origin Web)
// -------------------------------------------------------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
header("Access-Control-Max-Age: 86400");

// Immediately respond to preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// -------------------------------------------------------------------------
// 3. PDO DATABASE CONNECTION (Supports MySQL/MariaDB and SQLite)
// -------------------------------------------------------------------------
function get_db_connection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $driver = strtolower(trim(DB_DRIVER));

    if ($driver === 'sqlite') {
        $dbPath = DB_SQLITE_PATH;
        $isNewDb = !file_exists($dbPath) || filesize($dbPath) === 0;

        try {
            $pdo = new PDO("sqlite:" . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec("PRAGMA foreign_keys = ON;");
            $pdo->exec("PRAGMA journal_mode = WAL;");

            // Auto-initialize tables and seed data if new SQLite database
            if ($isNewDb) {
                $schemaFile = __DIR__ . '/schema.sqlite.sql';
                if (file_exists($schemaFile)) {
                    $sql = file_get_contents($schemaFile);
                    $pdo->exec($sql);
                }
            }
            return $pdo;
        } catch (PDOException $e) {
            error_log("SQLite connection failure: " . $e->getMessage());
            json_response([
                'success' => false,
                'error'   => 'SQLite database connection error: ' . $e->getMessage(),
            ], 500);
        }
    }

    // Default to MySQL / MariaDB
    $dsn = sprintf(
        "mysql:host=%s;port=%s;dbname=%s;charset=%s",
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_CHARSET
    );

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci",
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        return $pdo;
    } catch (PDOException $e) {
        error_log("MySQL connection failure: " . $e->getMessage());
        json_response([
            'success' => false,
            'error'   => 'MySQL database connection error. Please verify your cPanel MySQL credentials in config.php or switch DB_DRIVER to sqlite.',
            'details' => (ini_get('display_errors') === '1') ? $e->getMessage() : null
        ], 500);
    }
}

// -------------------------------------------------------------------------
// 4. HELPER UTILITIES
// -------------------------------------------------------------------------

/**
 * Send JSON response and terminate script
 */
function json_response($data, $status_code = 200) {
    http_response_code($status_code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Retrieve JSON payload from php://input
 */
function get_json_input() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/**
 * Evaluate whether an official clock-in time is LATE according to shift time & grace period
 */
function evaluate_late_status($recorded_iso, $expected_time_str = '08:00', $grace_minutes = 5) {
    try {
        $recorded_dt = new DateTime($recorded_iso);
        list($exp_h, $exp_m) = explode(':', $expected_time_str);

        $expected_dt = clone $recorded_dt;
        $expected_dt->setTime((int)$exp_h, (int)$exp_m, 0);

        $diff_seconds = $recorded_dt->getTimestamp() - $expected_dt->getTimestamp();
        $diff_minutes = (int)floor($diff_seconds / 60);

        if ($diff_minutes > (int)$grace_minutes) {
            return ['is_late' => true, 'late_minutes' => $diff_minutes];
        }
        return ['is_late' => false, 'late_minutes' => 0];
    } catch (Exception $e) {
        return ['is_late' => false, 'late_minutes' => 0];
    }
}

/**
 * Log immutable audit entries
 */
function log_audit_entry($pdo, $actor_id, $actor_name, $action, $entity_type, $entity_id, $details = [], $ip = null) {
    try {
        $id = 'log-' . round(microtime(true) * 1000) . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
        $client_ip = $ip ?: ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
        $details_json = json_encode($details);

        $stmt = $pdo->prepare("
            INSERT INTO audit_logs (id, actor_user_id, actor_name, action, entity_type, entity_id, details_json, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$id, $actor_id, $actor_name, $action, $entity_type, $entity_id, $details_json, $client_ip]);
    } catch (Exception $e) {
        error_log("Audit log failed: " . $e->getMessage());
    }
}

/**
 * Base64URL encoding (RFC 7515 / JWT standard)
 */
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Base64URL decoding
 */
function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

/**
 * Generate a cryptographically signed HMAC-SHA256 JWT
 */
function generate_jwt($payload, $secret = JWT_SECRET, $expiry_seconds = JWT_EXPIRY_SECONDS) {
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $now = time();
    $payload['iat'] = $now;
    $payload['exp'] = $now + $expiry_seconds;

    $base64Header = base64url_encode($header);
    $base64Payload = base64url_encode(json_encode($payload));

    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
    $base64Signature = base64url_encode($signature);

    return "$base64Header.$base64Payload.$base64Signature";
}

/**
 * Verify and decode an HMAC-SHA256 JWT
 * Returns decoded payload array or null if invalid/expired
 */
function verify_jwt($jwt, $secret = JWT_SECRET) {
    if (empty($jwt) || !is_string($jwt)) return null;

    $parts = explode('.', $jwt);
    if (count($parts) !== 3) return null;

    list($base64Header, $base64Payload, $base64Signature) = $parts;

    $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
    $expectedSignature = base64url_encode($signature);

    if (!hash_equals($expectedSignature, $base64Signature)) {
        return null;
    }

    $payload = json_decode(base64url_decode($base64Payload), true);
    if (!is_array($payload)) return null;

    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null; // Expired token
    }

    return $payload;
}

/**
 * Extract Authorization Bearer token from incoming request
 */
function get_bearer_token() {
    $headers = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers = trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        $requestHeaders = array_change_key_case($requestHeaders, CASE_LOWER);
        if (isset($requestHeaders['authorization'])) {
            $headers = trim($requestHeaders['authorization']);
        }
    }

    if (!empty($headers)) {
        if (preg_match('/Bearer\s(\S+)/i', $headers, $matches)) {
            return $matches[1];
        }
    }

    // Fallback to query parameter ?token= for media/download endpoints
    if (!empty($_GET['token'])) {
        return trim($_GET['token']);
    }

    return null;
}

/**
 * Verify user password/PIN against bcrypt hash
 */
function verify_credentials($plain, $hash) {
    if (empty($plain) || empty($hash)) return false;
    return password_verify($plain, $hash);
}

/**
 * Hash password/PIN using standard bcrypt algorithm
 */
function hash_credentials($plain) {
    return password_hash($plain, PASSWORD_BCRYPT, ['cost' => 10]);
}

/**
 * Store active user session in database
 */
function create_user_session($pdo, $user_id, $token, $ip = null, $user_agent = null, $expiry_seconds = JWT_EXPIRY_SECONDS) {
    try {
        $sessionId = 'sess-' . round(microtime(true) * 1000) . '-' . substr(bin2hex(random_bytes(4)), 0, 6);
        $tokenHash = hash('sha256', $token);
        $expiresAt = date('Y-m-d H:i:s', time() + $expiry_seconds);
        $clientIp = $ip ?: ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
        $ua = $user_agent ?: ($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown');

        $stmt = $pdo->prepare("
            INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$sessionId, $user_id, $tokenHash, $clientIp, $ua, $expiresAt]);
        return $sessionId;
    } catch (Exception $e) {
        error_log("Session creation warning: " . $e->getMessage());
        return null;
    }
}

/**
 * Revoke user session from database
 */
function destroy_user_session($pdo, $token) {
    try {
        $tokenHash = hash('sha256', $token);
        $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE token_hash = ?");
        $stmt->execute([$tokenHash]);
    } catch (Exception $e) {
        error_log("Session destroy error: " . $e->getMessage());
    }
}

/**
 * Require valid JWT Bearer token and optional role check
 * Returns the authenticated user array, or sends 401/403 and halts
 */
function require_auth($pdo, $required_role = null) {
    $token = get_bearer_token();
    if (!$token) {
        json_response([
            'success' => false,
            'error'   => 'Authentication required: missing Bearer token in Authorization header.',
        ], 401);
    }

    $payload = verify_jwt($token);
    if (!$payload || empty($payload['sub'])) {
        json_response([
            'success' => false,
            'error'   => 'Invalid or expired authentication token. Please sign in again.',
        ], 401);
    }

    // Verify user exists and is active in database
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$payload['sub']]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response([
            'success' => false,
            'error'   => 'Authenticated user account is inactive or no longer exists.',
        ], 401);
    }

    // Role check if specified
    if ($required_role) {
        $allowedRoles = is_array($required_role) ? $required_role : [$required_role];
        if (!in_array($user['role'], $allowedRoles, true)) {
            json_response([
                'success' => false,
                'error'   => 'Forbidden: You do not have permission to access this resource.',
            ], 403);
        }
    }

    return [
        'user'    => $user,
        'payload' => $payload,
        'token'   => $token,
    ];
}

/**
 * Format daily_report database row to match TypeScript DailyReport interface
 */
function format_report_row($row) {
    if (!$row) return null;

    $photos = [];
    if (!empty($row['photos_json'])) {
        $decoded = json_decode($row['photos_json'], true);
        if (is_array($decoded)) $photos = $decoded;
    }

    $ehs_answers = [];
    if (!empty($row['ehs_answers_json'])) {
        $decoded = json_decode($row['ehs_answers_json'], true);
        if (is_array($decoded)) $ehs_answers = $decoded;
    }

    return [
        'id'                      => (string)$row['id'],
        'clientReportId'          => (string)$row['client_report_id'],
        'technicianId'            => (string)$row['technician_id'],
        'technicianName'          => (string)$row['technician_name'],
        'employeeId'              => (string)$row['employee_id'],
        'workDate'                => (string)$row['work_date'],
        'status'                  => (string)$row['status'],
        'submissionType'          => (string)$row['submission_type'],
        'officialClockInTime'     => (string)$row['official_clock_in_time'],
        'serverReceivedAt'        => (string)$row['server_received_at'],
        'serverSyncedAt'          => (string)$row['server_synced_at'],
        'expectedStartTime'       => (string)$row['expected_start_time'],
        'lateStatus'              => (string)$row['late_status'],
        'lateDurationMinutes'     => (int)$row['late_duration_minutes'],
        'latitude'                => (float)$row['latitude'],
        'longitude'               => (float)$row['longitude'],
        'locationAccuracyMeters'  => (float)$row['location_accuracy_meters'],
        'rawGpsTimestamp'         => $row['raw_gps_timestamp'] ?: null,
        'deviceMonotonicUptimeMs' => $row['device_monotonic_uptime_ms'] ? (int)$row['device_monotonic_uptime_ms'] : null,
        'isTimeTampered'          => (bool)$row['is_time_tampered'],
        'tamperReason'            => $row['tamper_reason'] ?: null,
        'photos'                  => $photos,
        'ehsAnswers'              => $ehs_answers,
        'generalComments'         => $row['general_comments'] ?: null,
        'identifiedHazards'       => $row['identified_hazards'] ?: null,
        'isOverridden'            => (bool)$row['is_overridden'],
        'overrideReason'          => $row['override_reason'] ?: null,
        'overriddenBy'            => $row['overridden_by'] ?: null,
        'overriddenAt'            => $row['overridden_at'] ?: null,
        'createdAt'               => $row['created_at'],
        'updatedAt'               => $row['updated_at'],
    ];
}
