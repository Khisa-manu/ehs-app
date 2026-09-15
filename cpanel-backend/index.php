<?php
/**
 * FieldPulse EHS Mobile Application - REST API Front Controller (PHP/MySQL)
 * Full drop-in replacement for Node.js/Express on cPanel Shared Hosting
 */

require_once __DIR__ . '/config.php';

$pdo = get_db_connection();

// Determine HTTP Method and Clean Request Path
$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$parsed_url = parse_url($request_uri, PHP_URL_PATH);

// Normalize path: strip script name if accessed directly, and remove leading/trailing slashes
$script_dir = dirname($_SERVER['SCRIPT_NAME']);
if ($script_dir !== '/' && strpos($parsed_url, $script_dir) === 0) {
    $path = substr($parsed_url, strlen($script_dir));
} else {
    $path = $parsed_url;
}
$path = '/' . trim($path, '/');

// Support both "/api/v1/..." and "/v1/..."
if (strpos($path, '/api/') === 0) {
    $route = substr($path, 4); // remove /api
} else {
    $route = $path;
}
$route = '/' . trim($route, '/');

// Helper to match dynamic regex routes like /v1/technicians/{id}
function match_route($pattern, $route, &$matches = []) {
    // Convert /v1/technicians/{id} to regex
    $regex = preg_replace('#\{([a-zA-Z0-9_]+)\}#', '(?P<$1>[^/]+)', $pattern);
    $regex = '#^' . $regex . '$#';
    return preg_match($regex, $route, $matches);
}

// =========================================================================
// ROUTING TABLE
// =========================================================================

// -------------------------------------------------------------------------
// 1. HEALTH CHECK
// -------------------------------------------------------------------------
if ($method === 'GET' && ($route === '/v1/health' || $route === '/health' || $route === '/')) {
    try {
        $stmt = $pdo->query("SELECT 1");
        json_response([
            'status'    => 'ok',
            'database'  => 'connected',
            'engine'    => 'MySQL (cPanel Shared Hosting)',
            'timestamp' => gmdate('c')
        ]);
    } catch (Exception $e) {
        json_response(['status' => 'error', 'database' => 'disconnected', 'error' => $e->getMessage()], 500);
    }
}

// -------------------------------------------------------------------------
// 2. AUTH LOGIN
// -------------------------------------------------------------------------
if ($method === 'POST' && $route === '/v1/auth/login') {
    $input = get_json_input();
    $email = trim($input['email'] ?? '');
    
    if (empty($email)) {
        json_response(['success' => false, 'error' => 'Email is required.'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        json_response(['success' => false, 'error' => 'User not found.'], 404);
    }

    json_response([
        'success' => true,
        'data'    => [
            'id'                       => (string)$user['id'],
            'email'                    => (string)$user['email'],
            'fullName'                 => (string)$user['full_name'],
            'role'                     => (string)$user['role'],
            'employeeId'               => $user['employee_id'] ?: null,
            'phoneNumber'              => $user['phone_number'] ?: null,
            'customExpectedStartTime'  => $user['custom_expected_start_time'] ?: null,
            'isActive'                 => (bool)$user['is_active'],
            'createdAt'                => $user['created_at'],
        ],
    ]);
}

// -------------------------------------------------------------------------
// 3. EHS INSPECTION QUESTIONS
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/ehs/questions') {
    $stmt = $pdo->query("SELECT * FROM ehs_questions WHERE is_active = 1 ORDER BY display_order ASC");
    $questions = $stmt->fetchAll();

    $formatted = array_map(function($q) {
        return [
            'id'            => (string)$q['id'],
            'code'          => (string)$q['code'],
            'category'      => (string)$q['category'],
            'questionText'  => (string)$q['question_text'],
            'guidanceNotes' => (string)$q['guidance_notes'],
            'isMandatory'   => (bool)$q['is_mandatory'],
            'displayOrder'  => (int)$q['display_order'],
            'isActive'      => (bool)$q['is_active'],
        ];
    }, $questions);

    json_response(['success' => true, 'data' => $formatted]);
}

// -------------------------------------------------------------------------
// 4. USERS & TECHNICIANS LIST
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/users') {
    $stmt = $pdo->query("SELECT * FROM users ORDER BY full_name ASC");
    $users = $stmt->fetchAll();

    $formatted = array_map(function($u) {
        return [
            'id'                       => (string)$u['id'],
            'email'                    => (string)$u['email'],
            'fullName'                 => (string)$u['full_name'],
            'role'                     => (string)$u['role'],
            'employeeId'               => $u['employee_id'] ?: null,
            'phoneNumber'              => $u['phone_number'] ?: null,
            'customExpectedStartTime'  => $u['custom_expected_start_time'] ?: null,
            'isActive'                 => (bool)$u['is_active'],
            'createdAt'                => $u['created_at'],
        ];
    }, $users);

    json_response(['success' => true, 'data' => $formatted]);
}

