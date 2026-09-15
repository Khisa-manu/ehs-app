package com.fieldpulse.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fieldpulse.app.data.model.*
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.theme.Amber500
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun AdminDashboardScreen(viewModel: FieldPulseViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val clockRecords by viewModel.clockRecords.collectAsState()
    val ehsIncidents by viewModel.ehsIncidents.collectAsState()
    val technicians by viewModel.technicians.collectAsState()
    val activeTechs = if (technicians.isNotEmpty()) technicians else Technician.SPECTRUM_TECHNICIANS

    var selectedSection by remember { mutableStateOf(0) } // 0: Workforce Directory, 1: Clock-Ins, 2: Hazard Triage, 3: Site Controls
    var hazardFilter by remember { mutableStateOf<String>("ALL") }
    var selectedIncidentForReview by remember { mutableStateOf<EHSIncident?>(null) }
    var showMusterSuccessDialog by remember { mutableStateOf(false) }
    var showAddTechDialog by remember { mutableStateOf(false) }
    var techToDelete by remember { mutableStateOf<Technician?>(null) }

    val activeClockIns = clockRecords.filter { it.type == "CLOCK_IN" }
    val criticalIncidents = ehsIncidents.filter { it.riskLevel == RiskLevel.CRITICAL_STOP_WORK }
    val highIncidents = ehsIncidents.filter { it.riskLevel == RiskLevel.HIGH }
    val openIncidents = ehsIncidents.filter { it.status == "OPEN" || it.status == "INVESTIGATING" }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Admin Header & Role Badge
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(Amber500),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.AdminPanelSettings,
                                    contentDescription = "Admin",
                                    tint = Color(0xFF0F172A),
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "EHS Safety Command Center",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Surface(
                                        color = Amber500.copy(alpha = 0.2f),
                                        shape = RoundedCornerShape(4.dp)
                                    ) {
                                        Text(
                                            text = "ADMIN",
                                            color = Amber500,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                        )
                                    }
                                }
                                Text(
                                    text = "${uiState.currentTechnician.name} • ${uiState.currentTechnician.role}",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                                )
                            }
                        }

                        IconButton(
                            onClick = { viewModel.triggerSyncNow() },
                            modifier = Modifier.size(36.dp)
                        ) {
                            Icon(
                                Icons.Default.Sync,
                                contentDescription = "Sync",
                                tint = if (uiState.pendingSyncCount > 0) Amber500 else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Quick status strip
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surface
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF10B981))
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "System Online",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }

                        Surface(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.surface
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.CloudQueue,
                                    contentDescription = null,
                                    modifier = Modifier.size(12.dp),
                                    tint = if (uiState.pendingSyncCount > 0) Amber500 else Color(0xFF10B981)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "${uiState.pendingSyncCount} Pending Sync",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. High-Level Executive KPI Metric Cards
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Active on site
                AdminMetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Active Personnel",
                    value = activeClockIns.size.toString(),
                    subtitle = "Clocked-In On-Duty",
                    accentColor = Color(0xFF10B981),
                    icon = Icons.Default.Engineering
                )

                // Open Hazards
                AdminMetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Open Hazards",
                    value = openIncidents.size.toString(),
                    subtitle = "${criticalIncidents.size} Critical Stop-Work",
                    accentColor = if (criticalIncidents.isNotEmpty()) Color(0xFFF43F5E) else Amber500,
                    icon = Icons.Default.WarningAmber
                )
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Compliance Audit Score
                AdminMetricCard(
                    modifier = Modifier.weight(1f),
                    title = "EHS Compliance",
                    value = "99.4%",
                    subtitle = "100% Zero Lost-Time",
                    accentColor = Color(0xFF38BDF8),
                    icon = Icons.Default.VerifiedUser
                )

                // Total Logged Incidents
                AdminMetricCard(
                    modifier = Modifier.weight(1f),
                    title = "Total Audits",
                    value = ehsIncidents.size.toString(),
                    subtitle = "Reports Archived",
                    accentColor = Amber500,
                    icon = Icons.Default.Assessment
                )
            }
        }

        // 3. Section Segment Control (Workforce Roster vs Clock-Ins vs Hazards vs Controls)
        item {
            TabRow(
                selectedTabIndex = selectedSection,
                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.clip(RoundedCornerShape(12.dp))
            ) {
                Tab(
                    selected = selectedSection == 0,
                    onClick = { selectedSection = 0 },
                    text = {
                        Text(
                            text = "Roster (${activeTechs.size})",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    icon = { Icon(Icons.Default.Group, contentDescription = null, modifier = Modifier.size(16.dp)) }
                )
                Tab(
                    selected = selectedSection == 1,
                    onClick = { selectedSection = 1 },
                    text = {
                        Text(
                            text = "Clock-Ins (${activeClockIns.size})",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    icon = { Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp)) }
                )
                Tab(
                    selected = selectedSection == 2,
                    onClick = { selectedSection = 2 },
                    text = {
                        Text(
                            text = "Hazards (${ehsIncidents.size})",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    icon = { Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(16.dp)) }
                )
                Tab(
                    selected = selectedSection == 3,
                    onClick = { selectedSection = 3 },
                    text = {
                        Text(
                            text = "Controls",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    icon = { Icon(Icons.Default.Security, contentDescription = null, modifier = Modifier.size(16.dp)) }
                )
            }
        }

        // 4. TAB CONTENT 0: Field Workforce Directory & Roster Management (Add & Remove)
        if (selectedSection == 0) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "FIELD WORKFORCE ROSTER",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        Text(
                            text = "${activeTechs.size} Registered Field Technicians",
                            fontSize = 10.sp,
                            color = Color(0xFF10B981),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                    Button(
                        onClick = { showAddTechDialog = true },
                        colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                    ) {
                        Icon(
                            Icons.Default.PersonAdd,
                            contentDescription = null,
                            tint = Color(0xFF0F172A),
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Add Tech",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A)
                        )
                    }
                }
            }

            if (activeTechs.isEmpty()) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.PersonOff, contentDescription = null, modifier = Modifier.size(36.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "No technicians in workforce roster", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(text = "Tap 'Add Tech' above to register new field technicians.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            } else {
                items(activeTechs) { tech ->
                    AdminTechnicianCard(
                        tech = tech,
                        onDelete = { techToDelete = tech }
                    )
                }
            }
        }

        // 5. TAB CONTENT 1: Active Personnel Live Clock-Ins
        if (selectedSection == 1) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ON-SITE ACTIVE FIELD TECHNICIANS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "Live GPS Geofence Check",
                        fontSize = 10.sp,
                        color = Color(0xFF10B981),
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            if (activeClockIns.isEmpty()) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.PersonOff, contentDescription = null, modifier = Modifier.size(36.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "No active clock-in records found", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(text = "Switch to Field Tech mode to clock in technicians.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            } else {
                items(activeClockIns) { record ->
                    PersonnelRosterCard(record = record)
                }
            }
        }

        // 6. TAB CONTENT 2: Hazard & Incident Triage
        if (selectedSection == 2) {
            item {
                // Filter chips
                LazyRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    val filters = listOf("ALL", "CRITICAL", "HIGH", "OPEN", "RESOLVED")
                    items(filters) { f ->
                        FilterChip(
                            selected = hazardFilter == f,
                            onClick = { hazardFilter = f },
                            label = { Text(f, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Amber500,
                                selectedLabelColor = Color(0xFF0F172A)
                            )
                        )
                    }
                }
            }

            val filteredIncidents = ehsIncidents.filter { inc ->
                when (hazardFilter) {
                    "CRITICAL" -> inc.riskLevel == RiskLevel.CRITICAL_STOP_WORK
                    "HIGH" -> inc.riskLevel == RiskLevel.HIGH
                    "OPEN" -> inc.status == "OPEN" || inc.status == "INVESTIGATING"
                    "RESOLVED" -> inc.status == "RESOLVED"
                    else -> true
                }
            }

            if (filteredIncidents.isEmpty()) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, modifier = Modifier.size(36.dp), tint = Color(0xFF10B981))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "No matching hazard reports", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text(text = "All site conditions in this category are clear.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            } else {
                items(filteredIncidents) { incident ->
                    AdminIncidentCard(
                        incident = incident,
                        onReview = { selectedIncidentForReview = incident },
                        onUpdateStatus = { newStatus ->
                            viewModel.updateIncidentStatus(incident.id, newStatus)
                        }
                    )
                }
            }
        }

        // 7. TAB CONTENT 3: Site & Safety Controls
        if (selectedSection == 3) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(
                            text = "Site Safety & Supervisor Actions",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )

                        // Emergency Muster Call Action
                        Button(
                            onClick = { showMusterSuccessDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE11D48)),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Campaign, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Initiate Facility Muster Call & Evac Alert", fontWeight = FontWeight.Bold, color = Color.White)
                        }

                        // Force Synchronize All Field Units
                        OutlinedButton(
                            onClick = { viewModel.triggerSyncNow() },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Sync, contentDescription = null, tint = Amber500)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Force Sync All Local Offline Queues (${uiState.pendingSyncCount} pending)", fontWeight = FontWeight.SemiBold)
                        }

                        // Switch to Field Tech Mode for testing
                        Button(
                            onClick = { viewModel.setTab(0) },
                            colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(Icons.Default.Schedule, contentDescription = null, tint = Color(0xFF0F172A))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Switch to Field Tech Clock-In View", fontWeight = FontWeight.Bold, color = Color(0xFF0F172A))
                        }
                    }
                }
            }
        }

        item {
            Spacer(modifier = Modifier.height(20.dp))
        }
    }

    // Modal / Dialog for reviewing & updating an incident
    if (selectedIncidentForReview != null) {
        val inc = selectedIncidentForReview!!
        var supervisorNotes by remember { mutableStateOf(inc.resolutionNotes) }

        AlertDialog(
            onDismissRequest = { selectedIncidentForReview = null },
            title = {
                Text(
                    text = "EHS Hazard Audit Review",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(text = inc.title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    Text(text = "Reported By: ${inc.technicianName}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(text = "Description: ${inc.description}", fontSize = 12.sp)
                    Text(text = "Immediate Action Taken: ${inc.immediateActionTaken}", fontSize = 12.sp, color = Color(0xFF10B981))

                    Spacer(modifier = Modifier.height(4.dp))
                    Text(text = "Supervisor Resolution Notes:", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    OutlinedTextField(
                        value = supervisorNotes,
                        onValueChange = { supervisorNotes = it },
                        placeholder = { Text("Enter corrective action notes...") },
                        modifier = Modifier.fillMaxWidth(),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.updateIncidentStatus(inc.id, "RESOLVED", supervisorNotes)
                        selectedIncidentForReview = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Mark Resolved & Closed", color = Color.White)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = {
                        viewModel.updateIncidentStatus(inc.id, "INVESTIGATING", supervisorNotes)
                        selectedIncidentForReview = null
                    }
                ) {
                    Text("Keep Investigating")
                }
            }
        )
    }

    // Muster call simulation alert dialog
    if (showMusterSuccessDialog) {
        AlertDialog(
            onDismissRequest = { showMusterSuccessDialog = false },
            icon = { Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(32.dp)) },
            title = { Text("Emergency Muster Alert Dispatched") },
            text = {
                Text("All ${activeClockIns.size} active technicians have been notified with acoustic tone & muster point directions. Personnel accountability telemetry active.")
            },
            confirmButton = {
                Button(onClick = { showMusterSuccessDialog = false }) {
                    Text("Acknowledged")
                }
            }
        )
    }

    // Modal / Dialog for adding a new field technician
    if (showAddTechDialog) {
        var newName by remember { mutableStateOf("") }
        var newCode by remember { mutableStateOf("") }
        var newRole by remember { mutableStateOf("") }
        var newSite by remember { mutableStateOf("Spectrum Facility Delta") }
        var newEmail by remember { mutableStateOf("") }
        var newPin by remember { mutableStateOf("1234") }
        var newIsAdmin by remember { mutableStateOf(false) }
        var addError by remember { mutableStateOf<String?>(null) }

        AlertDialog(
            onDismissRequest = { showAddTechDialog = false },
            icon = {
                Icon(
                    Icons.Default.PersonAdd,
                    contentDescription = null,
                    tint = Amber500,
                    modifier = Modifier.size(28.dp)
                )
            },
            title = {
                Text(
                    text = "Onboard Field Technician",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = newName,
                        onValueChange = { newName = it; addError = null },
                        label = { Text("Full Legal Name *") },
                        placeholder = { Text("e.g. David Thorne") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = newCode,
                            onValueChange = { newCode = it.uppercase(); addError = null },
                            label = { Text("Badge ID *") },
                            placeholder = { Text("SE-4029") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = newPin,
                            onValueChange = { newPin = it },
                            label = { Text("PIN") },
                            placeholder = { Text("1234") },
                            singleLine = true,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = newEmail,
                        onValueChange = { newEmail = it; addError = null },
                        label = { Text("Work Email *") },
                        placeholder = { Text("d.thorne@spectrum-ehs.com") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = newRole,
                        onValueChange = { newRole = it },
                        label = { Text("Job Role / Trade") },
                        placeholder = { Text("Field Automation Specialist") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = newSite,
                        onValueChange = { newSite = it },
                        label = { Text("Assigned Site") },
                        placeholder = { Text("Spectrum Facility Delta") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = newIsAdmin,
                            onCheckedChange = { newIsAdmin = it }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "Grant Admin / Supervisor Access",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    if (addError != null) {
                        Text(
                            text = addError!!,
                            color = MaterialTheme.colorScheme.error,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newName.isBlank()) {
                            addError = "Please enter full name."
                            return@Button
                        }
                        if (newCode.isBlank()) {
                            addError = "Please enter an employee badge ID."
                            return@Button
                        }
                        if (newEmail.isBlank()) {
                            addError = "Please enter a work email address."
                            return@Button
                        }
                        viewModel.addTechnician(
                            name = newName,
                            employeeCode = newCode,
                            role = if (newRole.isNotBlank()) newRole else "Field Specialist",
                            assignedSite = if (newSite.isNotBlank()) newSite else "Spectrum Facility Delta",
                            email = newEmail,
                            pin = if (newPin.isNotBlank()) newPin else "1234",
                            isAdmin = newIsAdmin
                        )
                        showAddTechDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Amber500)
                ) {
                    Text("Add Technician", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showAddTechDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Confirmation dialog for removing a technician
    if (techToDelete != null) {
        val tech = techToDelete!!
        AlertDialog(
            onDismissRequest = { techToDelete = null },
            icon = {
                Icon(
                    Icons.Default.DeleteOutline,
                    contentDescription = null,
                    tint = Color(0xFFF43F5E),
                    modifier = Modifier.size(28.dp)
                )
            },
            title = {
                Text(
                    text = "Remove Field Technician?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to remove ${tech.name} (${tech.employeeCode}) from the active field roster? Their mobile access PIN will be revoked immediately.",
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.removeTechnician(tech.id)
                        techToDelete = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF43F5E))
                ) {
                    Text("Remove", color = Color.White, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { techToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun AdminTechnicianCard(
    tech: Technician,
    onDelete: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(if (tech.isAdmin) Amber500 else Color(0xFF334155)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = tech.name.split(" ").mapNotNull { it.firstOrNull() }.joinToString("").take(2),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = if (tech.isAdmin) Color(0xFF0F172A) else Color.White
                    )
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = tech.name,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (tech.isAdmin) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Amber500.copy(alpha = 0.2f)
                            ) {
                                Text(
                                    text = "ADMIN",
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Amber500,
                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                                )
                            }
                        }
                    }
                    Text(
                        text = "${tech.employeeCode} • ${tech.role}",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = "${tech.assignedSite} • ${tech.email}",
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }

            IconButton(
                onClick = onDelete,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    Icons.Default.DeleteOutline,
                    contentDescription = "Remove technician",
                    tint = Color(0xFFF43F5E),
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun AdminMetricCard(
    modifier: Modifier = Modifier,
    title: String,
    value: String,
    subtitle: String,
    accentColor: Color,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Box(
                    modifier = Modifier
                        .size(26.dp)
                        .clip(CircleShape)
                        .background(accentColor.copy(alpha = 0.15f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier.size(15.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = value,
                fontSize = 22.sp,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Text(
                text = subtitle,
                fontSize = 10.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

@Composable
private fun PersonnelRosterCard(record: ClockRecord) {
    val sdf = remember { SimpleDateFormat("HH:mm:ss", Locale.US) }
    val timeFormatted = remember(record.timestamp) { sdf.format(Date(record.timestamp)) }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Amber500),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = record.technicianName.split(" ").mapNotNull { it.firstOrNull() }.joinToString("").take(2),
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            color = Color(0xFF0F172A)
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = record.technicianName,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = record.facilityCode ?: "Facility Delta",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Color(0xFF10B981).copy(alpha = 0.15f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF10B981))
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = "ACTIVE",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF10B981)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Details line
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Clock-In Time: $timeFormatted",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Method: ${record.verificationMethod.name}",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Amber500
                )
            }

            if (record.notes.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "\"${record.notes}\"",
                    fontSize = 11.sp,
                    fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.9f)
                )
            }
        }
    }
}

@Composable
private fun AdminIncidentCard(
    incident: EHSIncident,
    onReview: () -> Unit,
    onUpdateStatus: (String) -> Unit
) {
    val riskColor = when (incident.riskLevel) {
        RiskLevel.CRITICAL_STOP_WORK -> Color(0xFFE11D48)
        RiskLevel.HIGH -> Color(0xFFF97316)
        RiskLevel.MEDIUM -> Amber500
        RiskLevel.LOW -> Color(0xFF38BDF8)
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
        border = androidx.compose.foundation.BorderStroke(1.dp, riskColor.copy(alpha = 0.4f))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = riskColor.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = incident.riskLevel.name.replace("_", " "),
                        color = riskColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = if (incident.status == "RESOLVED") Color(0xFF10B981).copy(alpha = 0.2f) else Amber500.copy(alpha = 0.2f)
                ) {
                    Text(
                        text = incident.status,
                        color = if (incident.status == "RESOLVED") Color(0xFF10B981) else Amber500,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = incident.title,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )

            Text(
                text = "Reported by: ${incident.technicianName}",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = incident.description,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.9f),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(
                    onClick = onReview,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Icon(Icons.Default.RateReview, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Review / Triage", fontSize = 11.sp)
                }

                if (incident.status != "RESOLVED") {
                    Spacer(modifier = Modifier.width(6.dp))
                    Button(
                        onClick = { onUpdateStatus("RESOLVED") },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Text("Resolve", fontSize = 11.sp, color = Color.White)
                    }
                }
            }
        }
    }
}
