package com.fieldpulse.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudDone
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.screens.AdminDashboardScreen
import com.fieldpulse.app.ui.screens.ClockInScreen
import com.fieldpulse.app.ui.screens.EHSReportScreen
import com.fieldpulse.app.ui.screens.LoginScreen
import com.fieldpulse.app.ui.screens.RecordsScreen
import com.fieldpulse.app.ui.theme.FieldPulseTheme
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.AdminPanelSettings

class MainActivity : ComponentActivity() {
    private val viewModel: FieldPulseViewModel by viewModels()

    @OptIn(ExperimentalMaterial3Api::class)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FieldPulseTheme {
                val uiState by viewModel.uiState.collectAsState()

                if (!uiState.isLoggedIn) {
                    LoginScreen(viewModel)
                } else {
                    Scaffold(
                        modifier = Modifier.fillMaxSize(),
                        topBar = {
                            TopAppBar(
                                title = {
                                    Column {
                                        Text(
                                            text = "Spectrum Engineering EHS",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 16.sp
                                        )
                                        Text(
                                            text = "${uiState.currentTechnician.name} • ${uiState.currentTechnician.employeeCode}",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                },
                                actions = {
                                    IconButton(onClick = { viewModel.toggleOfflineSimulation() }) {
                                        Icon(
                                            if (uiState.isOfflineMode) Icons.Default.CloudOff else Icons.Default.CloudDone,
                                            contentDescription = "Connection Status",
                                            tint = if (uiState.isOfflineMode) Color(0xFFF43F5E) else Color(0xFF10B981)
                                        )
                                    }
                                    IconButton(onClick = { viewModel.setShowLogoutConfirm(true) }) {
                                        Icon(
                                            Icons.Default.ExitToApp,
                                            contentDescription = "Log Out",
                                            tint = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                },
                                colors = TopAppBarDefaults.topAppBarColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant
                                )
                            )
                        },
                        bottomBar = {
                            val isAdmin = uiState.currentTechnician.isAdmin
                            NavigationBar {
                                if (isAdmin) {
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 0,
                                        onClick = { viewModel.setTab(0) },
                                        icon = { Icon(Icons.Default.Dashboard, contentDescription = "Admin Dashboard") },
                                        label = { Text("Admin") }
                                    )
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 1,
                                        onClick = { viewModel.setTab(1) },
                                        icon = { Icon(Icons.Default.Schedule, contentDescription = "Clock In") },
                                        label = { Text("Clock In") }
                                    )
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 2,
                                        onClick = { viewModel.setTab(2) },
                                        icon = { Icon(Icons.Default.Warning, contentDescription = "EHS Safety") },
                                        label = { Text("EHS Safety") }
                                    )
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 3,
                                        onClick = { viewModel.setTab(3) },
                                        icon = { Icon(Icons.Default.ListAlt, contentDescription = "Records") },
                                        label = { Text("Records") }
                                    )
                                } else {
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 0,
                                        onClick = { viewModel.setTab(0) },
                                        icon = { Icon(Icons.Default.Schedule, contentDescription = "Clock In") },
                                        label = { Text("Clock In") }
                                    )
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 1,
                                        onClick = { viewModel.setTab(1) },
                                        icon = { Icon(Icons.Default.Warning, contentDescription = "EHS Safety") },
                                        label = { Text("EHS Safety") }
                                    )
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 2,
                                        onClick = { viewModel.setTab(2) },
                                        icon = { Icon(Icons.Default.ListAlt, contentDescription = "Records") },
                                        label = { Text("Records") }
                                    )
                                    NavigationBarItem(
                                        selected = uiState.activeTab == 3,
                                        onClick = { viewModel.setTab(3) },
                                        icon = { Icon(Icons.Default.AdminPanelSettings, contentDescription = "Admin Portal") },
                                        label = { Text("Admin") }
                                    )
                                }
                            }
                        }
                    ) { innerPadding ->
                        Surface(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(innerPadding),
                            color = MaterialTheme.colorScheme.background
                        ) {
                            val isAdmin = uiState.currentTechnician.isAdmin
                            if (isAdmin) {
                                when (uiState.activeTab) {
                                    0 -> AdminDashboardScreen(viewModel)
                                    1 -> ClockInScreen(viewModel)
                                    2 -> EHSReportScreen(viewModel)
                                    3 -> RecordsScreen(viewModel)
                                    else -> AdminDashboardScreen(viewModel)
                                }
                            } else {
                                when (uiState.activeTab) {
                                    0 -> ClockInScreen(viewModel)
                                    1 -> EHSReportScreen(viewModel)
                                    2 -> RecordsScreen(viewModel)
                                    3 -> AdminDashboardScreen(viewModel)
                                    else -> ClockInScreen(viewModel)
                                }
                            }
                        }
                    }

                    // Logout Confirmation Dialog
                    if (uiState.showLogoutConfirm) {
                        AlertDialog(
                            onDismissRequest = { viewModel.setShowLogoutConfirm(false) },
                            icon = { Icon(Icons.Default.ExitToApp, contentDescription = null) },
                            title = { Text("Log Out of Spectrum EHS?") },
                            text = {
                                Text("Are you sure you want to sign out? All offline reports and clock-in logs remain securely cached on this device.")
                            },
                            confirmButton = {
                                Button(
                                    onClick = { viewModel.logout() },
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                                ) {
                                    Text("Log Out")
                                }
                            },
                            dismissButton = {
                                OutlinedButton(onClick = { viewModel.setShowLogoutConfirm(false) }) {
                                    Text("Cancel")
                                }
                            }
                        )
                    }
                }
            }
        }
    }
}