if ($method === 'GET' && $route === '/v1/technicians') {
    $stmt = $pdo->query("SELECT * FROM users WHERE role = 'TECHNICIAN' ORDER BY full_name ASC");
    $techs = $stmt->fetchAll();

    $formatted = array_map(function($u) {
        return [
            'id'                       => (string)$u['id'],
            'email'                    => (string)$u['email'],
            'fullName'                 => (string)$u['full_name'],
            'role'                     => (string)$u['role'],
            'employeeId'               => $u['employee_id'] ?: null,
            'phoneNumber'              => $u['phone_number'] ?: null,
            'customExpectedStartTime'  => $u['custom_expected_start_time'] ?: null,
            'isActive'                 => (bool)$u['is_active'],
            'createdAt'                => $u['created_at'],
        ];
    }, $techs);

    json_response(['success' => true, 'data' => $formatted]);
}

if ($method === 'POST' && $route === '/v1/technicians') {
    $input = get_json_input();
    $full_name = trim($input['fullName'] ?? '');
    $email = trim($input['email'] ?? '');
    $employee_id = trim($input['employeeId'] ?? '');
    $phone_number = trim($input['phoneNumber'] ?? '') ?: null;
    $custom_expected_start_time = trim($input['customExpectedStartTime'] ?? '') ?: null;

    if (empty($full_name) || empty($email) || empty($employee_id)) {
        json_response(['success' => false, 'error' => 'Full name, email, and employee ID are required.'], 400);
    }

    // Check duplicate
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR employee_id = ?");
    $stmt->execute([$email, $employee_id]);
    if ($stmt->fetch()) {
        json_response(['success' => false, 'error' => 'A user with this email or employee ID already exists.'], 409);
    }

    $id = 'usr-tech-' . substr(bin2hex(random_bytes(4)), 0, 8);
    $stmt = $pdo->prepare("
        INSERT INTO users (id, uid, email, full_name, role, employee_id, phone_number, custom_expected_start_time, is_active, created_at)
        VALUES (?, ?, ?, ?, 'TECHNICIAN', ?, ?, ?, 1, NOW())
    ");
    $stmt->execute([$id, $id, $email, $full_name, $employee_id, $phone_number, $custom_expected_start_time]);

    log_audit_entry($pdo, 'usr-admin-01', 'Admin', 'CREATE_TECHNICIAN', 'USER', $id, [
        'full_name' => $full_name,
        'employee_id' => $employee_id,
        'email' => $email
    ]);

    json_response([
        'success' => true,
        'data'    => [
            'id'                       => $id,
            'fullName'                 => $full_name,
            'email'                    => $email,
            'employeeId'               => $employee_id,
            'phoneNumber'              => $phone_number,
            'customExpectedStartTime'  => $custom_expected_start_time,
            'role'                     => 'TECHNICIAN',
            'isActive'                 => true,
            'createdAt'                => date('c'),
        ]
    ], 201);
}

if ($method === 'PATCH' && match_route('/v1/technicians/{id}', $route, $matches)) {
    $id = $matches['id'];
    $input = get_json_input();

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) json_response(['success' => false, 'error' => 'User not found'], 404);

    $fields = [];
    $values = [];

    if (isset($input['fullName'])) {
        $fields[] = "full_name = ?";
        $values[] = trim($input['fullName']);
    }
    if (isset($input['email'])) {
        $fields[] = "email = ?";
        $values[] = trim($input['email']);
    }
    if (isset($input['employeeId'])) {
        $fields[] = "employee_id = ?";
        $values[] = trim($input['employeeId']);
    }
    if (isset($input['phoneNumber'])) {
        $fields[] = "phone_number = ?";
        $values[] = trim($input['phoneNumber']);
    }
    if (isset($input['customExpectedStartTime'])) {
        $fields[] = "custom_expected_start_time = ?";
        $values[] = trim($input['customExpectedStartTime']) ?: null;
    }
    if (isset($input['isActive'])) {
        $fields[] = "is_active = ?";
        $values[] = $input['isActive'] ? 1 : 0;
    }

    if (!empty($fields)) {
        $values[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
    }

    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $updated = $stmt->fetch();

    json_response([
        'success' => true,
        'data'    => [
            'id'                       => (string)$updated['id'],
            'fullName'                 => (string)$updated['full_name'],
            'email'                    => (string)$updated['email'],
            'employeeId'               => $updated['employee_id'] ?: null,
            'phoneNumber'              => $updated['phone_number'] ?: null,
            'customExpectedStartTime'  => $updated['custom_expected_start_time'] ?: null,
            'role'                     => (string)$updated['role'],
            'isActive'                 => (bool)$updated['is_active'],
            'createdAt'                => $updated['created_at'],
        ]
    ]);
}

if ($method === 'DELETE' && match_route('/v1/technicians/{id}', $route, $matches)) {
    $id = $matches['id'];
    $stmt = $pdo->prepare("UPDATE users SET is_active = 0 WHERE id = ?");
    $stmt->execute([$id]);
    json_response(['success' => true, 'message' => 'Technician deactivated']);
}

// -------------------------------------------------------------------------
// 5. PHOTO UPLOAD & PRESIGN (Saves directly to cPanel /uploads/ directory)
// -------------------------------------------------------------------------
if ($method === 'POST' && $route === '/v1/photos/presign-upload') {
    $input = get_json_input();
    $photoType = strtolower($input['photoType'] ?? 'photo');
    $clientPhotoId = $input['clientPhotoId'] ?? round(microtime(true) * 1000);
    $today = date('Y-m-d');

    $storageKey = "uploads/{$today}/{$photoType}_{$clientPhotoId}.jpg";
    json_response([
        'success' => true,
        'data'    => [
            'storageKey' => $storageKey,
            'uploadUrl'  => "/api/v1/photos/upload-direct?key=" . urlencode($storageKey),
            'expiresAt'  => gmdate('c', time() + 900),
        ]
    ]);
}

if ($method === 'POST' && $route === '/v1/photos/upload-direct') {
    $input = get_json_input();
    $dataUrl = $input['dataUrl'] ?? '';
    $photoType = $input['photoType'] ?? 'PPE_SELFIE';
    $clientPhotoId = $input['clientPhotoId'] ?? ('p-' . round(microtime(true) * 1000));
    $capturedAt = $input['capturedAt'] ?? gmdate('c');
    $latitude = (float)($input['latitude'] ?? 37.7749);
    $longitude = (float)($input['longitude'] ?? -122.4194);

    $savedUrl = $dataUrl;
    $storageKey = "uploads/" . date('Y-m-d') . "/{$photoType}_{$clientPhotoId}.jpg";

    // If base64 image data URL provided, save it physically to disk on the cPanel server!
    if (strpos($dataUrl, 'data:image') === 0) {
        $uploadDir = __DIR__ . '/uploads/' . date('Y-m-d');
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0755, true);
        }
        $parts = explode(',', $dataUrl);
        if (count($parts) === 2) {
            $binary = base64_decode($parts[1]);
            $filePath = __DIR__ . '/' . $storageKey;
            if (@file_put_contents($filePath, $binary)) {
                $savedUrl = '/' . $storageKey;
            }
        }
    }

    $photoObject = [
        'id'             => 'photo-' . round(microtime(true) * 1000) . '-' . substr(bin2hex(random_bytes(3)), 0, 5),
        'clientPhotoId'  => $clientPhotoId,
        'photoType'      => $photoType,
        'storageKey'     => $storageKey,
        'dataUrl'        => $savedUrl,
        'fileSizeBytes'  => strlen($dataUrl) ? (int)round((strlen($dataUrl) * 3) / 4) : 450000,
        'mimeType'       => 'image/jpeg',
        'checksumSha256' => hash('sha256', $dataUrl ?: (string)microtime(true)),
        'capturedAt'     => $capturedAt,
        'latitude'       => $latitude,
        'longitude'      => $longitude,
        'isVerified'     => true,
    ];

    json_response(['success' => true, 'data' => $photoObject]);
}

