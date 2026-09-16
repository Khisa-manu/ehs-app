<?php
/**
 * Spectrum Engineering EHS - Modern Professional Admin Dashboard
 * Technologies: PHP + MySQL/PDO + Bootstrap 5 + Vanilla JavaScript + Chart.js
 * 100% Compatible with cPanel Shared Hosting (Apache, LiteSpeed, Nginx)
 * No Node.js. No TypeScript. No PostgreSQL. No Express. No Drizzle. No Tailwind CSS.
 */

require_once __DIR__ . '/config.php';

// Obtain PDO Database Connection (MySQL on cPanel / SQLite local development)
$pdo = get_db_connection();

// Ensure required tables exist (self-healing deployment)
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS ehs_incidents (
            id VARCHAR(64) PRIMARY KEY,
            technician_id VARCHAR(64) NOT NULL,
            technician_name VARCHAR(191) NOT NULL,
            title VARCHAR(255) NOT NULL,
            incident_type VARCHAR(64) NOT NULL,
            risk_level VARCHAR(32) NOT NULL,
            description TEXT NOT NULL,
            immediate_action_taken TEXT NOT NULL,
            latitude DOUBLE DEFAULT NULL,
            longitude DOUBLE DEFAULT NULL,
            photo_url TEXT DEFAULT NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
            resolution_notes TEXT DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    ");
} catch (Exception $e) {
    error_log("Schema init error: " . $e->getMessage());
}

