package com.fieldpulse.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fieldpulse.app.data.model.ShiftType
import com.fieldpulse.app.data.model.VerificationMethod
import com.fieldpulse.app.ui.FieldPulseViewModel
import com.fieldpulse.app.ui.theme.Amber500
import com.fieldpulse.app.ui.theme.Emerald600
import com.fieldpulse.app.ui.theme.Rose600
import com.fieldpulse.app.util.PhotoUtils
import java.text.SimpleDateFormat
import java.util.*

enum class PhotoRequirement(
    val title: String,
    val shortLabel: String,
    val description: String,
    val category: String
) {
    PPE(
        title = "1. Personal Protective Equipment (PPE)",
        shortLabel = "PPE Selfie",
        description = "Take an upper torso photo showing your approved hard hat, safety glasses with side shields, and high-visibility vest.",
        category = "HEAD & EYE PROTECTION"
    ),
    TOOLS(
        title = "2. Tools & Machinery Verification",
        shortLabel = "Tools Check",
        description = "Photograph your primary power tools and cord assemblies to prove safety guards are attached and leads are free of cuts or frays.",
        category = "ELECTRICAL & MECHANICAL"
    ),
    VEHICLE(
        title = "3. Vehicle Fleet 360 Check",
        shortLabel = "Vehicle 360",
        description = "Photograph the front quarter of your service vehicle verifying clean lights, sound tires, warning triangles, and clear mirrors.",
        category = "FLEET & ROAD SAFETY"
    ),
    LADDER(
        title = "4. Ladder & Height Safety Check",
        shortLabel = "Ladder Check",
        description = "Photograph the ladder showing duty rating label (Type IA/IAA), non-skid rubber feet, and clean fiberglass rungs.",
        category = "FALL PREVENTION"
    )
}

data class EHSQuestionItem(
    val id: String,
    val category: String,
    val text: String,
    var isCompliant: Boolean = true,
    var correctiveNotes: String = ""
)

