package com.fieldpulse.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.theme.Amber500
import com.fieldpulse.app.ui.theme.Emerald600
import com.fieldpulse.app.ui.theme.Rose600

@Composable
fun ServerSettingsDialog(
    viewModel: FieldPulseViewModel,
    onDismiss: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    var urlInput by remember(uiState.backendBaseUrl) { mutableStateOf(uiState.backendBaseUrl) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Dns, contentDescription = null, tint = Amber500, modifier = Modifier.size(22.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Backend Server API Settings", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Configure the backend host URL where PHP and SQLite endpoints are served.",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = urlInput,
                    onValueChange = { urlInput = it },
                    label = { Text("Base Server URL") },
                    placeholder = { Text("http://192.168.1.100:3000") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 13.sp)
                )

                // Quick Presets
                Text(
                    text = "Quick Presets:",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    SuggestionChip(
                        onClick = { urlInput = "http://10.0.2.2:3000" },
                        label = { Text("Emulator", fontSize = 10.sp) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = if (urlInput.contains("10.0.2.2")) Amber500.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
                        )
                    )

                    SuggestionChip(
                        onClick = {
                            if (!urlInput.contains("192.168.")) {
                                urlInput = "http://192.168.1.100:3000"
                            }
                        },
                        label = { Text("Wi-Fi LAN", fontSize = 10.sp) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = if (urlInput.contains("192.168.")) Amber500.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
                        )
                    )

                    SuggestionChip(
                        onClick = { urlInput = "https://yourdomain.com/cpanel-backend" },
                        label = { Text("cPanel Host", fontSize = 10.sp) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = if (urlInput.contains("cpanel")) Amber500.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surface
                        )
                    )
                }

                // Physical Device Notice
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF1E293B))
                        .padding(10.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Wifi, contentDescription = null, tint = Amber500, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "PHYSICAL DEVICE SETUP GUIDE",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber500,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                        Text(
                            text = "• 10.0.2.2 only works inside Android Studio Emulator.\n• For physical phone APK: Ensure phone & PC are on the same Wi-Fi, then enter your PC's IP (e.g. http://192.168.x.x:3000).\n• For production: Enter your HTTPS domain.",
                            fontSize = 10.sp,
                            lineHeight = 14.sp,
                            color = Color(0xFFCBD5E1)
                        )
                    }
                }

                // Test Connection Status Bar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = {
                            viewModel.updateBackendUrl(urlInput)
                            viewModel.testBackendConnection()
                        },
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Test Connection", fontSize = 11.sp)
                    }

                    if (uiState.serverConnectionStatus != null) {
                        val isOnline = uiState.serverConnectionStatus?.contains("Online") == true
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                if (isOnline) Icons.Default.CloudDone else Icons.Default.CloudOff,
                                contentDescription = null,
                                tint = if (isOnline) Emerald600 else Rose600,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isOnline) "Online" else "Offline",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isOnline) Emerald600 else Rose600
                            )
                        }
                    }
                }

                if (!uiState.serverConnectionStatus.isNullOrBlank()) {
                    Text(
                        text = uiState.serverConnectionStatus ?: "",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        lineHeight = 14.sp
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    viewModel.updateBackendUrl(urlInput)
                    onDismiss()
                },
                colors = ButtonDefaults.buttonColors(containerColor = Amber500)
            ) {
                Text("Save & Apply", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close")
            }
        }
    )
}