// -------------------------------------------------------------------------
// 6. CORE IDEMPOTENT OFFLINE / ONLINE SYNC BATCH HANDLER (MySQL)
// -------------------------------------------------------------------------
if ($method === 'POST' && $route === '/v1/sync/batch') {
    $input = get_json_input();

    $clientReportId = $input['clientReportId'] ?? null;
    $technicianId = $input['technicianId'] ?? null;
    $workDate = $input['workDate'] ?? null;
    $clockIn = $input['clockIn'] ?? null;
    $photos = $input['photos'] ?? [];
    $ehsAnswers = $input['ehsAnswers'] ?? [];
    $generalComments = $input['generalComments'] ?? null;
    $identifiedHazards = $input['identifiedHazards'] ?? null;

    if (!$clientReportId || !$technicianId || !$clockIn || empty($clockIn['recordedAt'])) {
        json_response([
            'success' => false,
            'error'   => 'Missing required parameters: clientReportId, technicianId, clockIn.recordedAt'
        ], 400);
    }

    // 1. Idempotency Check: Did this client report already sync to MySQL?
    $stmt = $pdo->prepare("SELECT * FROM daily_reports WHERE client_report_id = ? LIMIT 1");
    $stmt->execute([$clientReportId]);
    $existing = $stmt->fetch();
    if ($existing) {
        json_response([
            'success' => true,
            'data'    => format_report_row($existing),
            'meta'    => ['message' => 'Idempotent replay: Report was already synchronized in MySQL.']
        ]);
    }

    // 2. Fetch Technician and System Settings
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ? LIMIT 1");
    $stmt->execute([$technicianId]);
    $tech = $stmt->fetch();

    $stmt = $pdo->query("SELECT * FROM system_settings WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch() ?: [
        'default_expected_start_time' => '08:00',
        'grace_period_minutes'        => 5
    ];

    $techName = $tech ? $tech['full_name'] : 'Field Technician';
    $employeeId = $tech['employee_id'] ?? 'EMP-UNKNOWN';
    $expectedStartTime = ($tech && !empty($tech['custom_expected_start_time']))
        ? $tech['custom_expected_start_time']
        : ($settings['default_expected_start_time'] ?? '08:00');
    $graceMinutes = (int)($settings['grace_period_minutes'] ?? 5);

    // 3. Late Status Calculation
    $lateCalc = evaluate_late_status($clockIn['recordedAt'], $expectedStartTime, $graceMinutes);
    $lateStatus = $lateCalc['is_late'] ? 'LATE' : 'ON_TIME';
    $lateMinutes = $lateCalc['late_minutes'];

    // 4. Submission Timestamps & Offline Evaluation
    $serverReceivedAt = gmdate('Y-m-d\TH:i:s.000\Z');
    $serverSyncedAt = $serverReceivedAt;

    $recordedTime = strtotime($clockIn['recordedAt']);
    $receivedTime = time();
    $delaySeconds = max(0, $receivedTime - ($recordedTime ?: $receivedTime));

    $isOfflineSync = $delaySeconds > 180 || (!empty($input['isOfflineExplicit']));
    $submissionType = $isOfflineSync ? 'OFFLINE_SYNC' : 'ONLINE';

    // 5. GPS Time Tamper Check
    $isTimeTampered = 0;
    $tamperReason = null;
    if (!empty($clockIn['rawGpsTimestamp'])) {
        $gpsTime = strtotime($clockIn['rawGpsTimestamp']);
        if ($gpsTime && $recordedTime) {
            $driftMins = abs(($gpsTime - $recordedTime) / 60);
            if ($driftMins > 10) {
                $isTimeTampered = 1;
                $tamperReason = "Significant GPS satellite clock discrepancy (" . round($driftMins) . "m drift).";
            }
        }
    }

    $effectiveWorkDate = $workDate ?: substr($clockIn['recordedAt'], 0, 10);
    $reportId = 'rep-' . round(microtime(true) * 1000) . '-' . substr(bin2hex(random_bytes(3)), 0, 6);

    // 6. Insert Report into MySQL
    $stmt = $pdo->prepare("
        INSERT INTO daily_reports (
            id, client_report_id, technician_id, technician_name, employee_id, work_date,
            status, submission_type, official_clock_in_time, server_received_at, server_synced_at,
            expected_start_time, late_status, late_duration_minutes, latitude, longitude,
            location_accuracy_meters, raw_gps_timestamp, device_monotonic_uptime_ms,
            is_time_tampered, tamper_reason, photos_json, ehs_answers_json, general_comments,
            identified_hazards, is_overridden, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            'SYNCED', ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, 0, NOW(), NOW()
        )
    ");

    $stmt->execute([
        $reportId,
        $clientReportId,
        $technicianId,
        $techName,
        $employeeId,
        $effectiveWorkDate,
        $submissionType,
        $clockIn['recordedAt'],
        $serverReceivedAt,
        $serverSyncedAt,
        $expectedStartTime,
        $lateStatus,
        $lateMinutes,
        (float)($clockIn['latitude'] ?? 0),
        (float)($clockIn['longitude'] ?? 0),
        (float)($clockIn['accuracyMeters'] ?? 0),
        $clockIn['rawGpsTimestamp'] ?? null,
        $clockIn['deviceMonotonicUptimeMs'] ?? null,
        $isTimeTampered,
        $tamperReason,
        json_encode(is_array($photos) ? $photos : []),
        json_encode(is_array($ehsAnswers) ? $ehsAnswers : []),
        $generalComments,
        $identifiedHazards,
    ]);

    // 7. Insert Audit Trail
    log_audit_entry(
        $pdo,
        $technicianId,
        $techName,
        $isOfflineSync ? 'OFFLINE_REPORT_SYNCED' : 'ONLINE_CLOCK_IN_SUBMITTED',
        'DAILY_REPORT',
        $reportId,
        [
            'clientReportId'   => $clientReportId,
            'officialClockIn'  => $clockIn['recordedAt'],
            'serverSynced'     => $serverSyncedAt,
            'submissionType'   => $submissionType,
            'lateStatus'       => $lateStatus,
            'delaySeconds'     => $delaySeconds,
            'isTimeTampered'   => (bool)$isTimeTampered,
        ]
    );

    // Fetch and return created report
    $stmt = $pdo->prepare("SELECT * FROM daily_reports WHERE id = ? LIMIT 1");
    $stmt->execute([$reportId]);
    $created = $stmt->fetch();

    json_response(['success' => true, 'data' => format_report_row($created)], 201);
}

// -------------------------------------------------------------------------
// 7. TECHNICIAN TODAY'S REPORT STATUS
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/reports/today') {
    $technicianId = $_GET['technicianId'] ?? '';
    $today = date('Y-m-d');

    $stmt = $pdo->prepare("SELECT * FROM daily_reports WHERE technician_id = ? AND work_date = ? LIMIT 1");
    $stmt->execute([$technicianId, $today]);
    $report = $stmt->fetch();

    $stmt = $pdo->query("SELECT default_expected_start_time FROM system_settings WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch();

    json_response([
        'success' => true,
        'data'    => $report ? format_report_row($report) : null,
        'meta'    => [
            'today' => $today,
            'defaultExpectedStartTime' => $settings['default_expected_start_time'] ?? '08:00'
        ]
    ]);
}

// -------------------------------------------------------------------------
// 8. ADMIN DASHBOARD SUMMARY
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/admin/dashboard/summary') {
    $today = date('Y-m-d');

    // Total Active Technicians
    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM users WHERE role = 'TECHNICIAN' AND is_active = 1");
    $totalTechnicians = (int)($stmt->fetch()['cnt'] ?? 0);

    // Today's Clocked In
    $stmt = $pdo->prepare("SELECT * FROM daily_reports WHERE work_date = ?");
    $stmt->execute([$today]);
    $todayReports = $stmt->fetchAll();

    $clockedIn = count($todayReports);
    $notClockedIn = max(0, $totalTechnicians - $clockedIn);

    $onTime = 0;
    $late = 0;
    $offlineSynced = 0;
    $pendingSync = 0;
    $syncFailures = 0;

    foreach ($todayReports as $r) {
        if ($r['late_status'] === 'ON_TIME' || $r['late_status'] === 'EXCUSED') $onTime++;
        if ($r['late_status'] === 'LATE') $late++;
        if ($r['submission_type'] === 'OFFLINE_SYNC') $offlineSynced++;
        if ($r['status'] === 'PENDING_SYNC') $pendingSync++;
        if ($r['status'] === 'SYNC_FAILED') $syncFailures++;
    }

    $stmt = $pdo->query("SELECT default_expected_start_time FROM system_settings WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch();

    json_response([
        'success' => true,
        'data'    => [
            'totalTechnicians'         => $totalTechnicians,
            'clockedIn'                => $clockedIn,
            'notClockedIn'             => $notClockedIn,
            'onTime'                   => $onTime,
            'late'                     => $late,
            'offlineSynced'            => $offlineSynced,
            'pendingSync'              => $pendingSync,
            'syncFailures'             => $syncFailures,
            'todayDate'                => $today,
            'defaultExpectedStartTime' => $settings['default_expected_start_time'] ?? '08:00',
        ]
    ]);
}

// -------------------------------------------------------------------------
// 9. ADMIN REPORTS LIST & SEARCH
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/admin/reports') {
    $dateFilter = $_GET['dateFilter'] ?? 'all';
    $technicianId = $_GET['technicianId'] ?? 'ALL';
    $status = $_GET['status'] ?? 'ALL';
    $submissionType = $_GET['submissionType'] ?? 'ALL';
    $search = trim($_GET['search'] ?? '');

    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));

    $where = [];
    $params = [];

    if ($dateFilter === 'today') {
        $where[] = "(work_date = ? OR DATE(created_at) = ?)";
        $params[] = $today;
        $params[] = $today;
    } elseif ($dateFilter === 'yesterday') {
        $where[] = "(work_date = ? OR DATE(created_at) = ?)";
        $params[] = $yesterday;
        $params[] = $yesterday;
    } elseif (strpos($dateFilter, ',') !== false) {
        list($start, $end) = explode(',', $dateFilter);
        $where[] = "work_date BETWEEN ? AND ?";
        $params[] = trim($start);
        $params[] = trim($end);
    }

    if (!empty($technicianId) && $technicianId !== 'ALL') {
        $where[] = "technician_id = ?";
        $params[] = $technicianId;
    }

    if (!empty($status) && $status !== 'ALL') {
        if ($status === 'ON_TIME' || $status === 'LATE' || $status === 'EXCUSED') {
            $where[] = "late_status = ?";
            $params[] = $status;
        } else {
            $where[] = "status = ?";
            $params[] = $status;
        }
    }

    if (!empty($submissionType) && $submissionType !== 'ALL') {
        $where[] = "submission_type = ?";
        $params[] = $submissionType;
    }

    if (!empty($search)) {
        $where[] = "(LOWER(technician_name) LIKE ? OR LOWER(employee_id) LIKE ?)";
        $params[] = '%' . strtolower($search) . '%';
        $params[] = '%' . strtolower($search) . '%';
    }

    $sql = "SELECT * FROM daily_reports";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    $sql .= " ORDER BY official_clock_in_time DESC LIMIT 500";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $reports = $stmt->fetchAll();

    $formatted = array_map('format_report_row', $reports);
    json_response(['success' => true, 'data' => $formatted, 'total' => count($formatted)]);
}

