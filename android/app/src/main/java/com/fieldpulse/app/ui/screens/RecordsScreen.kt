package com.fieldpulse.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fieldpulse.app.data.model.ClockRecord
import com.fieldpulse.app.data.model.SyncStatus
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.components.ServerSettingsDialog
import com.fieldpulse.app.ui.theme.Amber500
import com.fieldpulse.app.ui.theme.Emerald600
import com.fieldpulse.app.ui.theme.Rose600
import com.fieldpulse.app.util.PhotoUtils
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun RecordsScreen(viewModel: FieldPulseViewModel) {
    val records by viewModel.clockRecords.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    val dateFormat = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())

    var expandedRecordId by remember { mutableStateOf<String?>(null) }
    var showServerDialog by remember { mutableStateOf(false) }
    var serverUrlInput by remember(uiState.backendBaseUrl) { mutableStateOf(uiState.backendBaseUrl) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        // Top Header & Sync controls
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("Offline / Sync Queue", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text(
                    text = "${records.size} total entries • ${uiState.pendingSyncCount} pending upload",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = { showServerDialog = true },
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Icon(
                        Icons.Default.Settings,
                        contentDescription = "Server Settings",
                        tint = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Button(
                    onClick = { viewModel.triggerSyncNow() },
                    enabled = !uiState.isSyncing,
                    colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    if (uiState.isSyncing) {
                        CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = Color.Black)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Syncing...", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    } else {
                        Icon(Icons.Default.Sync, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (uiState.pendingSyncCount > 0) "Sync (${uiState.pendingSyncCount})" else "Sync Now", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Backend Connection Bar
        Surface(
            shape = RoundedCornerShape(10.dp),
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (uiState.serverConnectionStatus?.contains("Online") == true) Emerald600 else Amber500)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "API: ${uiState.backendBaseUrl}",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                TextButton(
                    onClick = { viewModel.testBackendConnection() },
                    contentPadding = PaddingValues(0.dp)
                ) {
                    Text("Test", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Amber500)
                }
            }
        }

        if (uiState.lastSyncMessage != null) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = uiState.lastSyncMessage ?: "",
                fontSize = 11.sp,
                color = if (uiState.pendingSyncCount == 0) Emerald600 else Amber500,
                fontWeight = FontWeight.Medium
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        if (records.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No shift records recorded yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(records) { record ->
                    val isExpanded = expandedRecordId == record.id
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { expandedRecordId = if (isExpanded) null else record.id },
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(
                                            modifier = Modifier
                                                .clip(CircleShape)
                                                .background(if (record.type == "CLOCK_IN") Emerald600 else Rose600)
                                                .padding(horizontal = 8.dp, vertical = 2.dp)
                                        ) {
                                            Text(
                                                text = if (record.type == "CLOCK_IN") "IN" else "OUT",
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 10.sp
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = dateFormat.format(Date(record.timestamp)),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = "${record.technicianName} • ${record.verificationMethod}",
                                        fontSize = 11.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (record.syncStatus == SyncStatus.SYNCED) {
                                        Icon(
                                            Icons.Default.CloudDone,
                                            contentDescription = "Synced",
                                            tint = Emerald600,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Synced", color = Emerald600, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    } else {
                                        Icon(
                                            Icons.Default.CloudOff,
                                            contentDescription = "Offline Pending",
                                            tint = Amber500,
                                            modifier = Modifier.size(20.dp)
                                        )
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Queued", color = Amber500, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Icon(
                                        if (isExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }

                            if (record.type == "CLOCK_IN") {
                                Divider(
                                    modifier = Modifier.padding(horizontal = 14.dp),
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f)
                                )
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp, vertical = 8.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            text = "4 Safety Photos Verified",
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Amber500
                                        )
                                        Text(" • ", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(
                                            text = "${record.safetyChecksPassed}/5 Safety Checks",
                                            fontSize = 10.sp,
                                            color = Emerald600,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    if (record.isLate) {
                                        Text(
                                            text = "LATE (${record.lateDurationMinutes}m)",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Rose600
                                        )
                                    } else {
                                        Text(
                                            text = "ON TIME",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Emerald600
                                        )
                                    }
                                }

                                // Expanded Evidence Photos Viewer
                                AnimatedVisibility(visible = isExpanded) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Text("Inspection Evidence Photos", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Amber500)
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            EvidencePhotoCard(title = "PPE", dataUrl = record.ppePhoto, modifier = Modifier.weight(1f))
                                            EvidencePhotoCard(title = "Tools", dataUrl = record.toolPhoto, modifier = Modifier.weight(1f))
                                            EvidencePhotoCard(title = "Vehicle", dataUrl = record.vehiclePhoto, modifier = Modifier.weight(1f))
                                            EvidencePhotoCard(title = "Ladder", dataUrl = record.ladderPhoto, modifier = Modifier.weight(1f))
                                        }

                                        if (record.notes.isNotBlank()) {
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = "Checklist Notes: ${record.notes}",
                                                fontSize = 10.sp,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Backend Server Settings Modal
    if (showServerDialog) {
        ServerSettingsDialog(
            viewModel = viewModel,
            onDismiss = { showServerDialog = false }
        )
    }
}

@Composable
fun EvidencePhotoCard(title: String, dataUrl: String?, modifier: Modifier = Modifier) {
    val bitmap = remember(dataUrl) { PhotoUtils.decodeBase64Bitmap(dataUrl) }

    Column(modifier = modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFF0F172A))
                .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) {
            if (bitmap != null) {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else if (!dataUrl.isNullOrBlank()) {
                Icon(Icons.Default.CloudDone, contentDescription = null, tint = Emerald600, modifier = Modifier.size(20.dp))
            } else {
                Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color(0xFF64748B), modifier = Modifier.size(16.dp))
            }
        }
        Spacer(modifier = Modifier.height(3.dp))
        Text(text = title, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