// -------------------------------------------------------------------------
// AJAX / ACTION HANDLERS (Called by client-side JavaScript or direct download)
// -------------------------------------------------------------------------
if (empty($_GET) && !empty($_SERVER['QUERY_STRING'])) {
    parse_str($_SERVER['QUERY_STRING'], $_GET);
}
if (empty($_POST) && (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST')) {
    $rawInput = file_get_contents('php://input');
    if (empty($rawInput)) {
        $rawInput = @file_get_contents('php://stdin');
    }
    if (!empty($rawInput)) {
        $json = json_decode($rawInput, true);
        if (is_array($json)) {
            $_POST = $json;
        } else {
            parse_str($rawInput, $_POST);
        }
    }
}
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// ACTION: CSV Export for OSHA & Compliance Records
if ($action === 'export_csv') {
    $stmt = $pdo->query("SELECT * FROM daily_reports ORDER BY official_clock_in_time DESC");
    $records = $stmt->fetchAll();

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="Spectrum_EHS_Compliance_Audit_' . date('Y-m-d_His') . '.csv"');
    $output = fopen('php://output', 'w');

    fputcsv($output, [
        'Report ID', 'Work Date', 'Technician Name', 'Employee Code', 'Clock-In Time', 
        'Arrival Status', 'Late Minutes', 'Shift Type', 'Latitude', 'Longitude', 
        'Accuracy (m)', 'Submission Type', 'Time Tampered', 'Comments', 'Created At'
    ]);

    foreach ($records as $r) {
        $clockIn = [];
        try {
            $clockIn = json_decode($r['clock_in_json'] ?? '{}', true) ?: [];
        } catch (Exception $e) {}

        fputcsv($output, [
            $r['id'] ?? '',
            $r['work_date'] ?? '',
            $r['technician_name'] ?? '',
            $r['employee_id'] ?? '',
            $r['official_clock_in_time'] ?? '',
            $r['late_status'] ?? 'ON_TIME',
            $r['late_duration_minutes'] ?? 0,
            $clockIn['shiftType'] ?? 'REGULAR_MORNING',
            $r['latitude'] ?? 0,
            $r['longitude'] ?? 0,
            $r['location_accuracy_meters'] ?? 0,
            $r['submission_type'] ?? 'ONLINE',
            !empty($r['is_time_tampered']) ? 'YES' : 'NO',
            $r['general_comments'] ?? '',
            $r['created_at'] ?? ''
        ]);
    }
    fclose($output);
    exit;
}

// ACTION: Update Incident Status (AJAX)
if ($action === 'update_incident_status' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    $id = trim($_POST['incident_id'] ?? '');
    $status = trim($_POST['status'] ?? 'OPEN');
    $notes = trim($_POST['resolution_notes'] ?? '');

    if (empty($id)) {
        echo json_encode(['success' => false, 'error' => 'Incident ID is required']);
        exit;
    }

    try {
        $stmt = $pdo->prepare("UPDATE ehs_incidents SET status = ?, resolution_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([$status, $notes, $id]);
        echo json_encode(['success' => true, 'message' => 'Incident status updated successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ACTION: Report New Incident (AJAX / Form)
if ($action === 'create_incident' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    $title = trim($_POST['title'] ?? '');
    $type = trim($_POST['incident_type'] ?? 'HAZARD');
    $risk = trim($_POST['risk_level'] ?? 'MEDIUM');
    $techName = trim($_POST['technician_name'] ?? 'Supervisor / Safety Lead');
    $techId = trim($_POST['technician_id'] ?? 'usr-admin-01');
    $desc = trim($_POST['description'] ?? '');
    $actionTaken = trim($_POST['immediate_action_taken'] ?? '');
    $lat = !empty($_POST['latitude']) ? (float)$_POST['latitude'] : 29.7604;
    $lng = !empty($_POST['longitude']) ? (float)$_POST['longitude'] : -95.3698;
    $photoUrl = '';

    // Handle photo upload if provided
    if (!empty($_FILES['photo']['tmp_name'])) {
        $uploadDir = __DIR__ . '/uploads/' . date('Y-m-d') . '/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0755, true);
        }
        $ext = strtolower(pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION));
        if (in_array($ext, ['jpg', 'jpeg', 'png', 'webp'])) {
            $filename = 'INCIDENT_' . time() . '_' . rand(1000, 9999) . '.' . $ext;
            if (move_uploaded_file($_FILES['photo']['tmp_name'], $uploadDir . $filename)) {
                $photoUrl = '/uploads/' . date('Y-m-d') . '/' . $filename;
            }
        }
    }

    if (empty($title) || empty($desc)) {
        echo json_encode(['success' => false, 'error' => 'Title and description are required']);
        exit;
    }

    try {
        $incId = 'inc-' . time() . '-' . substr(md5(uniqid()), 0, 5);
        $stmt = $pdo->prepare("
            INSERT INTO ehs_incidents (id, technician_id, technician_name, title, incident_type, risk_level, description, immediate_action_taken, latitude, longitude, photo_url, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$incId, $techId, $techName, $title, $type, $risk, $desc, $actionTaken, $lat, $lng, $photoUrl]);
        echo json_encode(['success' => true, 'message' => 'Incident reported successfully', 'id' => $incId]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ACTION: Add Technician (AJAX)
if ($action === 'add_technician' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json; charset=utf-8');
    $name = trim($_POST['full_name'] ?? '');
    $empId = trim($_POST['employee_id'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $role = trim($_POST['role'] ?? 'TECHNICIAN');
    $phone = trim($_POST['phone_number'] ?? '');

    if (empty($name) || empty($empId) || empty($email)) {
        echo json_encode(['success' => false, 'error' => 'Name, Employee ID, and Email are required']);
        exit;
    }

    try {
        $userId = 'usr-tech-' . time();
        $stmt = $pdo->prepare("
            INSERT INTO users (id, uid, email, full_name, role, employee_id, phone_number, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([$userId, $userId, $email, $name, $role, $empId, $phone]);
        echo json_encode(['success' => true, 'message' => 'Technician added successfully', 'id' => $userId]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ACTION: Live Poll JSON (AJAX)
if ($action === 'live_poll') {
    header('Content-Type: application/json; charset=utf-8');
    $today = date('Y-m-d');
    
    $clockedInToday = (int)$pdo->query("SELECT COUNT(*) FROM daily_reports WHERE work_date = '$today'")->fetchColumn();
    $onTimeToday = (int)$pdo->query("SELECT COUNT(*) FROM daily_reports WHERE work_date = '$today' AND late_status = 'ON_TIME'")->fetchColumn();
    $lateToday = (int)$pdo->query("SELECT COUNT(*) FROM daily_reports WHERE work_date = '$today' AND late_status = 'LATE'")->fetchColumn();
    $totalTechs = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'TECHNICIAN' AND is_active = 1")->fetchColumn();
    $openIncidents = (int)$pdo->query("SELECT COUNT(*) FROM ehs_incidents WHERE status != 'RESOLVED'")->fetchColumn();
    $criticalIncidents = (int)$pdo->query("SELECT COUNT(*) FROM ehs_incidents WHERE risk_level = 'CRITICAL_STOP_WORK' AND status != 'RESOLVED'")->fetchColumn();

    echo json_encode([
        'success' => true,
        'timestamp' => date('H:i:s'),
        'kpis' => [
            'clockedInToday' => $clockedInToday,
            'onTimeToday' => $onTimeToday,
            'lateToday' => $lateToday,
            'totalTechs' => $totalTechs,
            'openIncidents' => $openIncidents,
            'criticalIncidents' => $criticalIncidents,
            'onTimeRate' => $clockedInToday > 0 ? round(($onTimeToday / $clockedInToday) * 100) : 100
        ]
    ]);
    exit;
}

// -------------------------------------------------------------------------
// SERVER-SIDE DATA QUERIES (Rendered into HTML & Chart.js)
// -------------------------------------------------------------------------
$today = date('Y-m-d');

// Executive KPIs
$totalTechs = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'TECHNICIAN' AND is_active = 1")->fetchColumn();
$clockedInToday = (int)$pdo->query("SELECT COUNT(*) FROM daily_reports WHERE work_date = '$today'")->fetchColumn();
$onTimeToday = (int)$pdo->query("SELECT COUNT(*) FROM daily_reports WHERE work_date = '$today' AND late_status = 'ON_TIME'")->fetchColumn();
$lateToday = (int)$pdo->query("SELECT COUNT(*) FROM daily_reports WHERE work_date = '$today' AND late_status = 'LATE'")->fetchColumn();
$onTimeRate = $clockedInToday > 0 ? round(($onTimeToday / $clockedInToday) * 100) : 100;

$openIncidents = (int)$pdo->query("SELECT COUNT(*) FROM ehs_incidents WHERE status != 'RESOLVED'")->fetchColumn();
$criticalIncidents = (int)$pdo->query("SELECT COUNT(*) FROM ehs_incidents WHERE risk_level = 'CRITICAL_STOP_WORK' AND status != 'RESOLVED'")->fetchColumn();
$resolvedIncidents = (int)$pdo->query("SELECT COUNT(*) FROM ehs_incidents WHERE status = 'RESOLVED'")->fetchColumn();

// Fetch Recent Clock-In Reports
$reportsStmt = $pdo->query("SELECT * FROM daily_reports ORDER BY official_clock_in_time DESC LIMIT 100");
$reports = $reportsStmt->fetchAll();

// Count total photos captured today
$photosCountToday = 0;
foreach ($reports as $r) {
    if (($r['work_date'] ?? '') === $today) {
        $p = json_decode($r['photos_json'] ?? '[]', true);
        if (is_array($p)) {
            $photosCountToday += count($p);
        }
    }
}

// Fetch Incidents
$incidentsStmt = $pdo->query("SELECT * FROM ehs_incidents ORDER BY created_at DESC LIMIT 100");
$incidents = $incidentsStmt->fetchAll();

// Fetch Technicians
$techsStmt = $pdo->query("SELECT * FROM users ORDER BY role DESC, full_name ASC");
$technicians = $techsStmt->fetchAll();

// -------------------------------------------------------------------------
// AGGREGATE CHART.JS METRICS (7-Day Trends, Severities, Checklist Pass Rates)
// -------------------------------------------------------------------------
$trendDates = [];
$trendOnTime = [];
$trendLate = [];

for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-$i days"));
    $trendDates[] = date('M j', strtotime($d));
    
    $stmt = $pdo->prepare("SELECT late_status, COUNT(*) as cnt FROM daily_reports WHERE work_date = ? GROUP BY late_status");
    $stmt->execute([$d]);
    $dayResults = $stmt->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
    
    $trendOnTime[] = (int)($dayResults['ON_TIME'] ?? 0);
    $trendLate[] = (int)($dayResults['LATE'] ?? 0);
}

// Incident Severity Breakdown for Doughnut Chart
$incidentSeverity = [
    'CRITICAL' => 0,
    'HIGH' => 0,
    'MEDIUM' => 0,
    'LOW' => 0,
    'RESOLVED' => 0
];
foreach ($incidents as $inc) {
    if ($inc['status'] === 'RESOLVED') {
        $incidentSeverity['RESOLVED']++;
    } else {
        $rl = strtoupper($inc['risk_level'] ?? 'MEDIUM');
        if (strpos($rl, 'CRITICAL') !== false) $incidentSeverity['CRITICAL']++;
        elseif ($rl === 'HIGH') $incidentSeverity['HIGH']++;
        elseif ($rl === 'MEDIUM') $incidentSeverity['MEDIUM']++;
        else $incidentSeverity['LOW']++;
    }
}

// 4-Point Safety Checklist Pass Rates
$checklistPass = [
    'PPE_INSPECTION' => 0,
    'TOOL_SAFETY' => 0,
    'VEHICLE_360' => 0,
    'LADDER_SAFETY' => 0,
    'TOTAL' => count($reports)
];
foreach ($reports as $r) {
    $answers = json_decode($r['ehs_answers_json'] ?? '[]', true);
    if (is_array($answers)) {
        foreach ($answers as $ans) {
            $code = strtoupper($ans['questionCode'] ?? $ans['code'] ?? '');
            $isOk = !empty($ans['isCompliant']) || !empty($ans['compliant']);
            if ($isOk) {
                if (strpos($code, 'PPE') !== false) $checklistPass['PPE_INSPECTION']++;
                elseif (strpos($code, 'TOOL') !== false) $checklistPass['TOOL_SAFETY']++;
                elseif (strpos($code, 'VEHICLE') !== false) $checklistPass['VEHICLE_360']++;
                elseif (strpos($code, 'LADDER') !== false) $checklistPass['LADDER_SAFETY']++;
            }
        }
    }
}

$dbDriverName = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
$dbLabel = (strtolower(DB_DRIVER) === 'sqlite' || $dbDriverName === 'sqlite')
    ? 'SQLite (Zero-Config)'
    : 'MySQL / InfinityFree (' . htmlspecialchars(DB_NAME) . ')';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spectrum Engineering EHS — Executive Admin Portal</title>
    <meta name="description" content="Professional EHS Field Safety, Clock-in, and Incident Management Dashboard powered by PHP, MySQL, Bootstrap 5, and Chart.js">

    <!-- Google Fonts: Plus Jakarta Sans & JetBrains Mono -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Bootstrap 5.3.3 CSS (Pure Bootstrap 5 - No Tailwind CSS) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
    <!-- Bootstrap Icons -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">

    <style>
        :root {
            --ehs-navy: #0F172A;
            --ehs-slate: #1E293B;
            --ehs-border: #334155;
            --ehs-amber: #F59E0B;
            --ehs-emerald: #10B981;
            --ehs-rose: #EF4444;
            --ehs-cyan: #06B6D4;
            --ehs-bg: #F8FAFC;
        }

        body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--ehs-bg);
            color: #1E293B;
            min-height: 100vh;
        }

        .font-mono {
            font-family: 'JetBrains Mono', monospace;
        }

        /* Top Navbar */
        .navbar-custom {
            background-color: var(--ehs-navy);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .brand-badge {
            background: linear-gradient(135deg, var(--ehs-amber), #D97706);
            color: #0F172A;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.85rem;
            letter-spacing: 0.5px;
        }

        /* Pulse Status Dot */
        .pulse-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #10B981;
            box-shadow: 0 0 0 rgba(16, 185, 129, 0.4);
            animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
            70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        /* Metric Cards */
        .kpi-card {
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            background: #FFFFFF;
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .kpi-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .kpi-icon-wrap {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.35rem;
        }

        /* Navigation Pills */
        .nav-pills .nav-link {
            font-weight: 600;
            color: #64748B;
            border-radius: 8px;
            padding: 8px 16px;
        }
        .nav-pills .nav-link.active {
            background-color: var(--ehs-navy);
            color: #FFFFFF;
        }

        /* Tables & Badges */
        .table-custom thead th {
            background-color: #F1F5F9;
            color: #475569;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #E2E8F0;
            padding: 12px 14px;
        }
        .table-custom tbody td {
            padding: 12px 14px;
            vertical-align: middle;
            border-bottom: 1px solid #F1F5F9;
        }

        .badge-ontime {
            background-color: #DEF7EC;
            color: #03543F;
            border: 1px solid #BCF0DA;
        }
        .badge-late {
            background-color: #FDE8E8;
            color: #9B1C1C;
            border: 1px solid #FBD5D5;
        }

        .badge-risk-critical {
            background-color: #7F1D1D;
            color: #FEE2E2;
        }
        .badge-risk-high {
            background-color: #C2410C;
            color: #FFEDD5;
        }
        .badge-risk-medium {
            background-color: #B45309;
            color: #FEF3C7;
        }
        .badge-risk-low {
            background-color: #0369A1;
            color: #E0F2FE;
        }

        .photo-thumb {
            width: 42px;
            height: 42px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #CBD5E1;
            cursor: pointer;
            transition: transform 0.15s ease;
        }
        .photo-thumb:hover {
            transform: scale(1.1);
        }

        /* Sticky Action Bar */
        .sticky-subbar {
            background: #FFFFFF;
            border-bottom: 1px solid #E2E8F0;
            position: sticky;
            top: 56px;
            z-index: 1020;
        }
    </style>
</head>
<body>

    <!-- 1. TOP HEADER & BRANDING -->
    <nav class="navbar navbar-expand-lg navbar-custom sticky-top py-2 px-3 shadow-sm">
        <div class="container-fluid">
            <!-- Brand -->
            <a class="navbar-brand d-flex align-items-center text-decoration-none" href="#">
                <span class="brand-badge me-2">SE</span>
                <div>
                    <div class="fw-bold text-white lh-1 fs-6">Spectrum Engineering EHS</div>
                    <span class="text-secondary small font-mono" style="font-size: 0.72rem;">Field Operations & Safety Command</span>
                </div>
            </a>

            <!-- Mobile Toggle -->
            <button class="navbar-toggler border-secondary text-white" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
                <span class="navbar-toggler-icon"></span>
            </button>

            <!-- Navigation Controls -->
            <div class="collapse navbar-collapse" id="navbarContent">
                <div class="ms-auto d-flex flex-wrap align-items-center gap-2 mt-2 mt-lg-0">
                    <!-- DB Engine Indicator -->
                    <span class="badge bg-secondary-subtle text-light border border-secondary d-inline-flex align-items-center px-2 py-1">
                        <span class="pulse-dot me-2"></span> <?= $dbLabel ?>
                    </span>

                    <!-- Auto-Refresh Toggle -->
                    <button id="btnAutoRefresh" class="btn btn-sm btn-outline-secondary text-light d-flex align-items-center" onclick="toggleAutoRefresh()">
                        <i id="iconRefresh" class="bi bi-pause-fill me-1"></i>
                        <span id="textRefresh">10s Live</span>
                    </button>

                    <!-- Manual Refresh Button -->
                    <button class="btn btn-sm btn-outline-light d-flex align-items-center" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                    </button>

                    <!-- Report Incident Action -->
                    <button class="btn btn-sm btn-warning text-dark fw-bold d-flex align-items-center shadow-sm" data-bs-toggle="modal" data-bs-target="#modalNewIncident">
                        <i class="bi bi-exclamation-triangle-fill me-1"></i> Report Hazard
                    </button>

                    <!-- Add Tech Action -->
                    <button class="btn btn-sm btn-outline-info text-white d-flex align-items-center" data-bs-toggle="modal" data-bs-target="#modalAddTechnician">
                        <i class="bi bi-person-plus-fill me-1"></i> Add Tech
                    </button>

                    <!-- User Role Profile -->
                    <div class="dropdown">
                        <button class="btn btn-sm btn-dark border-secondary text-light dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown">
                            <i class="bi bi-shield-lock-fill text-warning me-1"></i>
                            <span>Rachel Hayes (Super Admin)</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark shadow">
                            <li><h6 class="dropdown-header">Deployment System</h6></li>
                            <li><span class="dropdown-item-text small text-secondary">Host: <?= htmlspecialchars($_SERVER['HTTP_HOST'] ?? 'cPanel') ?></span></li>
                            <li><span class="dropdown-item-text small text-secondary">PHP Version: <?= PHP_VERSION ?></span></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="?action=export_csv"><i class="bi bi-download me-2"></i>Export Compliance CSV</a></li>
                            <li><a class="dropdown-item text-warning" href="#" onclick="location.reload()"><i class="bi bi-arrow-repeat me-2"></i>Reload State</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <!-- 2. CRITICAL STOP-WORK BANNER (Conditional) -->
    <?php if ($criticalIncidents > 0): ?>
    <div class="alert alert-danger rounded-0 border-0 border-bottom border-danger mb-0 py-2 px-3" role="alert">
        <div class="container-fluid d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-octagon-fill fs-4 me-2 text-danger"></i>
                <div>
                    <strong class="text-danger">CRITICAL STOP-WORK ORDER ACTIVE:</strong>
                    <span>There are <?= $criticalIncidents ?> active high/critical safety hazard(s) requiring immediate supervisor intervention.</span>
                </div>
            </div>
            <button class="btn btn-sm btn-danger fw-bold" onclick="document.getElementById('tab-hazards-btn').click();">
                Review Stop-Work Hazards
            </button>
        </div>
    </div>
    <?php endif; ?>

    <!-- 3. SUB-HEADER WITH REAL-TIME AUDIT SUMMARY -->
    <div class="sticky-subbar py-2 px-3 shadow-xs">
        <div class="container-fluid d-flex flex-wrap justify-content-between align-items-center gap-2">
            <!-- View Tabs -->
            <ul class="nav nav-pills" id="dashboardTabs" role="tablist">
                <li class="nav-item">
                    <button class="nav-link active" id="tab-overview-btn" data-bs-toggle="pill" data-bs-target="#tab-overview" type="button" role="tab">
                        <i class="bi bi-speedometer2 me-1"></i> Executive Overview
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" id="tab-clockins-btn" data-bs-toggle="pill" data-bs-target="#tab-clockins" type="button" role="tab">
                        <i class="bi bi-clock-history me-1"></i> Shift Clock-Ins
                        <span class="badge bg-secondary ms-1"><?= count($reports) ?></span>
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" id="tab-hazards-btn" data-bs-toggle="pill" data-bs-target="#tab-hazards" type="button" role="tab">
                        <i class="bi bi-shield-exclamation me-1"></i> Safety Hazards
                        <?php if ($openIncidents > 0): ?>
                            <span class="badge bg-danger ms-1"><?= $openIncidents ?></span>
                        <?php endif; ?>
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" id="tab-techs-btn" data-bs-toggle="pill" data-bs-target="#tab-techs" type="button" role="tab">
                        <i class="bi bi-people-fill me-1"></i> Technicians
                        <span class="badge bg-secondary ms-1"><?= count($technicians) ?></span>
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link" id="tab-photos-btn" data-bs-toggle="pill" data-bs-target="#tab-photos" type="button" role="tab">
                        <i class="bi bi-camera-fill me-1"></i> Photo Vault
                    </button>
                </li>
            </ul>

            <!-- Quick Export & System Health -->
            <div class="d-flex align-items-center gap-2">
                <span class="small text-muted font-mono" id="liveTimestamp">
                    <i class="bi bi-clock me-1"></i><?= date('D, M j, Y • H:i:s') ?> UTC
                </span>
                <a href="?action=export_csv" class="btn btn-sm btn-outline-success d-flex align-items-center">
                    <i class="bi bi-file-earmark-spreadsheet-fill me-1"></i> Export OSHA CSV
                </a>
            </div>
        </div>
    </div>

    <!-- 4. MAIN DASHBOARD CONTENT TABS -->
    <div class="container-fluid py-3 px-3">
        <div class="tab-content" id="dashboardTabsContent">

            <!-- ============================================================= -->
            <!-- TAB 1: EXECUTIVE OVERVIEW (KPIs + Chart.js Analytics Suite)   -->
            <!-- ============================================================= -->
            <div class="tab-pane fade show active" id="tab-overview" role="tabpanel">

                <!-- 4 Top Executive KPI Metric Cards -->
                <div class="row g-3 mb-4">
                    <!-- KPI 1: Active Clocked-In Techs -->
                    <div class="col-12 col-sm-6 col-xl-3">
                        <div class="kpi-card p-3 shadow-xs">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="text-muted small fw-semibold text-uppercase">Active On Duty</span>
                                    <h3 class="fw-bold my-1" id="kpiClockedIn"><?= $clockedInToday ?></h3>
                                    <span class="small text-muted">of <?= $totalTechs ?> registered technicians</span>
                                </div>
                                <div class="kpi-icon-wrap bg-primary-subtle text-primary">
                                    <i class="bi bi-person-badge"></i>
                                </div>
                            </div>
                            <div class="progress mt-2" style="height: 5px;">
                                <div class="progress-bar bg-primary" role="progressbar" style="width: <?= $totalTechs > 0 ? min(100, round(($clockedInToday / $totalTechs) * 100)) : 0 ?>%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- KPI 2: On-Time Arrival Compliance -->
                    <div class="col-12 col-sm-6 col-xl-3">
                        <div class="kpi-card p-3 shadow-xs">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="text-muted small fw-semibold text-uppercase">On-Time Arrival Rate</span>
                                    <h3 class="fw-bold my-1 text-success" id="kpiOnTimeRate"><?= $onTimeRate ?>%</h3>
                                    <span class="small text-muted"><?= $onTimeToday ?> on-time vs <?= $lateToday ?> late</span>
                                </div>
                                <div class="kpi-icon-wrap bg-success-subtle text-success">
                                    <i class="bi bi-check2-circle"></i>
                                </div>
                            </div>
                            <div class="progress mt-2" style="height: 5px;">
                                <div class="progress-bar bg-success" role="progressbar" style="width: <?= $onTimeRate ?>%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- KPI 3: Open EHS Incidents & Hazards -->
                    <div class="col-12 col-sm-6 col-xl-3">
                        <div class="kpi-card p-3 shadow-xs">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="text-muted small fw-semibold text-uppercase">Safety Incidents</span>
                                    <h3 class="fw-bold my-1 <?= $openIncidents > 0 ? 'text-danger' : 'text-success' ?>" id="kpiOpenIncidents"><?= $openIncidents ?></h3>
                                    <span class="small text-muted"><?= $criticalIncidents ?> critical stop-work</span>
                                </div>
                                <div class="kpi-icon-wrap <?= $openIncidents > 0 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success' ?>">
                                    <i class="bi bi-shield-exclamation"></i>
                                </div>
                            </div>
                            <div class="progress mt-2" style="height: 5px;">
                                <div class="progress-bar <?= $criticalIncidents > 0 ? 'bg-danger' : 'bg-warning' ?>" role="progressbar" style="width: <?= min(100, $openIncidents * 20) ?>%"></div>
                            </div>
                        </div>
                    </div>

                    <!-- KPI 4: Mandatory Safety Photos Captured Today -->
                    <div class="col-12 col-sm-6 col-xl-3">
                        <div class="kpi-card p-3 shadow-xs">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="text-muted small fw-semibold text-uppercase">Photos Verified Today</span>
                                    <h3 class="fw-bold my-1 text-info" id="kpiPhotosCount"><?= $photosCountToday ?></h3>
                                    <span class="small text-muted">PPE, tools, vehicle & ladder</span>
                                </div>
                                <div class="kpi-icon-wrap bg-info-subtle text-info">
                                    <i class="bi bi-camera"></i>
                                </div>
                            </div>
                            <div class="progress mt-2" style="height: 5px;">
                                <div class="progress-bar bg-info" role="progressbar" style="width: <?= min(100, $photosCountToday * 10) ?>%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chart.js Modern Analytics Grid -->
                <div class="row g-3 mb-4">
                    <!-- Chart 1: 7-Day Attendance & Arrival Trend -->
                    <div class="col-12 col-lg-8">
                        <div class="card border-0 shadow-xs h-100">
                            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="fw-bold mb-0 text-dark">
                                        <i class="bi bi-graph-up-arrow text-primary me-2"></i>7-Day Attendance & Arrival Compliance Trend
                                    </h6>
                                    <span class="text-muted small">Daily on-time vs late arrival distribution across the technician field force</span>
                                </div>
                                <span class="badge bg-light text-dark border">Chart.js Live</span>
                            </div>
                            <div class="card-body">
                                <div style="height: 280px;">
                                    <canvas id="chartAttendanceTrend"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Chart 2: EHS Incident Severity Breakdown -->
                    <div class="col-12 col-lg-4">
                        <div class="card border-0 shadow-xs h-100">
                            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="fw-bold mb-0 text-dark">
                                        <i class="bi bi-pie-chart text-danger me-2"></i>Incident Severity Distribution
                                    </h6>
                                    <span class="text-muted small">Active risk tier classification</span>
                                </div>
                            </div>
                            <div class="card-body d-flex flex-column align-items-center justify-content-center">
                                <div style="height: 230px; width: 100%;">
                                    <canvas id="chartIncidentSeverity"></canvas>
                                </div>
                                <div class="small text-muted text-center mt-2">
                                    Total logged hazards: <strong><?= count($incidents) ?></strong> (<?= $resolvedIncidents ?> resolved)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Second Chart Row: 4-Point Safety Checklist Pass Rates & Quick Operations -->
                <div class="row g-3 mb-4">
                    <!-- Chart 3: 4-Point Safety Checklist Pass Rates -->
                    <div class="col-12 col-lg-6">
                        <div class="card border-0 shadow-xs h-100">
                            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                <h6 class="fw-bold mb-0 text-dark">
                                    <i class="bi bi-shield-check text-success me-2"></i>4-Point Safety Checklist Audit Pass Rates
                                </h6>
                                <span class="badge bg-success-subtle text-success">OSHA Standards</span>
                            </div>
                            <div class="card-body">
                                <div style="height: 240px;">
                                    <canvas id="chartSafetyChecklist"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- System Diagnostics & Operations Quick Action Box -->
                    <div class="col-12 col-lg-6">
                        <div class="card border-0 shadow-xs h-100">
                            <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                <h6 class="fw-bold mb-0 text-dark">
                                    <i class="bi bi-cpu-fill text-warning me-2"></i>cPanel Hosting & Database Architecture
                                </h6>
                                <span class="badge bg-light text-dark border">Zero Node.js</span>
                            </div>
                            <div class="card-body d-flex flex-column justify-content-between">
                                <div class="row g-2 mb-3">
                                    <div class="col-sm-6">
                                        <div class="p-2 border rounded bg-light">
                                            <div class="text-muted small">Database Engine</div>
                                            <div class="fw-bold text-dark font-mono small"><?= $dbLabel ?></div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="p-2 border rounded bg-light">
                                            <div class="text-muted small">Server Architecture</div>
                                            <div class="fw-bold text-dark font-mono small">PHP <?= PHP_VERSION ?> (cPanel PDO)</div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="p-2 border rounded bg-light">
                                            <div class="text-muted small">Frontend Framework</div>
                                            <div class="fw-bold text-dark small">Bootstrap 5.3.3 + Chart.js</div>
                                        </div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="p-2 border rounded bg-light">
                                            <div class="text-muted small">Mobile App API URL</div>
                                            <div class="fw-bold text-dark font-mono small">/api/v1/sync/batch</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex flex-wrap gap-2">
                                    <a href="?action=export_csv" class="btn btn-sm btn-outline-success">
                                        <i class="bi bi-filetype-csv me-1"></i> Download Audit CSV
                                    </a>
                                    <button class="btn btn-sm btn-outline-warning text-dark" data-bs-toggle="modal" data-bs-target="#modalNewIncident">
                                        <i class="bi bi-plus-circle me-1"></i> Log Field Hazard
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#modalAddTechnician">
                                        <i class="bi bi-person-plus me-1"></i> Register Technician
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- ============================================================= -->
            <!-- TAB 2: SHIFT CLOCK-INS ROSTER                                 -->
            <!-- ============================================================= -->
            <div class="tab-pane fade" id="tab-clockins" role="tabpanel">
                <div class="card border-0 shadow-xs">
                    <div class="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">
                                <i class="bi bi-clock-history text-primary me-2"></i>Technician Clock-In & Arrival Attestation Roster
                            </h6>
                            <span class="text-muted small">Real-time GPS coordinates, hardware monotonic uptime, and tamper-verified logs</span>
                        </div>
                        <!-- Search and Filter Bar -->
                        <div class="d-flex flex-wrap gap-2">
                            <input type="text" id="searchClockIns" class="form-control form-control-sm" placeholder="Search technician, badge..." style="width: 220px;" oninput="filterClockIns()">
                            <select id="filterShift" class="form-select form-select-sm" style="width: 150px;" onchange="filterClockIns()">
                                <option value="">All Shifts</option>
                                <option value="REGULAR_MORNING">Morning Shift</option>
                                <option value="AFTERNOON_FIELD">Afternoon Field</option>
                                <option value="NIGHT_GRID">Night Grid</option>
                                <option value="EMERGENCY_DISPATCH">Emergency Dispatch</option>
                            </select>
                            <select id="filterArrivalStatus" class="form-select form-select-sm" style="width: 130px;" onchange="filterClockIns()">
                                <option value="">All Statuses</option>
                                <option value="ON_TIME">On-Time</option>
                                <option value="LATE">Late Arrival</option>
                            </select>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-custom mb-0" id="tableClockIns">
                            <thead>
                                <tr>
                                    <th>Technician</th>
                                    <th>Work Date</th>
                                    <th>Recorded Arrival</th>
                                    <th>Arrival Status</th>
                                    <th>GPS & Coordinates</th>
                                    <th>Safety Photos</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($reports)): ?>
                                <tr>
                                    <td colspan="7" class="text-center py-5 text-muted">
                                        <i class="bi bi-inbox fs-2 d-block mb-2 text-secondary"></i>
                                        <strong>No clock-in records found.</strong>
                                        <p class="small mb-0">Technicians submitting clock-ins via the mobile app will appear here instantly.</p>
                                    </td>
                                </tr>
                                <?php else: ?>
                                    <?php foreach ($reports as $r): 
                                        $photos = json_decode($r['photos_json'] ?? '[]', true) ?: [];
                                        $clockIn = json_decode($r['clock_in_json'] ?? '{}', true) ?: [];
                                        $shift = $clockIn['shiftType'] ?? 'REGULAR_MORNING';
                                        $isLate = ($r['late_status'] ?? '') === 'LATE';
                                    ?>
                                    <tr class="clockin-row" 
                                        data-search="<?= htmlspecialchars(strtolower(($r['technician_name'] ?? '') . ' ' . ($r['employee_id'] ?? '') . ' ' . ($r['general_comments'] ?? ''))) ?>" 
                                        data-shift="<?= htmlspecialchars($shift) ?>"
                                        data-status="<?= htmlspecialchars($r['late_status'] ?? 'ON_TIME') ?>">
                                        <td>
                                            <div class="d-flex align-items-center">
                                                <div class="bg-dark text-white rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold" style="width: 34px; height: 34px; font-size: 0.8rem;">
                                                    <?= strtoupper(substr($r['technician_name'] ?? 'T', 0, 2)) ?>
                                                </div>
                                                <div>
                                                    <div class="fw-bold text-dark"><?= htmlspecialchars($r['technician_name'] ?? 'Unknown') ?></div>
                                                    <span class="badge bg-light text-secondary border font-mono" style="font-size: 0.7rem;"><?= htmlspecialchars($r['employee_id'] ?? 'N/A') ?></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="font-mono small"><?= htmlspecialchars($r['work_date'] ?? '') ?></span>
                                            <div class="text-muted small" style="font-size: 0.7rem;"><?= htmlspecialchars(str_replace('_', ' ', $shift)) ?></div>
                                        </td>
                                        <td>
                                            <div class="fw-bold font-mono text-dark small"><?= htmlspecialchars($r['official_clock_in_time'] ?? '') ?></div>
                                            <div class="text-muted" style="font-size: 0.7rem;">Expected: <?= htmlspecialchars($r['expected_start_time'] ?? '08:00') ?></div>
                                        </td>
                                        <td>
                                            <?php if ($isLate): ?>
                                                <span class="badge badge-late">
                                                    <i class="bi bi-clock-fill me-1"></i>LATE (+<?= (int)($r['late_duration_minutes'] ?? 0) ?>m)
                                                </span>
                                            <?php else: ?>
                                                <span class="badge badge-ontime">
                                                    <i class="bi bi-check-circle-fill me-1"></i>ON-TIME
                                                </span>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <?php if (!empty($r['latitude']) && !empty($r['longitude'])): ?>
                                                <a href="https://maps.google.com/?q=<?= $r['latitude'] ?>,<?= $r['longitude'] ?>" target="_blank" class="text-decoration-none small text-primary font-mono d-inline-flex align-items-center">
                                                    <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                                                    <?= number_format((float)$r['latitude'], 4) ?>, <?= number_format((float)$r['longitude'], 4) ?>
                                                </a>
                                                <div class="text-muted" style="font-size: 0.7rem;">Acc: ±<?= round((float)($r['location_accuracy_meters'] ?? 0), 1) ?>m</div>
                                            <?php else: ?>
                                                <span class="text-muted small">No GPS recorded</span>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <div class="d-flex gap-1">
                                                <?php if (empty($photos)): ?>
                                                    <span class="text-muted small">None</span>
                                                <?php else: ?>
                                                    <?php foreach ($photos as $p): 
                                                        $url = $p['dataUrl'] ?? $p['photoUrl'] ?? '';
                                                        $type = $p['photoType'] ?? 'Photo';
                                                    ?>
                                                        <?php if (!empty($url)): ?>
                                                            <img src="<?= htmlspecialchars($url) ?>" 
                                                                 alt="<?= htmlspecialchars($type) ?>" 
                                                                 class="photo-thumb" 
                                                                 title="<?= htmlspecialchars($type) ?>"
                                                                 onclick="openPhotoLightbox('<?= htmlspecialchars($url) ?>', '<?= htmlspecialchars($type) ?>')">
                                                        <?php endif; ?>
                                                    <?php endforeach; ?>
                                                <?php endif; ?>
                                            </div>
                                        </td>
                                        <td class="text-end">
                                            <button class="btn btn-sm btn-outline-secondary" 
                                                    onclick="viewClockInDetails(<?= htmlspecialchars(json_encode($r)) ?>)">
                                                <i class="bi bi-eye me-1"></i> Details
                                            </button>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ============================================================= -->
            <!-- TAB 3: SAFETY HAZARDS & INCIDENT MANAGEMENT                   -->
            <!-- ============================================================= -->
            <div class="tab-pane fade" id="tab-hazards" role="tabpanel">
                <div class="card border-0 shadow-xs">
                    <div class="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">
                                <i class="bi bi-shield-exclamation text-danger me-2"></i>EHS Safety Hazards & Incident Log
                            </h6>
                            <span class="text-muted small">Reported near-misses, jobsite hazards, chemical risks, and corrective resolutions</span>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-danger fw-bold" data-bs-toggle="modal" data-bs-target="#modalNewIncident">
                                <i class="bi bi-plus-circle-fill me-1"></i> Report Hazard
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-custom mb-0">
                            <thead>
                                <tr>
                                    <th>Risk Level</th>
                                    <th>Type & Title</th>
                                    <th>Reported By</th>
                                    <th>Action Taken</th>
                                    <th>Evidence</th>
                                    <th>Status</th>
                                    <th class="text-end">Manage</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($incidents)): ?>
                                <tr>
                                    <td colspan="7" class="text-center py-5 text-muted">
                                        <i class="bi bi-shield-check fs-2 d-block mb-2 text-success"></i>
                                        <strong>No incidents or hazards recorded.</strong>
                                        <p class="small mb-0">Zero jobsite safety issues reported to date. Keep up the high safety standards!</p>
                                    </td>
                                </tr>
                                <?php else: ?>
                                    <?php foreach ($incidents as $inc): 
                                        $risk = strtoupper($inc['risk_level'] ?? 'MEDIUM');
                                        $status = strtoupper($inc['status'] ?? 'OPEN');
                                        $riskClass = 'badge-risk-medium';
                                        if (strpos($risk, 'CRITICAL') !== false) $riskClass = 'badge-risk-critical';
                                        elseif ($risk === 'HIGH') $riskClass = 'badge-risk-high';
                                        elseif ($risk === 'LOW') $riskClass = 'badge-risk-low';
                                    ?>
                                    <tr>
                                        <td>
                                            <span class="badge <?= $riskClass ?> px-2 py-1 small">
                                                <?= htmlspecialchars(str_replace('_', ' ', $risk)) ?>
                                            </span>
                                        </td>
                                        <td>
                                            <div class="fw-bold text-dark"><?= htmlspecialchars($inc['title'] ?? '') ?></div>
                                            <span class="badge bg-light text-dark border small"><?= htmlspecialchars($inc['incident_type'] ?? 'HAZARD') ?></span>
                                            <p class="small text-muted mb-0 mt-1" style="max-width: 320px;"><?= htmlspecialchars($inc['description'] ?? '') ?></p>
                                        </td>
                                        <td>
                                            <div class="fw-bold text-dark small"><?= htmlspecialchars($inc['technician_name'] ?? 'Field Tech') ?></div>
                                            <div class="text-muted font-mono" style="font-size: 0.7rem;"><?= htmlspecialchars($inc['created_at'] ?? '') ?></div>
                                        </td>
                                        <td>
                                            <div class="small text-secondary" style="max-width: 250px;">
                                                <?= htmlspecialchars($inc['immediate_action_taken'] ?: 'No immediate action noted') ?>
                                            </div>
                                            <?php if (!empty($inc['resolution_notes'])): ?>
                                                <div class="small text-success mt-1">
                                                    <strong>Resolution:</strong> <?= htmlspecialchars($inc['resolution_notes']) ?>
                                                </div>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <?php if (!empty($inc['photo_url'])): ?>
                                                <img src="<?= htmlspecialchars($inc['photo_url']) ?>" 
                                                     alt="Hazard Evidence" 
                                                     class="photo-thumb" 
                                                     onclick="openPhotoLightbox('<?= htmlspecialchars($inc['photo_url']) ?>', '<?= htmlspecialchars($inc['title']) ?>')">
                                            <?php else: ?>
                                                <span class="text-muted small">No photo</span>
                                            <?php endif; ?>
                                        </td>
                                        <td>
                                            <?php if ($status === 'RESOLVED'): ?>
                                                <span class="badge bg-success"><i class="bi bi-check2-all me-1"></i>RESOLVED</span>
                                            <?php elseif ($status === 'INVESTIGATING'): ?>
                                                <span class="badge bg-warning text-dark"><i class="bi bi-search me-1"></i>INVESTIGATING</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger"><i class="bi bi-exclamation-diamond-fill me-1"></i>OPEN</span>
                                            <?php endif; ?>
                                        </td>
                                        <td class="text-end">
                                            <button class="btn btn-sm btn-outline-primary" 
                                                    onclick="openUpdateIncidentModal('<?= htmlspecialchars($inc['id']) ?>', '<?= htmlspecialchars($inc['status']) ?>', '<?= htmlspecialchars(addslashes($inc['resolution_notes'] ?? '')) ?>')">
                                                Update Status
                                            </button>
                                        </td>
                                    </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ============================================================= -->
            <!-- TAB 4: TECHNICIAN ROSTER & CREDENTIALS                        -->
            <!-- ============================================================= -->
            <div class="tab-pane fade" id="tab-techs" role="tabpanel">
                <div class="card border-0 shadow-xs">
                    <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">
                                <i class="bi bi-people-fill text-primary me-2"></i>Field Personnel & Technician Directory
                            </h6>
                            <span class="text-muted small">Registered field engineers, safety inspectors, and supervisors</span>
                        </div>
                        <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#modalAddTechnician">
                            <i class="bi bi-person-plus-fill me-1"></i> Add Technician
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-custom mb-0">
                            <thead>
                                <tr>
                                    <th>Technician</th>
                                    <th>Employee ID</th>
                                    <th>Role</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($technicians as $t): ?>
                                <tr>
                                    <td>
                                        <div class="d-flex align-items-center">
                                            <div class="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold" style="width: 32px; height: 32px; font-size: 0.8rem;">
                                                <?= strtoupper(substr($t['full_name'], 0, 2)) ?>
                                            </div>
                                            <div class="fw-bold text-dark"><?= htmlspecialchars($t['full_name']) ?></div>
                                        </div>
                                    </td>
                                    <td><span class="font-mono small badge bg-light text-dark border"><?= htmlspecialchars($t['employee_id'] ?? 'N/A') ?></span></td>
                                    <td>
                                        <span class="badge <?= $t['role'] === 'SUPER_ADMIN' ? 'bg-danger' : ($t['role'] === 'SUPERVISOR' ? 'bg-warning text-dark' : 'bg-primary') ?>">
                                            <?= htmlspecialchars($t['role']) ?>
                                        </span>
                                    </td>
                                    <td class="small text-secondary"><?= htmlspecialchars($t['email']) ?></td>
                                    <td class="small text-secondary font-mono"><?= htmlspecialchars($t['phone_number'] ?? 'N/A') ?></td>
                                    <td>
                                        <span class="badge bg-success-subtle text-success">
                                            <i class="bi bi-check-circle me-1"></i>ACTIVE
                                        </span>
                                    </td>
                                </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- ============================================================= -->
            <!-- TAB 5: PHOTO EVIDENCE VAULT                                   -->
            <!-- ============================================================= -->
            <div class="tab-pane fade" id="tab-photos" role="tabpanel">
                <div class="card border-0 shadow-xs">
                    <div class="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="fw-bold mb-0 text-dark">
                                <i class="bi bi-camera-fill text-info me-2"></i>Safety Photo Evidence Vault
                            </h6>
                            <span class="text-muted small">High-resolution captures of PPE selfie, tool inspection, vehicle 360, and ladder harness</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <?php 
                            $allPhotos = [];
                            foreach ($reports as $r) {
                                $pArr = json_decode($r['photos_json'] ?? '[]', true);
                                if (is_array($pArr)) {
                                    foreach ($pArr as $p) {
                                        $p['tech_name'] = $r['technician_name'];
                                        $p['work_date'] = $r['work_date'];
                                        $allPhotos[] = $p;
                                    }
                                }
                            }
                            ?>
                            <?php if (empty($allPhotos)): ?>
                                <div class="col-12 text-center py-5 text-muted">
                                    <i class="bi bi-images fs-1 d-block mb-2 text-secondary"></i>
                                    <h5>No Photo Evidence Uploaded Yet</h5>
                                    <p class="small mb-0">Photos captured during technician clock-in will be cataloged here automatically.</p>
                                </div>
                            <?php else: ?>
                                <?php foreach ($allPhotos as $photo): 
                                    $url = $photo['dataUrl'] ?? $photo['photoUrl'] ?? '';
                                    if (empty($url)) continue;
                                ?>
                                <div class="col-6 col-sm-4 col-md-3 col-xl-2">
                                    <div class="card border shadow-xs h-100 overflow-hidden">
                                        <img src="<?= htmlspecialchars($url) ?>" 
                                             class="card-img-top" 
                                             style="height: 140px; object-fit: cover; cursor: pointer;" 
                                             alt="Safety Photo"
                                             onclick="openPhotoLightbox('<?= htmlspecialchars($url) ?>', '<?= htmlspecialchars($photo['photoType'] ?? 'Safety Photo') ?>')">
                                        <div class="card-body p-2">
                                            <div class="fw-bold small text-truncate" title="<?= htmlspecialchars($photo['photoType'] ?? 'Photo') ?>">
                                                <?= htmlspecialchars(str_replace('_', ' ', $photo['photoType'] ?? 'Safety Photo')) ?>
                                            </div>
                                            <div class="small text-muted text-truncate"><?= htmlspecialchars($photo['tech_name'] ?? '') ?></div>
                                            <div class="text-secondary font-mono" style="font-size: 0.68rem;"><?= htmlspecialchars($photo['work_date'] ?? '') ?></div>
                                        </div>
                                    </div>
                                </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODAL 1: CLOCK-IN AUDIT ATTESTATION DETAILS                       -->
    <!-- ================================================================= -->
    <div class="modal fade" id="modalClockInDetails" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-dark text-white py-3">
                    <h5 class="modal-title fs-6 fw-bold">
                        <i class="bi bi-shield-check text-success me-2"></i>Official Clock-In Attestation Audit
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <div class="row g-3 mb-3">
                        <div class="col-sm-6">
                            <label class="text-muted small">Technician Name</label>
                            <div class="fw-bold fs-6 text-dark" id="modalDetailTechName">-</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="text-muted small">Employee ID</label>
                            <div class="fw-bold font-mono text-dark" id="modalDetailEmpId">-</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="text-muted small">Official Arrival Time</label>
                            <div class="fw-bold font-mono text-primary fs-6" id="modalDetailClockInTime">-</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="text-muted small">Arrival Status</label>
                            <div id="modalDetailStatusBadge">-</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="text-muted small">GPS Coordinates</label>
                            <div class="font-mono small" id="modalDetailGps">-</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="text-muted small">Submission Pipeline</label>
                            <div class="font-mono small" id="modalDetailSubmission">-</div>
                        </div>
                        <div class="col-12">
                            <label class="text-muted small">General Jobsite Comments</label>
                            <div class="p-2 border rounded bg-light small" id="modalDetailComments">None provided</div>
                        </div>
                    </div>

                    <h6 class="fw-bold text-dark mt-4 mb-2">Attached Safety Photo Evidence (4-Point Verification)</h6>
                    <div class="row g-2" id="modalDetailPhotos">
                        <!-- Populated by JavaScript -->
                    </div>
                </div>
                <div class="modal-footer bg-light py-2">
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODAL 2: REPORT NEW INCIDENT / HAZARD                             -->
    <!-- ================================================================= -->
    <div class="modal fade" id="modalNewIncident" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-danger text-white py-3">
                    <h5 class="modal-title fs-6 fw-bold">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>Report Jobsite Safety Hazard / Incident
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="formNewIncident" onsubmit="submitNewIncident(event)">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Incident Title *</label>
                            <input type="text" name="title" class="form-control" placeholder="e.g., Unsafe scaffolding clearance on Sector 4" required>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold">Incident Type *</label>
                                <select name="incident_type" class="form-select">
                                    <option value="HAZARD">Jobsite Hazard</option>
                                    <option value="NEAR_MISS">Near Miss</option>
                                    <option value="EQUIPMENT_DEFECT">Equipment Defect</option>
                                    <option value="ELECTRICAL_RISK">Electrical / Grid Risk</option>
                                    <option value="CHEMICAL_SPILL">Chemical / Hazardous Material</option>
                                    <option value="INJURY">Physical Injury</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold">Risk Severity *</label>
                                <select name="risk_level" class="form-select">
                                    <option value="CRITICAL_STOP_WORK">CRITICAL (Stop Work)</option>
                                    <option value="HIGH">HIGH</option>
                                    <option value="MEDIUM" selected>MEDIUM</option>
                                    <option value="LOW">LOW</option>
                                </select>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Detailed Hazard Description *</label>
                            <textarea name="description" class="form-control" rows="3" placeholder="Describe the physical condition, equipment involved, and risk factors observed..." required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Immediate Action Taken</label>
                            <input type="text" name="immediate_action_taken" class="form-control" placeholder="e.g., Area cordoned off with caution tape; lead notified">
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Attach Photographic Evidence</label>
                            <input type="file" name="photo" class="form-control" accept="image/*">
                        </div>
                    </div>
                    <div class="modal-footer bg-light py-2">
                        <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-danger fw-bold" id="btnSubmitIncident">
                            <i class="bi bi-shield-fill-check me-1"></i> Submit Report
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODAL 3: UPDATE INCIDENT STATUS                                   -->
    <!-- ================================================================= -->
    <div class="modal fade" id="modalUpdateIncident" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-dark text-white py-3">
                    <h5 class="modal-title fs-6 fw-bold">
                        <i class="bi bi-pencil-square text-warning me-2"></i>Update Incident Resolution Status
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="formUpdateIncident" onsubmit="submitUpdateIncident(event)">
                    <input type="hidden" name="incident_id" id="updateIncidentId">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Status *</label>
                            <select name="status" id="updateIncidentStatus" class="form-select">
                                <option value="OPEN">OPEN</option>
                                <option value="INVESTIGATING">INVESTIGATING</option>
                                <option value="RESOLVED">RESOLVED</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Resolution & Corrective Notes *</label>
                            <textarea name="resolution_notes" id="updateIncidentNotes" class="form-control" rows="4" placeholder="Detail the corrective actions verified, repairs conducted, and sign-off remarks..." required></textarea>
                        </div>
                    </div>
                    <div class="modal-footer bg-light py-2">
                        <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-primary fw-bold" id="btnSaveStatus">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODAL 4: ADD TECHNICIAN                                           -->
    <!-- ================================================================= -->
    <div class="modal fade" id="modalAddTechnician" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-primary text-white py-3">
                    <h5 class="modal-title fs-6 fw-bold">
                        <i class="bi bi-person-plus-fill me-2"></i>Register Field Technician / Personnel
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <form id="formAddTechnician" onsubmit="submitAddTechnician(event)">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Full Name *</label>
                            <input type="text" name="full_name" class="form-control" placeholder="e.g., Jonathan Vance" required>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold">Employee Code *</label>
                                <input type="text" name="employee_id" class="form-control font-mono" placeholder="EMP-2041" required>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold">Role</label>
                                <select name="role" class="form-select">
                                    <option value="TECHNICIAN" selected>Field Technician</option>
                                    <option value="SUPERVISOR">Site Supervisor</option>
                                    <option value="SUPER_ADMIN">Super Admin</option>
                                </select>
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Email Address *</label>
                            <input type="email" name="email" class="form-control" placeholder="j.vance@spectrum.com" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold">Phone Number</label>
                            <input type="tel" name="phone_number" class="form-control" placeholder="(555) 019-2834">
                        </div>
                    </div>
                    <div class="modal-footer bg-light py-2">
                        <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-sm btn-primary fw-bold" id="btnSubmitTech">
                            Save Technician
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- ================================================================= -->
    <!-- MODAL 5: PHOTO LIGHTBOX                                           -->
    <!-- ================================================================= -->
    <div class="modal fade" id="modalPhotoLightbox" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 bg-dark text-white">
                <div class="modal-header border-secondary py-2">
                    <h6 class="modal-title" id="lightboxTitle">Photo Evidence</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0 text-center bg-black">
                    <img id="lightboxImg" src="" class="img-fluid" style="max-height: 75vh;" alt="Evidence">
                </div>
            </div>
        </div>
    </div>

    <!-- TOAST NOTIFICATION CONTAINER -->
    <div class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1090;">
        <div id="liveToast" class="toast align-items-center text-bg-dark border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body small fw-semibold" id="toastMessage">
                    Action executed successfully.
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    </div>

    <!-- Bootstrap 5.3.3 JS Bundle (No external bundle/build step needed) -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Chart.js 4.4.1 (Pure JS Data Visualizations) -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

    <!-- Vanilla JavaScript Application Logic (Zero TypeScript, Zero Node.js) -->
    <script>
        // Server-injected analytics datasets for Chart.js
        const chartDataTrends = {
            labels: <?= json_encode($trendDates) ?>,
            onTime: <?= json_encode($trendOnTime) ?>,
            late: <?= json_encode($trendLate) ?>
        };

        const chartDataSeverity = {
            labels: ['Critical Stop-Work', 'High Risk', 'Medium Risk', 'Low Risk', 'Resolved'],
            counts: [
                <?= (int)$incidentSeverity['CRITICAL'] ?>,
                <?= (int)$incidentSeverity['HIGH'] ?>,
                <?= (int)$incidentSeverity['MEDIUM'] ?>,
                <?= (int)$incidentSeverity['LOW'] ?>,
                <?= (int)$incidentSeverity['RESOLVED'] ?>
            ]
        };

        const chartDataSafety = {
            labels: ['PPE Verification', 'Tool Inspection', '360 Vehicle Walkaround', 'Ladder/Heights Safety'],
            counts: [
                <?= (int)$checklistPass['PPE_INSPECTION'] ?>,
                <?= (int)$checklistPass['TOOL_SAFETY'] ?>,
                <?= (int)$checklistPass['VEHICLE_360'] ?>,
                <?= (int)$checklistPass['LADDER_SAFETY'] ?>
            ],
            total: <?= max(1, (int)$checklistPass['TOTAL']) ?>
        };

        // Initialize Chart.js Charts on Window Load
        let chartAttendanceInstance = null;
        let chartSeverityInstance = null;
        let chartSafetyInstance = null;

        function initCharts() {
            // Chart 1: 7-Day Attendance Trend (Dual Line / Bar)
            const ctxTrend = document.getElementById('chartAttendanceTrend');
            if (ctxTrend) {
                chartAttendanceInstance = new Chart(ctxTrend, {
                    type: 'bar',
                    data: {
                        labels: chartDataTrends.labels,
                        datasets: [
                            {
                                label: 'On-Time Clock-Ins',
                                data: chartDataTrends.onTime,
                                backgroundColor: 'rgba(16, 185, 129, 0.85)',
                                borderColor: '#10B981',
                                borderRadius: 6,
                                barPercentage: 0.6
                            },
                            {
                                label: 'Late Arrivals',
                                data: chartDataTrends.late,
                                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                                borderColor: '#EF4444',
                                borderRadius: 6,
                                barPercentage: 0.6
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 12 } } },
                            tooltip: { padding: 10, cornerRadius: 8 }
                        },
                        scales: {
                            x: { grid: { display: false } },
                            y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#F1F5F9' } }
                        }
                    }
                });
            }

            // Chart 2: EHS Incident Severity (Doughnut Chart)
            const ctxSeverity = document.getElementById('chartIncidentSeverity');
            if (ctxSeverity) {
                chartSeverityInstance = new Chart(ctxSeverity, {
                    type: 'doughnut',
                    data: {
                        labels: chartDataSeverity.labels,
                        datasets: [{
                            data: chartDataSeverity.counts,
                            backgroundColor: [
                                '#EF4444', // Critical
                                '#F97316', // High
                                '#F59E0B', // Medium
                                '#06B6D4', // Low
                                '#10B981'  // Resolved
                            ],
                            borderWidth: 2,
                            borderColor: '#FFFFFF'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                            legend: { position: 'bottom', labels: { boxWidth: 10, font: { family: 'Plus Jakarta Sans', size: 11 } } }
                        }
                    }
                });
            }

            // Chart 3: 4-Point Safety Checklist Pass Rates (Horizontal Bar)
            const ctxSafety = document.getElementById('chartSafetyChecklist');
            if (ctxSafety) {
                const passPercentages = chartDataSafety.counts.map(cnt => Math.min(100, Math.round((cnt / chartDataSafety.total) * 100)));
                chartSafetyInstance = new Chart(ctxSafety, {
                    type: 'bar',
                    data: {
                        labels: chartDataSafety.labels,
                        datasets: [{
                            label: 'Pass Rate %',
                            data: passPercentages.every(v => v === 0) ? [100, 100, 100, 100] : passPercentages,
                            backgroundColor: [
                                'rgba(16, 185, 129, 0.85)',
                                'rgba(6, 182, 212, 0.85)',
                                'rgba(245, 158, 11, 0.85)',
                                'rgba(99, 102, 241, 0.85)'
                            ],
                            borderRadius: 6
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false }
                        },
                        scales: {
                            x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
                            y: { grid: { display: false } }
                        }
                    }
                });
            }
        }

        // Clock-Ins Filter Handler
        function filterClockIns() {
            const query = (document.getElementById('searchClockIns')?.value || '').toLowerCase().trim();
            const shift = document.getElementById('filterShift')?.value || '';
            const status = document.getElementById('filterArrivalStatus')?.value || '';

            const rows = document.querySelectorAll('.clockin-row');
            rows.forEach(row => {
                const rowSearch = row.getAttribute('data-search') || '';
                const rowShift = row.getAttribute('data-shift') || '';
                const rowStatus = row.getAttribute('data-status') || '';

                const matchesQuery = !query || rowSearch.includes(query);
                const matchesShift = !shift || rowShift === shift;
                const matchesStatus = !status || rowStatus === status;

                if (matchesQuery && matchesShift && matchesStatus) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        }

        // Toast Helper
        function showToast(message, isSuccess = true) {
            const toastEl = document.getElementById('liveToast');
            const msgEl = document.getElementById('toastMessage');
            if (toastEl && msgEl) {
                msgEl.textContent = message;
                toastEl.className = `toast align-items-center text-bg-${isSuccess ? 'dark' : 'danger'} border-0`;
                const toast = new bootstrap.Toast(toastEl);
                toast.show();
            }
        }

        // Photo Lightbox Modal
        function openPhotoLightbox(url, title) {
            document.getElementById('lightboxImg').src = url;
            document.getElementById('lightboxTitle').textContent = title || 'Safety Photo Evidence';
            new bootstrap.Modal(document.getElementById('modalPhotoLightbox')).show();
        }

        // View Clock-In Attestation Details Modal
        function viewClockInDetails(record) {
            document.getElementById('modalDetailTechName').textContent = record.technician_name || 'N/A';
            document.getElementById('modalDetailEmpId').textContent = record.employee_id || 'N/A';
            document.getElementById('modalDetailClockInTime').textContent = record.official_clock_in_time || 'N/A';
            
            const isLate = record.late_status === 'LATE';
            document.getElementById('modalDetailStatusBadge').innerHTML = isLate 
                ? '<span class="badge badge-late">LATE ARRIVAL (+' + (record.late_duration_minutes || 0) + ' min)</span>'
                : '<span class="badge badge-ontime">ON-TIME ARRIVAL</span>';

            if (record.latitude && record.longitude) {
                document.getElementById('modalDetailGps').innerHTML = `
                    <a href="https://maps.google.com/?q=${record.latitude},${record.longitude}" target="_blank" class="text-primary text-decoration-none">
                        <i class="bi bi-geo-alt-fill text-danger me-1"></i>${Number(record.latitude).toFixed(5)}, ${Number(record.longitude).toFixed(5)} (±${record.location_accuracy_meters || 0}m)
                    </a>
                `;
            } else {
                document.getElementById('modalDetailGps').textContent = 'No GPS Recorded';
            }

            document.getElementById('modalDetailSubmission').textContent = (record.submission_type || 'ONLINE') + (record.is_time_tampered ? ' [FLAGGED TAMPERED]' : ' [VERIFIED]');
            document.getElementById('modalDetailComments').textContent = record.general_comments || 'No comments entered.';

            // Render Photos
            const photosContainer = document.getElementById('modalDetailPhotos');
            photosContainer.innerHTML = '';
            let photos = [];
            try { photos = JSON.parse(record.photos_json || '[]'); } catch(e) {}

            if (photos.length === 0) {
                photosContainer.innerHTML = '<div class="col-12 text-muted small">No photos attached to this clock-in.</div>';
            } else {
                photos.forEach(p => {
                    const col = document.createElement('div');
                    col.className = 'col-3';
                    const u = p.dataUrl || p.photoUrl;
                    col.innerHTML = `
                        <div class="border rounded p-1 text-center bg-light">
                            <img src="${u}" class="img-fluid rounded" style="height: 90px; object-fit: cover; cursor: pointer;" onclick="openPhotoLightbox('${u}', '${p.photoType}')">
                            <div class="text-truncate small fw-semibold mt-1" style="font-size: 0.7rem;">${p.photoType}</div>
                        </div>
                    `;
                    photosContainer.appendChild(col);
                });
            }

            new bootstrap.Modal(document.getElementById('modalClockInDetails')).show();
        }

        // Open Incident Status Modal
        function openUpdateIncidentModal(id, status, notes) {
            document.getElementById('updateIncidentId').value = id;
            document.getElementById('updateIncidentStatus').value = status;
            document.getElementById('updateIncidentNotes').value = notes || '';
            new bootstrap.Modal(document.getElementById('modalUpdateIncident')).show();
        }

        // Submit Incident Status Update (AJAX)
        async function submitUpdateIncident(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSaveStatus');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

            const form = document.getElementById('formUpdateIncident');
            const data = new FormData(form);
            data.append('action', 'update_incident_status');

            try {
                const res = await fetch('dashboard.php', { method: 'POST', body: data });
                const json = await res.json();
                if (json.success) {
                    showToast('Incident status successfully updated!');
                    setTimeout(() => location.reload(), 800);
                } else {
                    showToast(json.error || 'Update failed', false);
                }
            } catch (err) {
                showToast('Network error updating incident', false);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Changes';
            }
        }

        // Submit New Incident (AJAX)
        async function submitNewIncident(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitIncident');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Submitting...';

            const form = document.getElementById('formNewIncident');
            const data = new FormData(form);
            data.append('action', 'create_incident');

            try {
                const res = await fetch('dashboard.php', { method: 'POST', body: data });
                const json = await res.json();
                if (json.success) {
                    showToast('Incident reported successfully!');
                    setTimeout(() => location.reload(), 800);
                } else {
                    showToast(json.error || 'Failed to report incident', false);
                }
            } catch (err) {
                showToast('Network error submitting incident', false);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-shield-fill-check me-1"></i> Submit Report';
            }
        }

        // Submit Add Technician (AJAX)
        async function submitAddTechnician(e) {
            e.preventDefault();
            const btn = document.getElementById('btnSubmitTech');
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Registering...';

            const form = document.getElementById('formAddTechnician');
            const data = new FormData(form);
            data.append('action', 'add_technician');

            try {
                const res = await fetch('dashboard.php', { method: 'POST', body: data });
                const json = await res.json();
                if (json.success) {
                    showToast('Technician registered successfully!');
                    setTimeout(() => location.reload(), 800);
                } else {
                    showToast(json.error || 'Registration failed', false);
                }
            } catch (err) {
                showToast('Network error registering technician', false);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Save Technician';
            }
        }

        // Auto-Refresh Logic (10s polling)
        let autoRefreshActive = true;
        let pollTimer = null;

        function toggleAutoRefresh() {
            autoRefreshActive = !autoRefreshActive;
            const icon = document.getElementById('iconRefresh');
            const text = document.getElementById('textRefresh');
            if (autoRefreshActive) {
                icon.className = 'bi bi-pause-fill me-1';
                text.textContent = '10s Live';
                startPolling();
                showToast('Auto-refresh active (10s intervals)');
            } else {
                icon.className = 'bi bi-play-fill me-1';
                text.textContent = 'Paused';
                clearInterval(pollTimer);
                showToast('Auto-refresh paused');
            }
        }

        function startPolling() {
            clearInterval(pollTimer);
            pollTimer = setInterval(async () => {
                if (!autoRefreshActive) return;
                try {
                    const res = await fetch('dashboard.php?action=live_poll');
                    if (res.ok) {
                        const data = await res.json();
                        if (data.kpis) {
                            document.getElementById('kpiClockedIn').textContent = data.kpis.clockedInToday;
                            document.getElementById('kpiOnTimeRate').textContent = data.kpis.onTimeRate + '%';
                            document.getElementById('kpiOpenIncidents').textContent = data.kpis.openIncidents;
                        }
                    }
                } catch (e) {}
            }, 10000);
        }

        // Document Ready Initialization
        document.addEventListener('DOMContentLoaded', () => {
            initCharts();
            startPolling();
        });
    </script>
</body>
</html>
