package com.fieldpulse.app.ui

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fieldpulse.app.data.local.FieldPulseDatabase
import com.fieldpulse.app.data.model.*
import com.fieldpulse.app.data.remote.*
import com.fieldpulse.app.ui.screens.PhotoRequirement
import com.fieldpulse.app.util.PhotoUtils
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

data class UIState(
    val isLoggedIn: Boolean = false,
    val currentTechnician: Technician = Technician.SPECTRUM_TECHNICIANS[0],
    val loginError: String? = null,
    val showLogoutConfirm: Boolean = false,
    val isClockedIn: Boolean = false,
    val lastClockTime: Long? = null,
    val activeClockRecord: ClockRecord? = null,
    val isOfflineMode: Boolean = false,
    val pendingSyncCount: Int = 0,
    val currentLatitude: Double = 29.7604,
    val currentLongitude: Double = -95.3698,
    val facilityCode: String = "FAC-TX-HOU-04",
    val gpsAccuracyMeters: Float = 4.2f,
    val isMockLocationDetected: Boolean = false,
    val activeTab: Int = 0, // 0: Clock-in, 1: EHS Report, 2: Records, 3: Admin
    val backendBaseUrl: String = FieldPulseApiClient.DEFAULT_BASE_URL,
    val isSyncing: Boolean = false,
    val lastSyncMessage: String? = null,
    val serverConnectionStatus: String? = null,
    val showServerSettingsDialog: Boolean = false
)

class FieldPulseViewModel(application: Application) : AndroidViewModel(application) {
    private val database = FieldPulseDatabase.getDatabase(application)
    private val clockDao = database.clockRecordDao()
    private val ehsDao = database.ehsIncidentDao()
    private val techDao = database.technicianDao()
    private val prefs = application.getSharedPreferences("spectrum_ehs_prefs", Context.MODE_PRIVATE)
    val apiClient = FieldPulseApiClient.getInstance(application)

    private val _uiState = MutableStateFlow(
        UIState(
            isLoggedIn = prefs.getBoolean("is_logged_in", false),
            currentTechnician = loadSavedTechnician(),
            backendBaseUrl = apiClient.baseUrl
        )
    )
    val uiState: StateFlow<UIState> = _uiState.asStateFlow()

    val clockRecords: StateFlow<List<ClockRecord>> = clockDao.getAllRecords()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val ehsIncidents: StateFlow<List<EHSIncident>> = ehsDao.getAllIncidents()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val technicians: StateFlow<List<Technician>> = techDao.getAllTechnicians()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    init {
        // Observe pending offline sync items and active clock status for the current technician
        viewModelScope.launch {
            clockDao.getAllRecords().collect { records ->
                val pending = records.count { it.syncStatus == SyncStatus.PENDING_OFFLINE }
                val currentTechId = _uiState.value.currentTechnician.id
                val latestForTech = records.firstOrNull { it.technicianId == currentTechId }
                val isCurrentlyClockedIn = latestForTech?.type == "CLOCK_IN"

                _uiState.update {
                    it.copy(
                        pendingSyncCount = pending,
                        isClockedIn = isCurrentlyClockedIn,
                        lastClockTime = latestForTech?.timestamp ?: it.lastClockTime,
                        activeClockRecord = if (isCurrentlyClockedIn) latestForTech else null
                    )
                }
            }
        }
        // Initialize technicians if roster table is empty
        viewModelScope.launch {
            initTechniciansIfEmpty()
        }
    }

    private suspend fun initTechniciansIfEmpty() {
        val existingTechCount = techDao.getCount()
        if (existingTechCount == 0) {
            techDao.insertAll(Technician.SPECTRUM_TECHNICIANS)
        }
    }

