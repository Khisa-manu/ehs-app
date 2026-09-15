package com.fieldpulse.app.data.local

import androidx.room.TypeConverter
import com.fieldpulse.app.data.model.*

class Converters {
    @TypeConverter
    fun fromVerificationMethod(value: VerificationMethod?): String? = value?.name

    @TypeConverter
    fun toVerificationMethod(value: String?): VerificationMethod =
        value?.let { runCatching { VerificationMethod.valueOf(it) }.getOrNull() } ?: VerificationMethod.GEO_FENCE

    @TypeConverter
    fun fromShiftType(value: ShiftType?): String? = value?.name

    @TypeConverter
    fun toShiftType(value: String?): ShiftType =
        value?.let { runCatching { ShiftType.valueOf(it) }.getOrNull() } ?: ShiftType.REGULAR_MORNING

    @TypeConverter
    fun fromSyncStatus(value: SyncStatus?): String? = value?.name

    @TypeConverter
    fun toSyncStatus(value: String?): SyncStatus =
        value?.let { runCatching { SyncStatus.valueOf(it) }.getOrNull() } ?: SyncStatus.SYNCED

    @TypeConverter
    fun fromRiskLevel(value: RiskLevel?): String? = value?.name

    @TypeConverter
    fun toRiskLevel(value: String?): RiskLevel =
        value?.let { runCatching { RiskLevel.valueOf(it) }.getOrNull() } ?: RiskLevel.LOW

    @TypeConverter
    fun fromIncidentType(value: IncidentType?): String? = value?.name

    @TypeConverter
    fun toIncidentType(value: String?): IncidentType =
        value?.let { runCatching { IncidentType.valueOf(it) }.getOrNull() } ?: IncidentType.HAZARD_IDENTIFIED
}