@Composable
fun ClockInWizard(
    viewModel: FieldPulseViewModel,
    onCancel: () -> Unit,
    onCompleted: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    var currentStep by remember { mutableStateOf(1) }
    val totalSteps = 7

    // Captured photo references
    var ppePhotoUri by remember { mutableStateOf<String?>(null) }
    var toolsPhotoUri by remember { mutableStateOf<String?>(null) }
    var vehiclePhotoUri by remember { mutableStateOf<String?>(null) }
    var ladderPhotoUri by remember { mutableStateOf<String?>(null) }

    // Active camera modal state
    var activeCameraType by remember { mutableStateOf<PhotoRequirement?>(null) }

    // 5-point EHS questions
    val questions = remember {
        mutableStateListOf(
            EHSQuestionItem(
                id = "ehs-1",
                category = "PERSONAL SAFETY",
                text = "Are all personal protective equipment (hard hat, safety glasses, gloves, boots) inspected and worn?",
                isCompliant = true
            ),
            EHSQuestionItem(
                id = "ehs-2",
                category = "ELECTRICAL & LOTO",
                text = "Is equipment verified de-energized, lockout/tagout applied, or live work permit authorized?",
                isCompliant = true
            ),
            EHSQuestionItem(
                id = "ehs-3",
                category = "WORK ENVIRONMENT",
                text = "Are slip, trip, fall hazards, overhead obstructions, and wet/extreme weather conditions cleared?",
                isCompliant = true
            ),
            EHSQuestionItem(
                id = "ehs-4",
                category = "EMERGENCY READY",
                text = "Is the vehicle first-aid kit accessible, fire extinguisher charged, and emergency muster point identified?",
                isCompliant = true
            ),
            EHSQuestionItem(
                id = "ehs-5",
                category = "FIT FOR DUTY",
                text = "Are you 100% alert, hydrated, physically fit, and free of fatigue or physical impairment today?",
                isCompliant = true
            )
        )
    }

    // Site hazards & comments
    var identifiedHazards by remember { mutableStateOf("") }
    var generalComments by remember { mutableStateOf("") }

    // Shift selection
    var selectedShift by remember { mutableStateOf(ShiftType.REGULAR_MORNING) }

    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }

    val scrollState = rememberScrollState()

    fun canAdvance(step: Int): Boolean {
        return when (step) {
            1 -> ppePhotoUri != null
            2 -> toolsPhotoUri != null
            3 -> vehiclePhotoUri != null
            4 -> ladderPhotoUri != null
            5 -> questions.all { it.isCompliant || it.correctiveNotes.isNotBlank() }
            6 -> true
            7 -> true
            else -> true
        }
    }

    val progressPercent = (currentStep.toFloat() / totalSteps.toFloat())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F172A)) // Slate 900
    ) {
        // Wizard Top Header Bar
        Surface(
            color = Color(0xFF1E293B), // Slate 800
            shadowElevation = 4.dp
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = onCancel,
                        colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFF94A3B8))
                    ) {
                        Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Cancel", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }

                    Box(
                        modifier = Modifier
                            .clip(CircleShape)
                            .background(Color(0xFF0F172A))
                            .border(1.dp, Amber500.copy(alpha = 0.4f), CircleShape)
                            .padding(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = "Step $currentStep of $totalSteps",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Amber500,
                            fontFamily = FontFamily.Monospace
                        )
                    }

                    Text(
                        text = uiState.currentTechnician.employeeCode,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Color(0xFF94A3B8)
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Smooth Progress Bar
                LinearProgressIndicator(
                    progress = progressPercent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(CircleShape),
                    color = Amber500,
                    trackColor = Color(0xFF334155)
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Step Title & Subtitle
                val stepTitle = when (currentStep) {
                    1 -> PhotoRequirement.PPE.title
                    2 -> PhotoRequirement.TOOLS.title
                    3 -> PhotoRequirement.VEHICLE.title
                    4 -> PhotoRequirement.LADDER.title
                    5 -> "5. Daily EHS Inspection Checklist"
                    6 -> "6. Site Hazards & Field Comments"
                    7 -> "7. Review & Official Clock-In"
                    else -> ""
                }

                val stepSubtitle = when (currentStep) {
                    in 1..4 -> "Direct camera capture with automatic GPS and timestamp stamping."
                    5 -> "Verify daily safety compliance for mandatory risk prevention."
                    6 -> "Report unusual obstacles or access notes for the supervisor."
                    7 -> "Confirm timestamp and evidence bundle before official locking."
                    else -> ""
                }

                Text(
                    text = stepTitle,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )
                Text(
                    text = stepSubtitle,
                    fontSize = 12.sp,
                    color = Color(0xFF94A3B8),
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }

        // Main Scrollable Content Area
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                when (currentStep) {
                    1 -> PhotoStepView(
                        requirement = PhotoRequirement.PPE,
                        photoUri = ppePhotoUri,
                        onLaunchCamera = { activeCameraType = PhotoRequirement.PPE }
                    )
                    2 -> PhotoStepView(
                        requirement = PhotoRequirement.TOOLS,
                        photoUri = toolsPhotoUri,
                        onLaunchCamera = { activeCameraType = PhotoRequirement.TOOLS }
                    )
                    3 -> PhotoStepView(
                        requirement = PhotoRequirement.VEHICLE,
                        photoUri = vehiclePhotoUri,
                        onLaunchCamera = { activeCameraType = PhotoRequirement.VEHICLE }
                    )
                    4 -> PhotoStepView(
                        requirement = PhotoRequirement.LADDER,
                        photoUri = ladderPhotoUri,
                        onLaunchCamera = { activeCameraType = PhotoRequirement.LADDER }
                    )
                    5 -> EHSChecklistView(questions = questions)
                    6 -> CommentsAndHazardsView(
                        identifiedHazards = identifiedHazards,
                        onHazardsChanged = { identifiedHazards = it },
                        generalComments = generalComments,
                        onCommentsChanged = { generalComments = it }
                    )
                    7 -> ReviewStepView(
                        viewModel = viewModel,
                        ppePhotoUri = ppePhotoUri,
                        toolsPhotoUri = toolsPhotoUri,
                        vehiclePhotoUri = vehiclePhotoUri,
                        ladderPhotoUri = ladderPhotoUri,
                        questions = questions,
                        selectedShift = selectedShift,
                        onShiftSelected = { selectedShift = it },
                        submitError = submitError
                    )
                }
            }
        }

        // Bottom Navigation Bar
        Surface(
            color = Color(0xFF1E293B),
            shadowElevation = 8.dp
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (currentStep > 1) {
                    OutlinedButton(
                        onClick = { currentStep -= 1 },
                        enabled = !isSubmitting,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFE2E8F0)),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = Brush.horizontalGradient(listOf(Color(0xFF475569), Color(0xFF475569)))
                        )
                    ) {
                        Icon(Icons.Default.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Back", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                } else {
                    Spacer(modifier = Modifier.width(1.dp))
                }

                if (currentStep < totalSteps) {
                    val enabled = canAdvance(currentStep)
                    Button(
                        onClick = {
                            if (enabled) currentStep += 1
                        },
                        enabled = enabled,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Amber500,
                            disabledContainerColor = Color(0xFF334155),
                            contentColor = Color(0xFF0F172A),
                            disabledContentColor = Color(0xFF64748B)
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.height(48.dp)
                    ) {
                        Text("Continue", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(16.dp))
                    }
                } else {
                    // Final Submit Button
                    Button(
                        onClick = {
                            if (ppePhotoUri == null || toolsPhotoUri == null || vehiclePhotoUri == null || ladderPhotoUri == null) {
                                submitError = "All 4 safety photos are mandatory before recording official arrival."
                                return@Button
                            }

                            isSubmitting = true
                            submitError = null

                            val timestamp = System.currentTimeMillis()

                            val allPassed = questions.count { it.isCompliant }

                            val combinedNotes = buildString {
                                if (generalComments.isNotBlank()) append("Notes: $generalComments. ")
                                if (identifiedHazards.isNotBlank()) append("Hazards: $identifiedHazards. ")
                                val nonCompliant = questions.filter { !it.isCompliant }
                                if (nonCompliant.isNotEmpty()) {
                                    append("Corrective Actions: ")
                                    nonCompliant.forEach { q ->
                                        append("[${q.category}: ${q.correctiveNotes}] ")
                                    }
                                }
                            }.trim()

                            viewModel.clockIn(
                                shiftType = selectedShift,
                                verificationMethod = VerificationMethod.GEO_FENCE,
                                notes = combinedNotes,
                                ppePhoto = ppePhotoUri,
                                toolPhoto = toolsPhotoUri,
                                vehiclePhoto = vehiclePhotoUri,
                                ladderPhoto = ladderPhotoUri,
                                safetyChecksPassed = allPassed,
                                isCompliant = allPassed == 5,
                                customTimestamp = timestamp
                            )

                            isSubmitting = false
                            onCompleted()
                        },
                        enabled = !isSubmitting,
                        colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth(0.68f)
                            .height(52.dp)
                    ) {
                        if (isSubmitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color(0xFF0F172A),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Recording...", color = Color(0xFF0F172A), fontWeight = FontWeight.Bold)
                        } else {
                            Icon(Icons.Default.Send, contentDescription = null, tint = Color(0xFF0F172A), modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("RECORD OFFICIAL ARRIVAL", color = Color(0xFF0F172A), fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
    }

    // Active Camera Capture Viewfinder Dialog
    if (activeCameraType != null) {
        val req = activeCameraType!!
        CameraViewfinderModal(
            requirement = req,
            viewModel = viewModel,
            onDismiss = { activeCameraType = null },
            onCaptured = { stamp ->
                when (req) {
                    PhotoRequirement.PPE -> ppePhotoUri = stamp
                    PhotoRequirement.TOOLS -> toolsPhotoUri = stamp
                    PhotoRequirement.VEHICLE -> vehiclePhotoUri = stamp
                    PhotoRequirement.LADDER -> ladderPhotoUri = stamp
                }
                activeCameraType = null
            }
        )
    }
}

@Composable
fun PhotoStepView(
    requirement: PhotoRequirement,
    photoUri: String?,
    onLaunchCamera: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
        shape = RoundedCornerShape(20.dp),
        border = CardDefaults.outlinedCardBorder().copy(
            brush = Brush.horizontalGradient(listOf(Color(0xFF334155), Color(0xFF334155)))
        )
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(Color(0xFF0F172A))
                        .border(1.dp, Amber500.copy(alpha = 0.5f), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        when (requirement) {
                            PhotoRequirement.PPE -> Icons.Default.Person
                            PhotoRequirement.TOOLS -> Icons.Default.Build
                            PhotoRequirement.VEHICLE -> Icons.Default.DirectionsCar
                            PhotoRequirement.LADDER -> Icons.Default.Check
                        },
                        contentDescription = null,
                        tint = Amber500,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column {
                    Text(
                        text = requirement.category,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = Amber500,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = requirement.shortLabel,
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = requirement.description,
                fontSize = 13.sp,
                color = Color(0xFFCBD5E1),
                lineHeight = 19.sp
            )

            Spacer(modifier = Modifier.height(20.dp))

            if (photoUri != null) {
                val decodedBitmap = remember(photoUri) { PhotoUtils.decodeBase64Bitmap(photoUri) }

                // Photo Captured Preview Card
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(230.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF020617))
                        .border(1.dp, Emerald600.copy(alpha = 0.6f), RoundedCornerShape(16.dp))
                ) {
                    if (decodedBitmap != null) {
                        Image(
                            bitmap = decodedBitmap.asImageBitmap(),
                            contentDescription = requirement.category,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    // Watermark & status HUD overlay
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(12.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.Black.copy(alpha = 0.75f))
                                    .border(1.dp, Emerald600, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(14.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("EVIDENCE STAMPED", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Emerald600)
                                }
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color.Black.copy(alpha = 0.75f))
                                    .padding(horizontal = 6.dp, vertical = 3.dp)
                            ) {
                                Text(
                                    text = "JPEG COMPRESSED & SIGNED",
                                    fontSize = 9.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color(0xFFCBD5E1)
                                )
                            }
                        }

                        // Watermark Stamp display
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color.Black.copy(alpha = 0.85f))
                                .border(1.dp, Amber500.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                                .padding(8.dp)
                        ) {
                            Text(
                                text = "CATEGORY: ${requirement.category}",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = Amber500,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = "PAYLOAD: ${if (photoUri.length > 40) photoUri.take(38) + "..." else photoUri}",
                                fontSize = 10.sp,
                                color = Color.White,
                                fontFamily = FontFamily.Monospace
                            )
                            Text(
                                text = "READY FOR PHP/MYSQL BATCH UPLOAD",
                                fontSize = 9.sp,
                                color = Emerald600,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedButton(
                    onClick = onLaunchCamera,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Amber500),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = Brush.horizontalGradient(listOf(Amber500, Amber500))
                    )
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Retake Photo", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            } else {
                // Launch Camera Call to Action
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color(0xFF0F172A))
                        .border(1.5.dp, Amber500.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                        .clickable { onLaunchCamera() }
                        .padding(vertical = 36.dp, horizontal = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(58.dp)
                                .clip(CircleShape)
                                .background(Amber500),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.CameraAlt,
                                contentDescription = null,
                                tint = Color(0xFF0F172A),
                                modifier = Modifier.size(30.dp)
                            )
                        }
                        Text(
                            text = "Launch Device Camera",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Text(
                            text = "Auto-records GPS coordinates & timestamp watermark",
                            fontSize = 11.sp,
                            color = Color(0xFF94A3B8),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun EHSChecklistView(questions: MutableList<EHSQuestionItem>) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Surface(
            color = Amber500.copy(alpha = 0.1f),
            shape = RoundedCornerShape(14.dp),
            border = CardDefaults.outlinedCardBorder().copy(
                brush = Brush.horizontalGradient(listOf(Amber500.copy(alpha = 0.3f), Amber500.copy(alpha = 0.3f)))
            )
        ) {
            Row(
                modifier = Modifier.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Shield, contentDescription = null, tint = Amber500, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(10.dp))
                Text(
                    text = "All 5 questions are mandatory for OSHA & corporate safety compliance.",
                    fontSize = 12.sp,
                    color = Amber500,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        questions.forEachIndexed { index, q ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
                shape = RoundedCornerShape(16.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(listOf(Color(0xFF334155), Color(0xFF334155)))
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = q.category,
                                fontSize = 10.sp,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Bold,
                                color = Amber500
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "${index + 1}. ${q.text}",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White,
                                lineHeight = 18.sp
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        // YES / NO Segmented Toggle
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF0F172A))
                                .padding(3.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (q.isCompliant) Emerald600 else Color.Transparent)
                                    .clickable {
                                        questions[index] = q.copy(isCompliant = true)
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    "YES",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = if (q.isCompliant) Color.White else Color(0xFF64748B)
                                )
                            }

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (!q.isCompliant) Rose600 else Color.Transparent)
                                    .clickable {
                                        questions[index] = q.copy(isCompliant = false)
                                    }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    "NO",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = if (!q.isCompliant) Color.White else Color(0xFF64748B)
                                )
                            }
                        }
                    }

                    // If NO: prompt for corrective note
                    if (!q.isCompliant) {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = q.correctiveNotes,
                            onValueChange = { newNote ->
                                questions[index] = q.copy(correctiveNotes = newNote)
                            },
                            label = { Text("Corrective Action Taken *", color = Rose600, fontSize = 11.sp) },
                            placeholder = { Text("e.g., Swapped frayed cord with truck replacement", fontSize = 12.sp) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Rose600,
                                unfocusedBorderColor = Rose600.copy(alpha = 0.5f),
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            ),
                            shape = RoundedCornerShape(10.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun CommentsAndHazardsView(
    identifiedHazards: String,
    onHazardsChanged: (String) -> Unit,
    generalComments: String,
    onCommentsChanged: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "SITE HAZARDS & ENVIRONMENTAL OBSTACLES (OPTIONAL)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Amber500,
                    fontFamily = FontFamily.Monospace
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = identifiedHazards,
                    onValueChange = onHazardsChanged,
                    placeholder = { Text("e.g. Wet slope near substation transformer, bee nest by junction box, gate latch broken...", fontSize = 12.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Amber500,
                        unfocusedBorderColor = Color(0xFF475569)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "GENERAL ARRIVAL COMMENTS & NOTES (OPTIONAL)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8),
                    fontFamily = FontFamily.Monospace
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = generalComments,
                    onValueChange = onCommentsChanged,
                    placeholder = { Text("e.g. Arrived on site, facility safety contact confirmed access permit...", fontSize = 12.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Amber500,
                        unfocusedBorderColor = Color(0xFF475569)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }
        }
    }
}

@Composable
fun ReviewStepView(
    viewModel: FieldPulseViewModel,
    ppePhotoUri: String?,
    toolsPhotoUri: String?,
    vehiclePhotoUri: String?,
    ladderPhotoUri: String?,
    questions: List<EHSQuestionItem>,
    selectedShift: ShiftType,
    onShiftSelected: (ShiftType) -> Unit,
    submitError: String?
) {
    val uiState by viewModel.uiState.collectAsState()

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        // Offline Notice if offline mode is simulated
        if (uiState.isOfflineMode) {
            Surface(
                color = Rose600.copy(alpha = 0.15f),
                shape = RoundedCornerShape(14.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(listOf(Rose600.copy(alpha = 0.5f), Rose600.copy(alpha = 0.5f)))
                )
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.Top
                ) {
                    Icon(Icons.Default.CloudOff, contentDescription = null, tint = Rose600, modifier = Modifier.size(22.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text("Offline Mode Active", fontWeight = FontWeight.Bold, color = Rose600, fontSize = 13.sp)
                        Text(
                            text = "Your clock-in will be recorded with exact local device timestamp in encrypted Room SQLite storage. When connectivity returns, it will synchronize as an official Offline Sync without modifying your arrival time.",
                            fontSize = 11.sp,
                            color = Color(0xFFFECDD3),
                            lineHeight = 16.sp
                        )
                    }
                }
            }
        }

        // Attestation Details Matrix
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B)),
            shape = RoundedCornerShape(18.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "OFFICIAL CLOCK-IN ATTESTATION",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8),
                        fontFamily = FontFamily.Monospace
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Shield, contentDescription = null, tint = Emerald600, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("INTEGRITY VERIFIED", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Emerald600)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoTile(label = "Technician", value = uiState.currentTechnician.name, modifier = Modifier.weight(1f))
                    InfoTile(label = "Employee Code", value = uiState.currentTechnician.employeeCode, isAmber = true, modifier = Modifier.weight(1f))
                }

                Spacer(modifier = Modifier.height(8.dp))

                val recordTimeStr = SimpleDateFormat("HH:mm:ss a", Locale.getDefault()).format(Date())
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoTile(label = "Arrival Recorded", value = recordTimeStr, modifier = Modifier.weight(1f))
                    InfoTile(label = "Expected Start", value = "08:00 AM", modifier = Modifier.weight(1f))
                }

                Spacer(modifier = Modifier.height(14.dp))

                // 4 Photo Thumbnails Grid
                Text(
                    text = "Captured Safety Photos (4 Mandatory Verified)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF94A3B8)
                )
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        "PPE" to ppePhotoUri,
                        "Tools" to toolsPhotoUri,
                        "Vehicle" to vehiclePhotoUri,
                        "Ladder" to ladderPhotoUri
                    ).forEach { (label, uri) ->
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF0F172A))
                                .border(
                                    1.dp,
                                    if (uri != null) Emerald600 else Color(0xFF475569),
                                    RoundedCornerShape(10.dp)
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    if (uri != null) Icons.Default.CheckCircle else Icons.Default.CameraAlt,
                                    contentDescription = null,
                                    tint = if (uri != null) Emerald600 else Color(0xFF64748B),
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = label,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (uri != null) Amber500 else Color(0xFF94A3B8)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // EHS Compliance confirmation
                val passCount = questions.count { it.isCompliant }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF0F172A))
                        .padding(10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("EHS Safety Inspection:", fontSize = 12.sp, color = Color(0xFF94A3B8))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Emerald600, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("$passCount / 5 Mandatory Passed", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Emerald600)
                    }
                }
            }
        }

        if (submitError != null) {
            Surface(
                color = Rose600.copy(alpha = 0.2f),
                shape = RoundedCornerShape(12.dp),
                border = CardDefaults.outlinedCardBorder().copy(
                    brush = Brush.horizontalGradient(listOf(Rose600, Rose600))
                )
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = Rose600, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(submitError, color = Color(0xFFFECDD3), fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
fun InfoTile(label: String, value: String, isAmber: Boolean = false, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Color(0xFF0F172A))
            .padding(10.dp)
    ) {
        Column {
            Text(label, fontSize = 9.sp, color = Color(0xFF64748B))
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = if (isAmber) Amber500 else Color.White,
                fontFamily = if (isAmber) FontFamily.Monospace else FontFamily.Default
            )
        }
    }
}