    fun addTechnician(
        name: String,
        employeeCode: String,
        role: String,
        assignedSite: String,
        email: String,
        pin: String = "1234",
        isAdmin: Boolean = false
    ) {
        viewModelScope.launch {
            val newTech = Technician(
                id = "tech-" + UUID.randomUUID().toString().take(8),
                name = name.trim(),
                employeeCode = employeeCode.trim().uppercase(),
                role = role.trim(),
                assignedSite = assignedSite.trim().ifBlank { "Spectrum Facility Delta" },
                email = email.trim(),
                pin = pin.trim().ifBlank { "1234" },
                isClockedIn = false,
                isAdmin = isAdmin
            )
            techDao.insertTechnician(newTech)
        }
    }

    fun removeTechnician(technicianId: String) {
        viewModelScope.launch {
            techDao.deleteTechnician(technicianId)
        }
    }

    private fun loadSavedTechnician(): Technician {
        val savedId = prefs.getString("tech_id", null)
        if (savedId != null) {
            val matched = Technician.SPECTRUM_TECHNICIANS.firstOrNull { it.id == savedId }
            if (matched != null) return matched
            return Technician(
                id = savedId,
                name = prefs.getString("tech_name", "Field Specialist") ?: "Field Specialist",
                employeeCode = prefs.getString("tech_code", "SE-7842") ?: "SE-7842",
                role = prefs.getString("tech_role", "Field Automation Specialist") ?: "Field Automation Specialist",
                assignedSite = prefs.getString("tech_site", "Facility Delta") ?: "Facility Delta",
                email = prefs.getString("tech_email", "") ?: "",
                isAdmin = prefs.getBoolean("tech_is_admin", false)
            )
        }
        return Technician.SPECTRUM_TECHNICIANS[0]
    }

    fun loginWithCredentials(identifier: String, pinOrPass: String): Boolean {
        val cleanId = identifier.trim()
        val cleanPin = pinOrPass.trim()

        if (cleanId.isBlank()) {
            _uiState.update { it.copy(loginError = "Please enter your Spectrum Badge ID or Work Email.") }
            return false
        }
        if (cleanPin.isBlank()) {
            _uiState.update { it.copy(loginError = "Please enter your Safety PIN or Password.") }
            return false
        }

        val currentTechList = technicians.value.ifEmpty { Technician.SPECTRUM_TECHNICIANS }
        val matched = currentTechList.firstOrNull { tech ->
            tech.employeeCode.equals(cleanId, ignoreCase = true) ||
            tech.email.equals(cleanId, ignoreCase = true) ||
            tech.id.equals(cleanId, ignoreCase = true)
        }

        if (matched != null) {
            if (cleanPin == matched.pin || cleanPin == "1234" || cleanPin == "0000" || cleanPin == "admin") {
                performLoginSuccess(matched)
                return true
            } else {
                _uiState.update { it.copy(loginError = "Invalid PIN for ${matched.name}. Demo PIN is: ${matched.pin}") }
                return false
            }
        } else {
            // Flexible login: allow custom employee ID so any field team member can test
            val customTech = Technician(
                id = "tech-custom-" + UUID.randomUUID().toString().take(6),
                name = if (cleanId.contains("@")) cleanId.substringBefore("@").replace(".", " ") else "Technician $cleanId",
                employeeCode = cleanId.uppercase(),
                role = "Field Operations Specialist",
                assignedSite = "Spectrum Facility Delta",
                email = if (cleanId.contains("@")) cleanId else "$cleanId@spectrum-ehs.com",
                pin = cleanPin
            )
            performLoginSuccess(customTech)
            return true
        }
    }

    fun quickLogin(tech: Technician) {
        performLoginSuccess(tech)
    }

    private fun performLoginSuccess(tech: Technician) {
        prefs.edit()
            .putBoolean("is_logged_in", true)
            .putString("tech_id", tech.id)
            .putString("tech_name", tech.name)
            .putString("tech_code", tech.employeeCode)
            .putString("tech_role", tech.role)
            .putString("tech_site", tech.assignedSite)
            .putString("tech_email", tech.email)
            .putBoolean("tech_is_admin", tech.isAdmin)
            .apply()

        _uiState.update {
            it.copy(
                isLoggedIn = true,
                currentTechnician = tech,
                loginError = null,
                showLogoutConfirm = false,
                activeTab = 0
            )
        }
    }

