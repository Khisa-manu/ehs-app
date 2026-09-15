package com.fieldpulse.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fieldpulse.app.data.model.Technician
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.theme.Amber500

@Composable
fun LoginScreen(viewModel: FieldPulseViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val allTechs by viewModel.technicians.collectAsState()
    val activeTechList = if (allTechs.isNotEmpty()) allTechs else Technician.SPECTRUM_TECHNICIANS
    val focusManager = LocalFocusManager.current

    var employeeId by remember { mutableStateOf("SE-7842") }
    var pin by remember { mutableStateOf("7842") }
    var passwordVisible by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(16.dp))

        // Spectrum Engineering Emblem / Brand Badge
        Box(
            modifier = Modifier
                .size(76.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(Amber500),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "SE",
                    fontWeight = FontWeight.Black,
                    fontSize = 28.sp,
                    color = Color(0xFF0F172A),
                    letterSpacing = 1.sp
                )
                Text(
                    text = "EHS",
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 10.sp,
                    color = Color(0xFF0F172A)
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Spectrum Engineering EHS",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground,
            textAlign = TextAlign.Center
        )

        Text(
            text = "Field Technician & Safety Operations Portal",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(28.dp))

        // Main Login Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp)
            ) {
                Text(
                    text = "Technician Sign In",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "Enter your badge ID or select a technician below",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Error Message if present
                if (uiState.loginError != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 14.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.error,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = uiState.loginError ?: "",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onErrorContainer
                            )
                        }
                    }
                }

                // Employee ID / Email Input
                OutlinedTextField(
                    value = employeeId,
                    onValueChange = {
                        employeeId = it
                        viewModel.clearLoginError()
                    },
                    label = { Text("Badge ID or Email") },
                    placeholder = { Text("e.g. SE-7842") },
                    leadingIcon = {
                        Icon(Icons.Default.Person, contentDescription = "User")
                    },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Text,
                        imeAction = ImeAction.Next
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // PIN / Password Input
                OutlinedTextField(
                    value = pin,
                    onValueChange = {
                        pin = it
                        viewModel.clearLoginError()
                    },
                    label = { Text("Safety PIN or Password") },
                    placeholder = { Text("Enter PIN (demo: 7842)") },
                    leadingIcon = {
                        Icon(Icons.Default.Lock, contentDescription = "Password")
                    },
                    trailingIcon = {
                        IconButton(onClick = { passwordVisible = !passwordVisible }) {
                            Icon(
                                if (passwordVisible) Icons.Default.LockOpen else Icons.Default.Lock,
                                contentDescription = if (passwordVisible) "Hide PIN" else "Show PIN"
                            )
                        }
                    },
                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.NumberPassword,
                        imeAction = ImeAction.Done
                    ),
                    keyboardActions = KeyboardActions(
                        onDone = {
                            focusManager.clearFocus()
                            viewModel.loginWithCredentials(employeeId, pin)
                        }
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                // Sign In Button
                Button(
                    onClick = {
                        focusManager.clearFocus()
                        viewModel.loginWithCredentials(employeeId, pin)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Amber500)
                ) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF0F172A),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Sign In to Spectrum EHS",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color(0xFF0F172A)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Offline Notice
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Color(0xFF10B981),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Local offline authorization enabled for field zones",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Quick Sign-In Selection for Field Personnel & Admins
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "FAST BADGE SELECT (DEMO & TESTING)",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Tap to One-Click Sign In",
                fontSize = 10.sp,
                color = Amber500,
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(modifier = Modifier.height(10.dp))

        // 1. EHS Admins & Supervisors
        Text(
            text = "EHS LEADERSHIP & ADMINS",
            fontSize = 10.sp,
            fontWeight = FontWeight.ExtraBold,
            color = Amber500,
            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
        )

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            activeTechList.filter { it.isAdmin }.forEach { tech ->
                QuickTechCard(
                    tech = tech,
                    isSelected = employeeId.equals(tech.employeeCode, ignoreCase = true),
                    onClick = {
                        employeeId = tech.employeeCode
                        pin = tech.pin
                        viewModel.clearLoginError()
                        viewModel.quickLogin(tech)
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // 2. Field Operations Technicians
        Text(
            text = "FIELD OPERATIONS TECHNICIANS",
            fontSize = 10.sp,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)
        )

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            activeTechList.filter { !it.isAdmin }.forEach { tech ->
                QuickTechCard(
                    tech = tech,
                    isSelected = employeeId.equals(tech.employeeCode, ignoreCase = true),
                    onClick = {
                        employeeId = tech.employeeCode
                        pin = tech.pin
                        viewModel.clearLoginError()
                        viewModel.quickLogin(tech)
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
private fun QuickTechCard(
    tech: Technician,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .then(
                if (isSelected) Modifier.border(1.5.dp, Amber500, RoundedCornerShape(12.dp))
                else if (tech.isAdmin) Modifier.border(1.dp, Amber500.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                else Modifier
            ),
        color = if (tech.isAdmin) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.85f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(if (tech.isAdmin || isSelected) Amber500 else MaterialTheme.colorScheme.surface),
                contentAlignment = Alignment.Center
            ) {
                if (tech.isAdmin) {
                    Icon(
                        Icons.Default.AdminPanelSettings,
                        contentDescription = "Admin",
                        tint = Color(0xFF0F172A),
                        modifier = Modifier.size(20.dp)
                    )
                } else {
                    Text(
                        text = tech.name.split(" ").mapNotNull { it.firstOrNull() }.joinToString("").take(2),
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = if (isSelected) Color(0xFF0F172A) else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = tech.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
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
                                color = Amber500,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.ExtraBold,
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
            }

            Button(
                onClick = onClick,
                shape = RoundedCornerShape(8.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (tech.isAdmin) Amber500 else MaterialTheme.colorScheme.surface
                ),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                modifier = Modifier.height(32.dp)
            ) {
                Text(
                    text = if (tech.isAdmin) "Admin Login" else "Tap to Sign In",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (tech.isAdmin) Color(0xFF0F172A) else MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}
