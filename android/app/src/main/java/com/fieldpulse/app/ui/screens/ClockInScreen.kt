package com.fieldpulse.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fieldpulse.app.data.model.SyncStatus
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.theme.Amber500
import com.fieldpulse.app.ui.theme.Emerald600
import com.fieldpulse.app.ui.theme.Rose600
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun ClockInScreen(viewModel: FieldPulseViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    var isWizardOpen by remember { mutableStateOf(false) }

    // If the Clock-In Wizard is launched, render the wizard full-screen
    if (isWizardOpen) {
        ClockInWizard(
            viewModel = viewModel,
            onCancel = { isWizardOpen = false },
            onCompleted = { isWizardOpen = false }
        )
        return
    }

    val scrollState = rememberScrollState()
    val timeFormat = remember { SimpleDateFormat("HH:mm:ss a", Locale.getDefault()) }
    var currentTimeString by remember { mutableStateOf(timeFormat.format(Date())) }
    var clockOutNotes by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        while (true) {
            currentTimeString = timeFormat.format(Date())
            kotlinx.coroutines.delay(1000)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A))
            .verticalScroll(scrollState)
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Technician Profile Header Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(20.dp),
            border = CardDefaults.outlinedCardBorder().copy(
                brush = Brush.horizontalGradient(listOf(Color(0xFF334155), Color(0xFF334155)))
            )
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
                                .size(44.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(Amber500),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = uiState.currentTechnician.name.split(" ").mapNotNull { it.firstOrNull()?.toString() }.joinToString(""),
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = Color(0xFF0F172A)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = uiState.currentTechnician.name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = Color.White
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = uiState.currentTechnician.employeeCode,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold,
                                    color = Amber500
                                )
                                Text(" • ", color = Color(0xFF64748B), fontSize = 11.sp)
                                Text(
                                    text = uiState.currentTechnician.role,
                                    fontSize = 11.sp,
                                    color = Color(0xFF94A3B8)
                                )
                            }
                        }
                    }

                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(if (uiState.isClockedIn) Emerald600.copy(alpha = 0.2f) else Color(0xFF334155))
                            .border(
                                1.dp,
                                if (uiState.isClockedIn) Emerald600 else Color(0xFF475569),
                                CircleShape
                            )
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = if (uiState.isClockedIn) "ON DUTY" else "OFF DUTY",
                            color = if (uiState.isClockedIn) Emerald600 else Color(0xFF94A3B8),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF0F172A))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = Amber500, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = uiState.currentTechnician.assignedSite,
                            fontSize = 11.sp,
                            color = Color(0xFFCBD5E1)
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("Expected: ", fontSize = 10.sp, color = Color(0xFF64748B))
                        Text("08:00 AM", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White, fontFamily = FontFamily.Monospace)
                    }
                }
            }
        }

        // CONDITIONAL RENDERING: CLOCKED IN vs NOT CLOCKED IN
        if (uiState.isClockedIn) {
            // ==========================================
            // ALREADY CLOCKED IN STATE
            // ==========================================
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(24.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(listOf(Emerald600.copy(alpha = 0.5f), Emerald600.copy(alpha = 0.5f)))
                )
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    // Top Status Badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(Emerald600.copy(alpha = 0.2f))
                                .border(1.dp, Emerald600, RoundedCornerShape(8.dp))
                                .padding(horizontal = 10.dp, vertical = 5.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(15.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("CLOCKED IN FOR TODAY", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = Emerald600)
                            }
                        }

                        val isLate = uiState.activeClockRecord?.isLate == true
                        val lateMins = uiState.activeClockRecord?.lateDurationMinutes ?: 0
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isLate) Rose600.copy(alpha = 0.2f) else Emerald600.copy(alpha = 0.2f))
                                .border(1.dp, if (isLate) Rose600 else Emerald600, RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = if (isLate) "LATE (${lateMins}m)" else "ON TIME",
                                color = if (isLate) Rose600 else Emerald600,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    // Official Clock-In Timestamp (The core business rule!)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color(0xFF0F172A))
                            .border(1.dp, Color(0xFF334155), RoundedCornerShape(16.dp))
                            .padding(16.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("OFFICIAL ARRIVAL TIME", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF94A3B8), fontFamily = FontFamily.Monospace)
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Amber500.copy(alpha = 0.15f))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text("DEVICE RECORDED", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Amber500, fontFamily = FontFamily.Monospace)
                                }
                            }

                            Spacer(modifier = Modifier.height(6.dp))

                            val clockTimestamp = uiState.activeClockRecord?.timestamp ?: uiState.lastClockTime ?: System.currentTimeMillis()
                            val displayTime = SimpleDateFormat("hh:mm:ss a", Locale.getDefault()).format(Date(clockTimestamp))
                            val displayDate = SimpleDateFormat("EEEE, MMMM d, yyyy", Locale.getDefault()).format(Date(clockTimestamp))

                            Text(
                                text = displayTime,
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = displayDate,
                                fontSize = 12.sp,
                                color = Color(0xFF94A3B8)
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            // Sync Status Banner
                            val isOfflineSync = uiState.activeClockRecord?.syncStatus == SyncStatus.PENDING_OFFLINE || uiState.isOfflineMode
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    if (isOfflineSync) Icons.Default.CloudOff else Icons.Default.CloudDone,
                                    contentDescription = null,
                                    tint = if (isOfflineSync) Amber500 else Emerald600,
                                    modifier = Modifier.size(14.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (isOfflineSync) "Offline Mode (Queued in local SQLite database)" else "Online Direct Sync Verified",
                                    fontSize = 11.sp,
                                    color = if (isOfflineSync) Amber500 else Emerald600,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }

                    // GPS Coordinates & Facility Badge
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0F172A))
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Rose600, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = "${uiState.currentLatitude}, ${uiState.currentLongitude}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                        fontFamily = FontFamily.Monospace
                                    )
                                    Text(
                                        text = "${uiState.facilityCode} • Accuracy ±${uiState.gpsAccuracyMeters}m",
                                        fontSize = 10.sp,
                                        color = Color(0xFF94A3B8)
                                    )
                                }
                            }
                            Text(
                                text = "GEOFENCE PASS",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Emerald600,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }

                    // 4 Verified Photos Gallery
                    Column {
                        Text(
                            text = "Verified Safety Photos (4 Required)",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFCBD5E1)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            listOf(
                                "PPE Selfie" to (uiState.activeClockRecord?.ppePhoto ?: "STAMP-PPE"),
                                "Tools Check" to (uiState.activeClockRecord?.toolPhoto ?: "STAMP-TOOLS"),
                                "Vehicle 360" to (uiState.activeClockRecord?.vehiclePhoto ?: "STAMP-VEHICLE"),
                                "Ladder Check" to (uiState.activeClockRecord?.ladderPhoto ?: "STAMP-LADDER")
                            ).forEach { (label, stamp) ->
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF0F172A))
                                        .border(1.dp, Emerald600.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                                        .padding(6.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(20.dp))
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = label,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Amber500,
                                            textAlign = TextAlign.Center,
                                            lineHeight = 11.sp
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // 5-Point Safety Compliance Status
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0F172A))
                            .padding(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("EHS Safety Compliance:", fontSize = 12.sp, color = Color(0xFF94A3B8))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Shield, contentDescription = null, tint = Emerald600, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("5 / 5 Mandatory Passed", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Emerald600)
                            }
                        }
                    }

                    // Clock Out Section
                    OutlinedTextField(
                        value = clockOutNotes,
                        onValueChange = { clockOutNotes = it },
                        label = { Text("Shift Completion Notes (Optional)", fontSize = 11.sp) },
                        placeholder = { Text("e.g. Completed scheduled work at transformer B, site secured.", fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Amber500,
                            unfocusedBorderColor = Color(0xFF475569),
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )

                    Button(
                        onClick = {
                            viewModel.clockOut(clockOutNotes)
                            clockOutNotes = ""
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Rose600),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("CLOCK OUT OF SHIFT", fontSize = 15.sp, fontWeight = FontWeight.ExtraBold, color = Color.White)
                    }
                }
            }
        } else {
            // ==========================================
            // NOT CLOCKED IN STATE - CALL TO ACTION
            // ==========================================
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(24.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(listOf(Color(0xFF334155), Color(0xFF334155)))
                )
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Amber Clock Icon Container
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(Amber500.copy(alpha = 0.12f))
                            .border(1.dp, Amber500.copy(alpha = 0.35f), RoundedCornerShape(20.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.AccessTime,
                            contentDescription = null,
                            tint = Amber500,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    // Explicit Prompt Text Headings
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "STATUS: NOT CLOCKED IN",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Rose600,
                            fontFamily = FontFamily.Monospace,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Daily Clock-In & EHS Report",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Complete your 4 mandatory photos (PPE, Tools, Vehicle, Ladder) and 5-point safety inspection to record your official arrival.",
                            fontSize = 12.sp,
                            color = Color(0xFF94A3B8),
                            textAlign = TextAlign.Center,
                            lineHeight = 18.sp,
                            modifier = Modifier.padding(horizontal = 8.dp)
                        )
                    }

                    // Large Touch Target Action Button: START TODAY'S CLOCK-IN
                    Button(
                        onClick = { isWizardOpen = true },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(58.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                        shape = RoundedCornerShape(16.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                    ) {
                        Icon(
                            Icons.Default.PlayArrow,
                            contentDescription = null,
                            tint = Color(0xFF0F172A),
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "START TODAY'S CLOCK-IN",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF0F172A),
                            letterSpacing = 0.5.sp
                        )
                    }

                    // Helper Badges
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("• Est. Time: 3 mins", fontSize = 11.sp, color = Color(0xFF64748B))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("• Offline Supported", fontSize = 11.sp, color = Color(0xFF64748B))
                        Spacer(modifier = Modifier.width(10.dp))
                        Text("• GPS Watermarked", fontSize = 11.sp, color = Color(0xFF64748B))
                    }
                }
            }

            // Pre-Flight Safety Checklist Summary Cards
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(20.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "MANDATORY PRE-SHIFT VERIFICATIONS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Amber500,
                        fontFamily = FontFamily.Monospace
                    )

                    listOf(
                        "1. PPE Selfie" to "Hard Hat, Safety Glasses, High-Vis Vest, Steel-Toe Boots",
                        "2. Tools Check" to "1000V Insulated hand tools, calibrated meters, cord checks",
                        "3. Vehicle 360" to "Walk-around, tires, fluid inspection, warning triangles",
                        "4. Ladder Check" to "Duty rating IA/IAA, fiberglass rails, non-skid feet",
                        "5. Safety Inspection" to "5-point OSHA compliance check & fit-for-duty attestation"
                    ).forEach { (title, desc) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF0F172A))
                                .padding(10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .background(Amber500.copy(alpha = 0.15f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Check, contentDescription = null, tint = Amber500, modifier = Modifier.size(14.dp))
                            }
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(title, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                Text(desc, fontSize = 10.sp, color = Color(0xFF94A3B8))
                            }
                        }
                    }
                }
            }

            // Offline Simulation Helper Tip
            Surface(
                color = Color(0xFF1E293B),
                shape = RoundedCornerShape(16.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(listOf(Amber500.copy(alpha = 0.3f), Amber500.copy(alpha = 0.3f)))
                )
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Amber500, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text("Want to test offline sync?", fontWeight = FontWeight.Bold, color = Color.White, fontSize = 12.sp)
                            Text(
                                text = "Toggle the Offline Mode switch below to simulate a cellular dead zone, complete clock-in at 07:42 AM, and then reconnect to sync!",
                                fontSize = 11.sp,
                                color = Color(0xFF94A3B8),
                                lineHeight = 16.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (uiState.isOfflineMode) "Offline Mode: ACTIVE (Queuing to Room)" else "Offline Mode: Disabled (Direct Sync)",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (uiState.isOfflineMode) Amber500 else Color(0xFF94A3B8)
                        )
                        Switch(
                            checked = uiState.isOfflineMode,
                            onCheckedChange = { viewModel.toggleOfflineSimulation() }
                        )
                    }
                }
            }
        }
    }
}