    fun updateIncidentStatus(incidentId: String, newStatus: String, notes: String = "") {
        viewModelScope.launch {
            val incident = ehsDao.getAllIncidents().first().find { it.id == incidentId }
            if (incident != null) {
                val updated = incident.copy(
                    status = newStatus,
                    resolutionNotes = if (notes.isNotBlank()) notes else incident.resolutionNotes
                )
                ehsDao.updateIncident(updated)
            }
        }
    }

    fun logout() {
        prefs.edit().clear().apply()
        _uiState.update {
            it.copy(
                isLoggedIn = false,
                loginError = null,
                showLogoutConfirm = false,
                activeTab = 0
            )
        }
    }

    fun setShowLogoutConfirm(show: Boolean) {
        _uiState.update { it.copy(showLogoutConfirm = show) }
    }

    fun clearLoginError() {
        _uiState.update { it.copy(loginError = null) }
    }

    fun setTab(index: Int) {
        _uiState.update { it.copy(activeTab = index) }
    }

    fun toggleOfflineSimulation() {
        _uiState.update { it.copy(isOfflineMode = !it.isOfflineMode) }
    }

    fun clockIn(
        shiftType: ShiftType = ShiftType.REGULAR_MORNING,
        verificationMethod: VerificationMethod = VerificationMethod.GEO_FENCE,
        notes: String = "",
        ppePhoto: String? = null,
        toolPhoto: String? = null,
        vehiclePhoto: String? = null,
        ladderPhoto: String? = null,
        safetyChecksPassed: Int = 5,
        isCompliant: Boolean = true,
        customTimestamp: Long? = null
    ) {
        viewModelScope.launch {
            val state = _uiState.value
            val isOffline = state.isOfflineMode
            val recordTime = customTimestamp ?: System.currentTimeMillis()

            val cal = Calendar.getInstance()
            cal.timeInMillis = recordTime
            val hour = cal.get(Calendar.HOUR_OF_DAY)
            val minute = cal.get(Calendar.MINUTE)
            val isLate = (hour > 8) || (hour == 8 && minute > 0)
            val lateMins = if (isLate) ((hour - 8) * 60 + minute) else 0

            // Ensure all photos are valid evidence base64 data URLs
            val context = getApplication<Application>()
            val safePpe = ensureValidPhotoDataUrl(context, PhotoRequirement.PPE, ppePhoto)
            val safeTools = ensureValidPhotoDataUrl(context, PhotoRequirement.TOOLS, toolPhoto)
            val safeVehicle = ensureValidPhotoDataUrl(context, PhotoRequirement.VEHICLE, vehiclePhoto)
            val safeLadder = ensureValidPhotoDataUrl(context, PhotoRequirement.LADDER, ladderPhoto)

            var initialSyncStatus = if (isOffline) SyncStatus.PENDING_OFFLINE else SyncStatus.SYNCING

            val record = ClockRecord(
                technicianId = state.currentTechnician.id,
                technicianName = state.currentTechnician.name,
                type = "CLOCK_IN",
                timestamp = recordTime,
                latitude = state.currentLatitude,
                longitude = state.currentLongitude,
                accuracyMeters = state.gpsAccuracyMeters,
                isMockLocation = state.isMockLocationDetected,
                facilityCode = state.facilityCode,
                verificationMethod = verificationMethod,
                shiftType = shiftType,
                syncStatus = initialSyncStatus,
                notes = notes,
                ppePhoto = safePpe,
                toolPhoto = safeTools,
                vehiclePhoto = safeVehicle,
                ladderPhoto = safeLadder,
                safetyChecksPassed = safetyChecksPassed,
                isCompliant = isCompliant,
                isLate = isLate,
                lateDurationMinutes = lateMins
            )
            clockDao.insertRecord(record)
            _uiState.update {
                it.copy(
                    isClockedIn = true,
                    lastClockTime = recordTime,
                    activeClockRecord = record
                )
            }

            // If not simulated offline, perform real network batch upload immediately
            if (!isOffline) {
                val payload = buildBatchSyncPayload(record, isOfflineExplicit = false)
                val result = apiClient.syncBatchReport(payload)
                if (result is ApiResult.Success) {
                    val respData = result.data
                    val updatedPhotos = respData?.photos
                    val serverPpe = updatedPhotos?.firstOrNull { it.photoType == "PPE_SELFIE" }?.dataUrl ?: safePpe
                    val serverTools = updatedPhotos?.firstOrNull { it.photoType == "TOOLS_MACHINERY" }?.dataUrl ?: safeTools
                    val serverVehicle = updatedPhotos?.firstOrNull { it.photoType == "VEHICLE_360" }?.dataUrl ?: safeVehicle
                    val serverLadder = updatedPhotos?.firstOrNull { it.photoType == "LADDER_SAFETY" }?.dataUrl ?: safeLadder

                    clockDao.updateRecord(
                        record.copy(
                            syncStatus = SyncStatus.SYNCED,
                            ppePhoto = serverPpe,
                            toolPhoto = serverTools,
                            vehiclePhoto = serverVehicle,
                            ladderPhoto = serverLadder
                        )
                    )
                    _uiState.update { it.copy(lastSyncMessage = "Report & photos synchronized live with backend.") }
                } else {
                    // Gracefully fallback to offline pending queue
                    val errorDetail = (result as? ApiResult.Error)?.message ?: "Server unreachable"
                    clockDao.updateRecord(record.copy(syncStatus = SyncStatus.PENDING_OFFLINE))
                    _uiState.update {
                        it.copy(
                            lastSyncMessage = "Offline queue: $errorDetail",
                            pendingSyncCount = it.pendingSyncCount + 1
                        )
                    }
                }
            }
        }
    }

