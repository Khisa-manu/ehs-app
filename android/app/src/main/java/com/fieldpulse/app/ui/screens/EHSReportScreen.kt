package com.fieldpulse.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fieldpulse.app.data.model.IncidentType
import com.fieldpulse.app.data.model.RiskLevel
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.theme.Amber500
import com.fieldpulse.app.ui.theme.Emerald600
import com.fieldpulse.app.ui.theme.Rose600
import com.fieldpulse.app.util.PhotoUtils

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EHSReportScreen(viewModel: FieldPulseViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var title by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var immediateAction by remember { mutableStateOf("") }
    var selectedType by remember { mutableStateOf(IncidentType.HAZARD_IDENTIFIED) }
    var selectedRisk by remember { mutableStateOf(RiskLevel.MEDIUM) }
    var submittedMessage by remember { mutableStateOf<String?>(null) }
    var attachedPhotoBase64 by remember { mutableStateOf<String?>(null) }

    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.Warning,
                contentDescription = null,
                tint = Amber500,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "EHS Safety Observation & Incident",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Observation Title") },
            placeholder = { Text("e.g., Damaged valve guard on pump unit 3") },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        Text("Incident Category", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = selectedType == IncidentType.HAZARD_IDENTIFIED,
                onClick = { selectedType = IncidentType.HAZARD_IDENTIFIED },
                label = { Text("Hazard", fontSize = 11.sp) }
            )
            FilterChip(
                selected = selectedType == IncidentType.NEAR_MISS,
                onClick = { selectedType = IncidentType.NEAR_MISS },
                label = { Text("Near Miss", fontSize = 11.sp) }
            )
            FilterChip(
                selected = selectedType == IncidentType.CHEMICAL_SPILL,
                onClick = { selectedType = IncidentType.CHEMICAL_SPILL },
                label = { Text("Spill", fontSize = 11.sp) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text("Risk Severity Level", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(
                selected = selectedRisk == RiskLevel.LOW,
                onClick = { selectedRisk = RiskLevel.LOW },
                label = { Text("Low", fontSize = 11.sp) }
            )
            FilterChip(
                selected = selectedRisk == RiskLevel.MEDIUM,
                onClick = { selectedRisk = RiskLevel.MEDIUM },
                label = { Text("Medium", fontSize = 11.sp) }
            )
            FilterChip(
                selected = selectedRisk == RiskLevel.HIGH,
                onClick = { selectedRisk = RiskLevel.HIGH },
                label = { Text("High", fontSize = 11.sp) }
            )
            FilterChip(
                selected = selectedRisk == RiskLevel.CRITICAL_STOP_WORK,
                onClick = { selectedRisk = RiskLevel.CRITICAL_STOP_WORK },
                label = { Text("Stop Work", fontSize = 11.sp) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = description,
            onValueChange = { description = it },
            label = { Text("Detailed Observation") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 3
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = immediateAction,
            onValueChange = { immediateAction = it },
            label = { Text("Immediate Corrective Action") },
            placeholder = { Text("e.g., Barricaded zone and notified plant control") },
            modifier = Modifier.fillMaxWidth(),
            minLines = 2
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Camera capture button & preview
        if (attachedPhotoBase64 != null) {
            val bitmap = remember(attachedPhotoBase64) { PhotoUtils.decodeBase64Bitmap(attachedPhotoBase64) }
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
            ) {
                Box(modifier = Modifier.fillMaxSize()) {
                    if (bitmap != null) {
                        Image(
                            bitmap = bitmap.asImageBitmap(),
                            contentDescription = "Incident Evidence Photo",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    IconButton(
                        onClick = { attachedPhotoBase64 = null },
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(8.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.Black.copy(alpha = 0.7f))
                    ) {
                        Icon(Icons.Default.Close, contentDescription = "Remove Photo", tint = Color.White)
                    }
                }
            }
        } else {
            OutlinedButton(
                onClick = {
                    val photoBase64 = PhotoUtils.generateEvidencePhotoBase64(
                        context = context,
                        requirement = PhotoRequirement.PPE,
                        technicianName = uiState.currentTechnician.name,
                        employeeCode = uiState.currentTechnician.employeeCode,
                        assignedSite = uiState.currentTechnician.assignedSite,
                        latitude = uiState.currentLatitude,
                        longitude = uiState.currentLongitude,
                        accuracyMeters = uiState.gpsAccuracyMeters
                    )
                    attachedPhotoBase64 = photoBase64
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Attach Site Photo Evidence")
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = {
                if (title.isNotBlank()) {
                    viewModel.submitEHSIncident(
                        title = title,
                        type = selectedType,
                        risk = selectedRisk,
                        description = description,
                        actionTaken = immediateAction,
                        photoDataUrl = attachedPhotoBase64
                    )
                    title = ""
                    description = ""
                    immediateAction = ""
                    attachedPhotoBase64 = null
                    submittedMessage = "Report logged and queued for synchronization."
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = Amber500),
            shape = RoundedCornerShape(14.dp)
        ) {
            Icon(Icons.Default.Send, contentDescription = null, tint = Color.Black)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Submit EHS Observation", color = Color.Black, fontWeight = FontWeight.Bold)
        }

        if (submittedMessage != null) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = submittedMessage!!,
                color = Color(0xFF059669),
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp
            )
        }
    }
}