@Composable
fun CameraViewfinderModal(
    requirement: PhotoRequirement,
    viewModel: FieldPulseViewModel,
    onDismiss: () -> Unit,
    onCaptured: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    var isFrontCamera by remember { mutableStateOf(requirement == PhotoRequirement.PPE) }
    var isProcessing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val timestampNow = remember {
        SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date())
    }

    val processCapturedBitmap: (Bitmap?) -> Unit = { capturedBitmap ->
        if (capturedBitmap != null) {
            isProcessing = true
            errorMessage = null
            try {
                val watermarkedDataUrl = PhotoUtils.generateEvidencePhotoBase64(
                    context = context,
                    requirement = requirement,
                    technicianName = uiState.currentTechnician.name,
                    employeeCode = uiState.currentTechnician.employeeCode,
                    assignedSite = uiState.currentTechnician.assignedSite,
                    latitude = uiState.currentLatitude,
                    longitude = uiState.currentLongitude,
                    accuracyMeters = uiState.gpsAccuracyMeters,
                    sourceBitmap = capturedBitmap
                )
                onCaptured(watermarkedDataUrl)
            } catch (e: Exception) {
                errorMessage = "Failed to process photo: ${e.message}"
            } finally {
                isProcessing = false
            }
        }
    }

    val takePictureLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap: Bitmap? ->
        if (bitmap != null) {
            processCapturedBitmap(bitmap)
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            isProcessing = true
            errorMessage = null
            try {
                val stream = context.contentResolver.openInputStream(uri)
                val bitmap = BitmapFactory.decodeStream(stream)
                stream?.close()
                if (bitmap != null) {
                    processCapturedBitmap(bitmap)
                } else {
                    errorMessage = "Unable to decode chosen image."
                    isProcessing = false
                }
            } catch (e: Exception) {
                errorMessage = "Error opening image: ${e.message}"
                isProcessing = false
            }
        }
    }

    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            takePictureLauncher.launch(null)
        } else {
            errorMessage = "Camera permission was denied. You can pick from gallery or grant permission in Android Settings."
        }
    }

    val launchRealCamera = {
        val hasCamPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED

        if (hasCamPermission) {
            takePictureLauncher.launch(null)
        } else {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            // Viewfinder Container
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(top = 64.dp, bottom = 110.dp, start = 16.dp, end = 16.dp)
                    .clip(RoundedCornerShape(20.dp))
                    .background(Color(0xFF0B132B))
                    .border(2.dp, Amber500.copy(alpha = 0.6f), RoundedCornerShape(20.dp))
            ) {
                // Requirement prompt banner
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 16.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.7f))
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "FRAME: ${requirement.shortLabel.uppercase()}",
                        color = Amber500,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.ExtraBold,
                        fontFamily = FontFamily.Monospace
                    )
                }

                // Interactive Capture Action Center
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    if (isProcessing) {
                        CircularProgressIndicator(color = Amber500, strokeWidth = 3.dp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Stamping Tamper-Proof Evidence & GPS...",
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    } else {
                        // 1. Primary Button: Open Hardware Camera
                        Button(
                            onClick = { launchRealCamera() },
                            colors = ButtonDefaults.buttonColors(containerColor = Amber500),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth(0.9f)
                                .height(54.dp)
                        ) {
                            Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color(0xFF0F172A), modifier = Modifier.size(22.dp))
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = "OPEN DEVICE CAMERA",
                                color = Color(0xFF0F172A),
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp
                            )
                        }

                        // 2. Secondary Button: Choose from Gallery
                        OutlinedButton(
                            onClick = { galleryLauncher.launch("image/*") },
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                            border = ButtonDefaults.outlinedButtonBorder.copy(
                                brush = Brush.horizontalGradient(listOf(Color(0xFF475569), Color(0xFF475569)))
                            ),
                            modifier = Modifier
                                .fillMaxWidth(0.9f)
                                .height(46.dp)
                        ) {
                            Icon(Icons.Default.PhotoLibrary, contentDescription = null, tint = Amber500, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Choose from Device Gallery", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }

                        // 3. Fallback: Simulated Test Frame
                        TextButton(
                            onClick = {
                                val simulatedDataUrl = PhotoUtils.generateEvidencePhotoBase64(
                                    context = context,
                                    requirement = requirement,
                                    technicianName = uiState.currentTechnician.name,
                                    employeeCode = uiState.currentTechnician.employeeCode,
                                    assignedSite = uiState.currentTechnician.assignedSite,
                                    latitude = uiState.currentLatitude,
                                    longitude = uiState.currentLongitude,
                                    accuracyMeters = uiState.gpsAccuracyMeters,
                                    sourceBitmap = null
                                )
                                onCaptured(simulatedDataUrl)
                            }
                        ) {
                            Text(
                                text = "⚡ Use Simulated Test Frame (Demo)",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace
                            )
                        }

                        if (errorMessage != null) {
                            Text(
                                text = errorMessage ?: "",
                                color = Rose600,
                                fontSize = 11.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }

                // Live Watermark HUD in camera corner
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(12.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color.Black.copy(alpha = 0.85f))
                        .padding(10.dp)
                ) {
                    Text(
                        text = "📍 GPS: ${String.format(Locale.US, "%.5f", uiState.currentLatitude)}, ${String.format(Locale.US, "%.5f", uiState.currentLongitude)} (±${uiState.gpsAccuracyMeters.toInt()}m)",
                        fontSize = 9.sp,
                        color = Amber500,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "🕒 TIMESTAMP: $timestampNow",
                        fontSize = 9.sp,
                        color = Color.White,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "🆔 TECH: ${uiState.currentTechnician.employeeCode} (${uiState.currentTechnician.name})",
                        fontSize = 9.sp,
                        color = Color(0xFFCBD5E1),
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = "🏢 SITE: ${uiState.currentTechnician.assignedSite}",
                        fontSize = 9.sp,
                        color = Color(0xFF94A3B8),
                        fontFamily = FontFamily.Monospace
                    )
                }
            }

            // Top Bar Controls
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, start = 16.dp, end = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onDismiss,
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                ) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                }

                Text(
                    text = requirement.shortLabel,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp
                )

                IconButton(
                    onClick = { launchRealCamera() },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color.Black.copy(alpha = 0.6f))
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = "Open Camera", tint = Amber500)
                }
            }

            // Bottom Shutter Button Controls
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 20.dp),
                contentAlignment = Alignment.Center
            ) {
                // Outer shutter ring that triggers real device camera
                Box(
                    modifier = Modifier
                        .size(74.dp)
                        .clip(CircleShape)
                        .border(4.dp, Amber500, CircleShape)
                        .padding(5.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .clickable {
                            launchRealCamera()
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = "Capture Real Photo", tint = Color(0xFF0F172A), modifier = Modifier.size(30.dp))
                }
            }
        }
    }
}