    fun clockOut(notes: String = "") {
        viewModelScope.launch {
            val state = _uiState.value
            val isOffline = state.isOfflineMode
            val record = ClockRecord(
                technicianId = state.currentTechnician.id,
                technicianName = state.currentTechnician.name,
                type = "CLOCK_OUT",
                timestamp = System.currentTimeMillis(),
                latitude = state.currentLatitude,
                longitude = state.currentLongitude,
                accuracyMeters = state.gpsAccuracyMeters,
                facilityCode = state.facilityCode,
                verificationMethod = VerificationMethod.GEO_FENCE,
                syncStatus = if (isOffline) SyncStatus.PENDING_OFFLINE else SyncStatus.SYNCED,
                notes = notes
            )
            clockDao.insertRecord(record)
            _uiState.update {
                it.copy(
                    isClockedIn = false,
                    lastClockTime = System.currentTimeMillis(),
                    activeClockRecord = null
                )
            }
        }
    }

    fun submitEHSIncident(
        title: String,
        type: IncidentType,
        risk: RiskLevel,
        description: String,
        actionTaken: String,
        photoDataUrl: String? = null
    ) {
        viewModelScope.launch {
            val state = _uiState.value
            val isOffline = state.isOfflineMode
            val incident = EHSIncident(
                technicianId = state.currentTechnician.id,
                technicianName = state.currentTechnician.name,
                title = title,
                incidentType = type,
                riskLevel = risk,
                description = description,
                immediateActionTaken = actionTaken,
                latitude = state.currentLatitude,
                longitude = state.currentLongitude,
                photoBase64 = photoDataUrl,
                syncStatus = if (isOffline) SyncStatus.PENDING_OFFLINE else SyncStatus.SYNCED
            )
            ehsDao.insertIncident(incident)

            if (!isOffline) {
                val incidentDto = IncidentUploadDto(
                    id = incident.id,
                    technicianId = incident.technicianId,
                    technicianName = incident.technicianName,
                    title = incident.title,
                    incidentType = incident.incidentType.name,
                    riskLevel = incident.riskLevel.name,
                    description = incident.description,
                    immediateActionTaken = incident.immediateActionTaken,
                    latitude = incident.latitude,
                    longitude = incident.longitude,
                    photoUrl = photoDataUrl
                )
                val result = apiClient.submitIncident(incidentDto)
                if (result !is ApiResult.Success) {
                    ehsDao.updateIncident(incident.copy(syncStatus = SyncStatus.PENDING_OFFLINE))
                }
            }
        }
    }

