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
// 1. DATABASE CREDENTIALS (cPanel Shared Hosting)
// -------------------------------------------------------------------------
// Replace these with the credentials created in your cPanel "MySQL Database Wizard"
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'fieldpulse_db');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_PORT', getenv('DB_PORT') ?: 3306);
define('DB_CHARSET', 'utf8mb4');

// -------------------------------------------------------------------------
// 2. CORS HEADERS (Required for Mobile PWA, Capacitor, and Cross-Origin Web)
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
// 3. PDO DATABASE CONNECTION
// -------------------------------------------------------------------------
function get_db_connection() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

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
        error_log("Database connection failure: " . $e->getMessage());
        json_response([
            'success' => false,
            'error'   => 'Database connection error. Please verify your cPanel MySQL credentials in config.php.',
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$id, $actor_id, $actor_name, $action, $entity_type, $entity_id, $details_json, $client_ip]);
    } catch (Exception $e) {
        error_log("Audit log failed: " . $e->getMessage());
    }
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
