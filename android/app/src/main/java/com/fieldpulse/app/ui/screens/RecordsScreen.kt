package com.fieldpulse.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
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
fun RecordsScreen(viewModel: FieldPulseViewModel) {
    val records by viewModel.clockRecords.collectAsState()
    val uiState by viewModel.uiState.collectAsState()
    val dateFormat = SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
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

            if (uiState.pendingSyncCount > 0) {
                Button(
                    onClick = { viewModel.triggerSyncNow() },
                    colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Sync, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Sync Now", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (records.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No shift records recorded yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(records) { record ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(14.dp)
                    ) {
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
                                    Text("Synced", color = Emerald600, fontSize = 11.sp)
                                } else {
                                    Icon(
                                        Icons.Default.CloudOff,
                                        contentDescription = "Offline Pending",
                                        tint = Amber500,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Queued", color = Amber500, fontSize = 11.sp)
                                }
                            }
                        }

                        if (record.type == "CLOCK_IN") {
                            Divider(modifier = Modifier.padding(horizontal = 14.dp), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.08f))
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
                        }
                    }
                }
            }
        }
    }
}