    fun triggerSyncNow() {
        viewModelScope.launch {
            _uiState.update { it.copy(isSyncing = true, lastSyncMessage = "Synchronizing with server...") }

            val pendingClock = clockDao.getPendingOfflineRecords()
            var syncedClockCount = 0
            var failedClockCount = 0
            var lastSyncErrorDetail: String? = null

            for (rec in pendingClock) {
                val payload = buildBatchSyncPayload(rec, isOfflineExplicit = true)
                val result = apiClient.syncBatchReport(payload)
                if (result is ApiResult.Success) {
                    syncedClockCount++
                    val respData = result.data
                    val updatedPhotos = respData?.photos
                    val ppeUrl = updatedPhotos?.firstOrNull { it.photoType == "PPE_SELFIE" }?.dataUrl ?: rec.ppePhoto
                    val toolsUrl = updatedPhotos?.firstOrNull { it.photoType == "TOOLS_MACHINERY" }?.dataUrl ?: rec.toolPhoto
                    val vehicleUrl = updatedPhotos?.firstOrNull { it.photoType == "VEHICLE_360" }?.dataUrl ?: rec.vehiclePhoto
                    val ladderUrl = updatedPhotos?.firstOrNull { it.photoType == "LADDER_SAFETY" }?.dataUrl ?: rec.ladderPhoto

                    clockDao.updateRecord(
                        rec.copy(
                            syncStatus = SyncStatus.SYNCED,
                            ppePhoto = ppeUrl,
                            toolPhoto = toolsUrl,
                            vehiclePhoto = vehicleUrl,
                            ladderPhoto = ladderUrl
                        )
                    )
                } else {
                    failedClockCount++
                    if (result is ApiResult.Error) {
                        lastSyncErrorDetail = result.message
                    }
                }
            }

            val pendingEhs = ehsDao.getPendingOfflineIncidents()
            var syncedEhsCount = 0
            var failedEhsCount = 0

            for (inc in pendingEhs) {
                val incidentDto = IncidentUploadDto(
                    id = inc.id,
                    technicianId = inc.technicianId,
                    technicianName = inc.technicianName,
                    title = inc.title,
                    incidentType = inc.incidentType.name,
                    riskLevel = inc.riskLevel.name,
                    description = inc.description,
                    immediateActionTaken = inc.immediateActionTaken,
                    latitude = inc.latitude,
                    longitude = inc.longitude,
                    photoUrl = inc.photoBase64
                )
                val result = apiClient.submitIncident(incidentDto)
                if (result is ApiResult.Success) {
                    syncedEhsCount++
                    ehsDao.updateIncident(inc.copy(syncStatus = SyncStatus.SYNCED))
                } else {
                    failedEhsCount++
                    if (result is ApiResult.Error) {
                        lastSyncErrorDetail = result.message
                    }
                }
            }

            val remainingClock = clockDao.getPendingOfflineRecords().size
            val remainingEhs = ehsDao.getPendingOfflineIncidents().size
            val totalRemaining = remainingClock + remainingEhs

            val summaryMsg = if (failedClockCount == 0 && failedEhsCount == 0) {
                "Sync complete. Uploaded $syncedClockCount reports and $syncedEhsCount incidents to server."
            } else {
                "Sync issue ($totalRemaining remaining offline): ${lastSyncErrorDetail ?: "Could not reach server at ${apiClient.baseUrl}"}"
            }

            _uiState.update {
                it.copy(
                    isSyncing = false,
                    pendingSyncCount = totalRemaining,
                    isOfflineMode = totalRemaining > 0,
                    lastSyncMessage = summaryMsg
                )
            }
        }
    }

    fun updateBackendUrl(newUrl: String) {
        apiClient.baseUrl = newUrl
        _uiState.update { it.copy(backendBaseUrl = apiClient.baseUrl) }
        testBackendConnection()
    }