// -------------------------------------------------------------------------
// 10. ADMIN SINGLE REPORT DETAILS & OVERRIDE
// -------------------------------------------------------------------------
if ($method === 'GET' && match_route('/v1/admin/reports/{id}', $route, $matches)) {
    $id = $matches['id'];
    $stmt = $pdo->prepare("SELECT * FROM daily_reports WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $report = $stmt->fetch();

    if (!$report) json_response(['success' => false, 'error' => 'Report not found'], 404);
    json_response(['success' => true, 'data' => format_report_row($report)]);
}

if ($method === 'POST' && match_route('/v1/admin/reports/{id}/override', $route, $matches)) {
    $id = $matches['id'];
    $input = get_json_input();
    $newStatus = $input['newLateStatus'] ?? 'EXCUSED';
    $overrideReason = trim($input['overrideReason'] ?? '');
    $actorName = $input['actorName'] ?? 'Rachel Hayes (Admin)';

    if (empty($overrideReason)) {
        json_response(['success' => false, 'error' => 'Override reason is required.'], 400);
    }

    $overriddenAt = gmdate('Y-m-d\TH:i:s.000\Z');

    $stmt = $pdo->prepare("
        UPDATE daily_reports 
        SET late_status = ?, is_overridden = 1, override_reason = ?, overridden_by = ?, overridden_at = ?
        WHERE id = ?
    ");
    $stmt->execute([$newStatus, $overrideReason, $actorName, $overriddenAt, $id]);

    // Fetch updated report
    $stmt = $pdo->prepare("SELECT * FROM daily_reports WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $updated = $stmt->fetch();

    if (!$updated) json_response(['success' => false, 'error' => 'Report not found'], 404);

    log_audit_entry($pdo, 'usr-admin-01', $actorName, 'ADMIN_REPORT_OVERRIDE', 'DAILY_REPORT', $id, [
        'technician' => $updated['technician_name'],
        'employeeId' => $updated['employee_id'],
        'newStatus'  => $newStatus,
        'reason'     => $overrideReason,
    ]);

    json_response(['success' => true, 'data' => format_report_row($updated)]);
}

// -------------------------------------------------------------------------
// 11. DATA EXPORT (CSV)
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/admin/reports/export') {
    $stmt = $pdo->query("SELECT * FROM daily_reports ORDER BY official_clock_in_time DESC");
    $reports = $stmt->fetchAll();

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=fieldpulse_reports_' . date('Y-m-d') . '.csv');

    $output = fopen('php://output', 'w');
    fputcsv($output, [
        'Report ID',
        'Technician Name',
        'Employee ID',
        'Work Date',
        'Official Clock-In Time',
        'Server Sync Time',
        'Submission Type',
        'Expected Time',
        'Late Status',
        'Late Minutes',
        'GPS Latitude',
        'GPS Longitude',
        'Time Tampered Flag',
        'Photos Count',
        'Comments',
        'Identified Hazards',
    ]);

    foreach ($reports as $r) {
        $photos = json_decode($r['photos_json'] ?? '[]', true) ?: [];
        fputcsv($output, [
            $r['id'],
            $r['technician_name'],
            $r['employee_id'],
            $r['work_date'],
            $r['official_clock_in_time'],
            $r['server_synced_at'],
            $r['submission_type'],
            $r['expected_start_time'],
            $r['late_status'],
            $r['late_duration_minutes'],
            $r['latitude'],
            $r['longitude'],
            $r['is_time_tampered'] ? 'YES' : 'NO',
            count($photos),
            $r['general_comments'],
            $r['identified_hazards'],
        ]);
    }
    fclose($output);
    exit;
}

// -------------------------------------------------------------------------
// 12. SYSTEM SETTINGS
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/admin/settings') {
    $stmt = $pdo->query("SELECT * FROM system_settings WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch();

    json_response([
        'success' => true,
        'data'    => [
            'defaultExpectedStartTime' => $settings['default_expected_start_time'] ?? '08:00',
            'gracePeriodMinutes'       => (int)($settings['grace_period_minutes'] ?? 5),
            'maxOfflineRetentionDays'  => (int)($settings['max_offline_retention_days'] ?? 14),
            'enforceGeofence'          => (bool)($settings['enforce_geofence'] ?? false),
            'updatedAt'                => $settings['updated_at'] ?? date('c'),
        ]
    ]);
}

if ($method === 'PUT' && $route === '/v1/admin/settings') {
    $input = get_json_input();

    $fields = [];
    $params = [];

    if (isset($input['defaultExpectedStartTime'])) {
        $fields[] = "default_expected_start_time = ?";
        $params[] = trim($input['defaultExpectedStartTime']);
    }
    if (isset($input['gracePeriodMinutes'])) {
        $fields[] = "grace_period_minutes = ?";
        $params[] = (int)$input['gracePeriodMinutes'];
    }
    if (isset($input['maxOfflineRetentionDays'])) {
        $fields[] = "max_offline_retention_days = ?";
        $params[] = (int)$input['maxOfflineRetentionDays'];
    }
    if (isset($input['enforceGeofence'])) {
        $fields[] = "enforce_geofence = ?";
        $params[] = $input['enforceGeofence'] ? 1 : 0;
    }

    if (!empty($fields)) {
        $sql = "UPDATE system_settings SET " . implode(', ', $fields) . " WHERE id = 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    $stmt = $pdo->query("SELECT * FROM system_settings WHERE id = 1 LIMIT 1");
    $updated = $stmt->fetch();

    log_audit_entry($pdo, 'usr-admin-01', 'Rachel Hayes', 'SYSTEM_SETTINGS_UPDATED', 'SETTINGS', '1', $input);

    json_response([
        'success' => true,
        'data'    => [
            'defaultExpectedStartTime' => $updated['default_expected_start_time'],
            'gracePeriodMinutes'       => (int)$updated['grace_period_minutes'],
            'maxOfflineRetentionDays'  => (int)$updated['max_offline_retention_days'],
            'enforceGeofence'          => (bool)$updated['enforce_geofence'],
            'updatedAt'                => $updated['updated_at'],
        ]
    ]);
}

// -------------------------------------------------------------------------
// 13. AUDIT LOGS
// -------------------------------------------------------------------------
if ($method === 'GET' && $route === '/v1/admin/audit-logs') {
    $stmt = $pdo->query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100");
    $logs = $stmt->fetchAll();

    $formatted = array_map(function($l) {
        $details = [];
        if (!empty($l['details_json'])) {
            $decoded = json_decode($l['details_json'], true);
            if (is_array($decoded)) $details = $decoded;
        }
        return [
            'id'          => (string)$l['id'],
            'actorUserId' => (string)$l['actor_user_id'],
            'actorName'   => (string)$l['actor_name'],
            'action'      => (string)$l['action'],
            'entityType'  => (string)$l['entity_type'],
            'entityId'    => (string)$l['entity_id'],
            'details'     => $details,
            'ipAddress'   => (string)$l['ip_address'],
            'createdAt'   => (string)$l['created_at'],
        ];
    }, $logs);

    json_response(['success' => true, 'data' => $formatted]);
}

// -------------------------------------------------------------------------
// 14. DEMO STATE RESET
// -------------------------------------------------------------------------
if ($method === 'POST' && $route === '/v1/system/reset-demo') {
    json_response([
        'success' => true,
        'message' => 'PHP/MySQL backend is active and synchronized.'
    ]);
}

// -------------------------------------------------------------------------
// 15. 404 NOT FOUND FALLBACK
// -------------------------------------------------------------------------
json_response([
    'success' => false,
    'error'   => "API endpoint not found: {$method} {$route}",
    'hint'    => 'Verify that .htaccess is enabled and mod_rewrite is active on your cPanel server.'
], 404);
