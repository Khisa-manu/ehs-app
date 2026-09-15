package com.fieldpulse.app.ui

import android.app.Application
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fieldpulse.app.data.local.FieldPulseDatabase
import com.fieldpulse.app.data.model.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.Calendar
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
    val activeTab: Int = 0 // 0: Clock-in, 1: EHS Report, 2: Records, 3: Admin
)

class FieldPulseViewModel(application: Application) : AndroidViewModel(application) {
    private val database = FieldPulseDatabase.getDatabase(application)
    private val clockDao = database.clockRecordDao()
    private val ehsDao = database.ehsIncidentDao()
    private val techDao = database.technicianDao()
    private val prefs = application.getSharedPreferences("spectrum_ehs_prefs", Context.MODE_PRIVATE)

    private val _uiState = MutableStateFlow(
        UIState(
            isLoggedIn = prefs.getBoolean("is_logged_in", false),
            currentTechnician = loadSavedTechnician()
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
        // Seed demo records if database is empty so Admin dashboard is immediately actionable
        viewModelScope.launch {
            seedDemoDataIfEmpty()
        }
    }

    private suspend fun seedDemoDataIfEmpty() {
        val currentClocks = clockDao.getPendingOfflineRecords()
        // Check if records already exist
        val existingClockCount = clockDao.getAllRecords().first().size
        if (existingClockCount == 0) {
            val now = System.currentTimeMillis()
            clockDao.insertRecord(
                ClockRecord(
                    id = "clock-seed-01",
                    technicianId = "tech-01",
                    technicianName = "Marcus Rodriguez",
                    type = "CLOCK_IN",
                    timestamp = now - 3 * 3600 * 1000,
                    latitude = 29.7604,
                    longitude = -95.3698,
                    accuracyMeters = 3.8f,
                    facilityCode = "FAC-TX-HOU-04",
                    shiftType = ShiftType.REGULAR_MORNING,
                    verificationMethod = VerificationMethod.GEO_FENCE,
                    syncStatus = SyncStatus.SYNCED,
                    notes = "Shift started on schedule. All PPE verified."
                )
            )
            clockDao.insertRecord(
                ClockRecord(
                    id = "clock-seed-02",
                    technicianId = "tech-02",
                    technicianName = "Carlos Mendez",
                    type = "CLOCK_IN",
                    timestamp = now - 2 * 3600 * 1000,
                    latitude = 29.8100,
                    longitude = -95.4200,
                    accuracyMeters = 4.5f,
                    facilityCode = "FAC-TX-GRID-07",
                    shiftType = ShiftType.REGULAR_MORNING,
                    verificationMethod = VerificationMethod.QR_FACILITY,
                    syncStatus = SyncStatus.SYNCED,
                    notes = "Substation perimeter walk complete."
                )
            )
            clockDao.insertRecord(
                ClockRecord(
                    id = "clock-seed-03",
                    technicianId = "tech-04",
                    technicianName = "David Thorne",
                    type = "CLOCK_IN",
                    timestamp = now - 1 * 3600 * 1000,
                    latitude = 29.7200,
                    longitude = -95.3100,
                    accuracyMeters = 5.1f,
                    facilityCode = "FAC-TX-REF-02",
                    shiftType = ShiftType.AFTERNOON_FIELD,
                    verificationMethod = VerificationMethod.GEO_FENCE,
                    syncStatus = SyncStatus.PENDING_OFFLINE,
                    notes = "Pump inspection shift. Remote dead zone."
                )
            )
        }

        val existingIncidents = ehsDao.getAllIncidents().first().size
        if (existingIncidents == 0) {
            val now = System.currentTimeMillis()
            ehsDao.insertIncident(
                EHSIncident(
                    id = "inc-seed-01",
                    technicianId = "tech-01",
                    technicianName = "Marcus Rodriguez",
                    title = "Pressurized gas sensor alarm drift",
                    incidentType = IncidentType.EQUIPMENT_FAILURE,
                    riskLevel = RiskLevel.CRITICAL_STOP_WORK,
                    description = "Auxiliary gas sensor reading 14% LEL spike. Line isolated and lock-out tag placed.",
                    immediateActionTaken = "Halted compressor feed, evacuated perimeter, notified plant safety manager.",
                    latitude = 29.7604,
                    longitude = -95.3698,
                    timestamp = now - 5 * 3600 * 1000,
                    syncStatus = SyncStatus.SYNCED,
                    status = "INVESTIGATING",
                    resolutionNotes = "Technician isolated line. Awaiting calibration crew dispatch."
                )
            )
            ehsDao.insertIncident(
                EHSIncident(
                    id = "inc-seed-02",
                    technicianId = "tech-02",
                    technicianName = "Carlos Mendez",
                    title = "Frayed grounding lead on 13.8kV busbar",
                    incidentType = IncidentType.HAZARD_IDENTIFIED,
                    riskLevel = RiskLevel.HIGH,
                    description = "Copper braid on secondary ground clamp showing 40% shear strand damage.",
                    immediateActionTaken = "Tagged out secondary clamp, deployed rated backup clamp.",
                    latitude = 29.8100,
                    longitude = -95.4200,
                    timestamp = now - 2 * 3600 * 1000,
                    syncStatus = SyncStatus.SYNCED,
                    status = "OPEN",
                    resolutionNotes = ""
                )
            )
            ehsDao.insertIncident(
                EHSIncident(
                    id = "inc-seed-03",
                    technicianId = "tech-03",
                    technicianName = "Sarah Chen",
                    title = "Slip hazard on mezzanine grating after washdown",
                    incidentType = IncidentType.NEAR_MISS,
                    riskLevel = RiskLevel.MEDIUM,
                    description = "Algae accumulation and overspray left catwalk slick during routine transit.",
                    immediateActionTaken = "Barricaded staircase with caution tape and applied degreaser absorbent.",
                    latitude = 29.7500,
                    longitude = -95.3500,
                    timestamp = now - 8 * 3600 * 1000,
                    syncStatus = SyncStatus.SYNCED,
                    status = "RESOLVED",
                    resolutionNotes = "Absorbent applied, non-skid tread scheduled for re-application."
                )
            )
        }

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
                syncStatus = if (isOffline) SyncStatus.PENDING_OFFLINE else SyncStatus.SYNCED,
                notes = notes,
                ppePhoto = ppePhoto,
                toolPhoto = toolPhoto,
                vehiclePhoto = vehiclePhoto,
                ladderPhoto = ladderPhoto,
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
        actionTaken: String
    ) {
        viewModelScope.launch {
            val state = _uiState.value
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
                syncStatus = if (state.isOfflineMode) SyncStatus.PENDING_OFFLINE else SyncStatus.SYNCED
            )
            ehsDao.insertIncident(incident)
        }
    }

    fun triggerSyncNow() {
        viewModelScope.launch {
            val pendingClock = clockDao.getPendingOfflineRecords()
            for (rec in pendingClock) {
                delay(150) // simulate upload network hop
                clockDao.updateRecord(rec.copy(syncStatus = SyncStatus.SYNCED))
            }
            val pendingEhs = ehsDao.getPendingOfflineIncidents()
            for (inc in pendingEhs) {
                delay(150)
                ehsDao.updateIncident(inc.copy(syncStatus = SyncStatus.SYNCED))
            }
            _uiState.update { it.copy(isOfflineMode = false, pendingSyncCount = 0) }
        }
    }
}