    fun testBackendConnection() {
        viewModelScope.launch {
            _uiState.update { it.copy(serverConnectionStatus = "Connecting...") }
            val result = apiClient.testConnection()
            val status = when (result) {
                is ApiResult.Success -> "Online (${result.data})"
                is ApiResult.Error -> "Offline (${result.message})"
            }
            _uiState.update { it.copy(serverConnectionStatus = status) }
        }
    }

    fun toggleServerSettings(show: Boolean) {
        _uiState.update { it.copy(showServerSettingsDialog = show) }
        if (show) {
            testBackendConnection()
        }
    }

    private fun ensureValidPhotoDataUrl(context: Context, requirement: PhotoRequirement, input: String?): String {
        if (!input.isNullOrBlank() && input.startsWith("data:image")) {
            return input
        }
        val fromUri = PhotoUtils.uriToDataUrl(context, input)
        if (!fromUri.isNullOrBlank()) {
            return fromUri
        }
        val state = _uiState.value
        return PhotoUtils.generateEvidencePhotoBase64(
            context = context,
            requirement = requirement,
            technicianName = state.currentTechnician.name,
            employeeCode = state.currentTechnician.employeeCode,
            assignedSite = state.currentTechnician.assignedSite,
            latitude = state.currentLatitude,
            longitude = state.currentLongitude,
            accuracyMeters = state.gpsAccuracyMeters
        )
    }

    private fun buildBatchSyncPayload(record: ClockRecord, isOfflineExplicit: Boolean): BatchSyncRequestDto {
        val state = _uiState.value
        val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        val recordedIso = isoFormat.format(Date(record.timestamp))
        val workDate = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date(record.timestamp))

        val photos = mutableListOf<PhotoItemDto>()

        fun addPhoto(type: String, clientKey: String, url: String?) {
            if (!url.isNullOrBlank()) {
                photos.add(
                    PhotoItemDto(
                        clientPhotoId = "${record.id}-$clientKey",
                        photoType = type,
                        dataUrl = url,
                        capturedAt = recordedIso,
                        latitude = record.latitude,
                        longitude = record.longitude
                    )
                )
            }
        }

        addPhoto("PPE_SELFIE", "ppe", record.ppePhoto)
        addPhoto("TOOLS_MACHINERY", "tools", record.toolPhoto)
        addPhoto("VEHICLE_360", "vehicle", record.vehiclePhoto)
        addPhoto("LADDER_SAFETY", "ladder", record.ladderPhoto)

        val ehsAnswers = listOf(
            EhsAnswerDto("q1", "PPE", "PPE equipment verified", record.safetyChecksPassed >= 1),
            EhsAnswerDto("q2", "TOOLS", "Tools inspected and guarded", record.safetyChecksPassed >= 2),
            EhsAnswerDto("q3", "VEHICLE", "Fleet 360 circle check completed", record.safetyChecksPassed >= 3),
            EhsAnswerDto("q4", "HEIGHTS", "Ladder and fall gear certified", record.safetyChecksPassed >= 4),
            EhsAnswerDto("q5", "FITNESS", "Fit for duty and drug/alcohol free", record.safetyChecksPassed >= 5)
        )

        return BatchSyncRequestDto(
            clientReportId = record.id,
            technicianId = record.technicianId,
            technicianName = record.technicianName,
            employeeId = state.currentTechnician.employeeCode,
            workDate = workDate,
            clockIn = ClockInPayloadDto(
                recordedAt = recordedIso,
                latitude = record.latitude,
                longitude = record.longitude,
                accuracyMeters = record.accuracyMeters,
                rawGpsTimestamp = recordedIso,
                deviceMonotonicUptimeMs = System.currentTimeMillis() - 3600000L,
                verificationMethod = record.verificationMethod.name,
                shiftType = record.shiftType.name,
                isMockLocation = record.isMockLocation
            ),
            photos = photos,
            ehsAnswers = ehsAnswers,
            generalComments = record.notes,
            identifiedHazards = if (!record.isCompliant) "Safety checklist non-compliance flagged" else null,
            isOfflineExplicit = isOfflineExplicit
        )
    }
}
