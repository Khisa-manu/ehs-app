package com.fieldpulse.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

enum class ShiftType {
    REGULAR_MORNING,
    AFTERNOON_FIELD,
    EMERGENCY_ON_CALL,
    NIGHT_OVERHAUL
}

enum class VerificationMethod {
    QR_FACILITY,
    GEO_FENCE,
    MANUAL_PIN,
    SUPERVISOR_OVERRIDE
}

enum class SyncStatus {
    PENDING_OFFLINE,
    SYNCING,
    SYNCED,
    CONFLICT
}

enum class RiskLevel {
    LOW,
    MEDIUM,
    HIGH,
    CRITICAL_STOP_WORK
}

enum class IncidentType {
    NEAR_MISS,
    HAZARD_IDENTIFIED,
    FIRST_AID,
    EQUIPMENT_FAILURE,
    CHEMICAL_SPILL,
    ENVIRONMENTAL_BREACH
}

@Entity(tableName = "clock_records")
data class ClockRecord(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val technicianId: String,
    val technicianName: String,
    val type: String, // "CLOCK_IN" or "CLOCK_OUT"
    val timestamp: Long = System.currentTimeMillis(),
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracyMeters: Float? = null,
    val isMockLocation: Boolean = false,
    val facilityCode: String? = null,
    val verificationMethod: VerificationMethod = VerificationMethod.GEO_FENCE,
    val shiftType: ShiftType = ShiftType.REGULAR_MORNING,
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val notes: String = "",
    val photoBase64: String? = null,
    val ppePhoto: String? = null,
    val toolPhoto: String? = null,
    val vehiclePhoto: String? = null,
    val ladderPhoto: String? = null,
    val safetyChecksPassed: Int = 5,
    val isCompliant: Boolean = true,
    val isLate: Boolean = false,
    val lateDurationMinutes: Int = 0
)

@Entity(tableName = "ehs_incidents")
data class EHSIncident(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val technicianId: String,
    val technicianName: String,
    val title: String,
    val incidentType: IncidentType,
    val riskLevel: RiskLevel,
    val description: String,
    val immediateActionTaken: String,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val timestamp: Long = System.currentTimeMillis(),
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val photoBase64: String? = null,
    val status: String = "OPEN", // "OPEN", "INVESTIGATING", "RESOLVED"
    val resolutionNotes: String = ""
)

@Entity(tableName = "technicians")
data class Technician(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val employeeCode: String,
    val role: String,
    val assignedSite: String,
    val email: String = "",
    val pin: String = "1234",
    val isClockedIn: Boolean = false,
    val isAdmin: Boolean = false
) {
    companion object {
        val SPECTRUM_TECHNICIANS = listOf(
            Technician(
                id = "admin-01",
                name = "Rachel Hayes",
                employeeCode = "SE-ADMIN-01",
                role = "EHS Operations Director & Super Admin",
                assignedSite = "Spectrum Global Headquarters",
                email = "rachel.hayes@spectrum-ehs.com",
                pin = "7842",
                isClockedIn = true,
                isAdmin = true
            ),
            Technician(
                id = "admin-02",
                name = "Elena Vance",
                employeeCode = "SE-ADMIN-02",
                role = "Regional Safety Operations Manager",
                assignedSite = "Gulf Coast Regional Command",
                email = "elena.vance@spectrum-ehs.com",
                pin = "7842",
                isClockedIn = true,
                isAdmin = true
            ),
            Technician(
                id = "tech-01",
                name = "Marcus Rodriguez",
                employeeCode = "SE-7842",
                role = "Lead Automation Specialist",
                assignedSite = "Facility Delta - Compressor Station #4",
                email = "m.rodriguez@spectrum-ehs.com",
                pin = "7842",
                isClockedIn = false,
                isAdmin = false
            ),
            Technician(
                id = "tech-02",
                name = "Carlos Mendez",
                employeeCode = "SE-1042",
                role = "High Voltage Field Specialist",
                assignedSite = "Substation North - Grid #7",
                email = "c.mendez@spectrum-ehs.com",
                pin = "1042",
                isClockedIn = false,
                isAdmin = false
            ),
            Technician(
                id = "tech-03",
                name = "Sarah Chen",
                employeeCode = "SE-5021",
                role = "EHS Compliance Officer",
                assignedSite = "Spectrum Regional Safety Division",
                email = "s.chen@spectrum-ehs.com",
                pin = "5021",
                isClockedIn = false,
                isAdmin = false
            ),
            Technician(
                id = "tech-04",
                name = "David Thorne",
                employeeCode = "SE-3390",
                role = "Mechanical Systems Inspector",
                assignedSite = "Refinery Unit B - Pump House",
                email = "d.thorne@spectrum-ehs.com",
                pin = "3390",
                isClockedIn = false,
                isAdmin = false
            )
        )
    }
}
