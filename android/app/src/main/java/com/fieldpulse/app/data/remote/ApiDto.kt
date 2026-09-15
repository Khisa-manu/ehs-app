package com.fieldpulse.app.data.remote

import com.google.gson.annotations.SerializedName

sealed class ApiResult<out T> {
    data class Success<out T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val statusCode: Int = 0, val cause: Throwable? = null) : ApiResult<Nothing>()

    val isSuccess: Boolean get() = this is Success
}

data class ClockInPayloadDto(
    @SerializedName("recordedAt") val recordedAt: String,
    @SerializedName("latitude") val latitude: Double?,
    @SerializedName("longitude") val longitude: Double?,
    @SerializedName("accuracyMeters") val accuracyMeters: Float?,
    @SerializedName("rawGpsTimestamp") val rawGpsTimestamp: String?,
    @SerializedName("deviceMonotonicUptimeMs") val deviceMonotonicUptimeMs: Long?,
    @SerializedName("verificationMethod") val verificationMethod: String?,
    @SerializedName("shiftType") val shiftType: String?,
    @SerializedName("isMockLocation") val isMockLocation: Boolean = false
)

data class PhotoItemDto(
    @SerializedName("clientPhotoId") val clientPhotoId: String,
    @SerializedName("photoType") val photoType: String,
    @SerializedName("dataUrl") val dataUrl: String,
    @SerializedName("fileSizeBytes") val fileSizeBytes: Long? = null,
    @SerializedName("mimeType") val mimeType: String = "image/jpeg",
    @SerializedName("checksumSha256") val checksumSha256: String? = null,
    @SerializedName("capturedAt") val capturedAt: String,
    @SerializedName("latitude") val latitude: Double?,
    @SerializedName("longitude") val longitude: Double?
)

data class EhsAnswerDto(
    @SerializedName("questionId") val questionId: String,
    @SerializedName("category") val category: String,
    @SerializedName("questionText") val questionText: String,
    @SerializedName("isCompliant") val isCompliant: Boolean,
    @SerializedName("correctiveNotes") val correctiveNotes: String? = ""
)

data class BatchSyncRequestDto(
    @SerializedName("clientReportId") val clientReportId: String,
    @SerializedName("technicianId") val technicianId: String,
    @SerializedName("technicianName") val technicianName: String?,
    @SerializedName("employeeId") val employeeId: String?,
    @SerializedName("workDate") val workDate: String?,
    @SerializedName("clockIn") val clockIn: ClockInPayloadDto,
    @SerializedName("photos") val photos: List<PhotoItemDto>,
    @SerializedName("ehsAnswers") val ehsAnswers: List<EhsAnswerDto>,
    @SerializedName("generalComments") val generalComments: String?,
    @SerializedName("identifiedHazards") val identifiedHazards: String?,
    @SerializedName("isOfflineExplicit") val isOfflineExplicit: Boolean = false
)

data class PhotoRecordDto(
    @SerializedName("id") val id: String? = null,
    @SerializedName("clientPhotoId") val clientPhotoId: String? = null,
    @SerializedName("photoType") val photoType: String? = null,
    @SerializedName("storageKey") val storageKey: String? = null,
    @SerializedName("dataUrl") val dataUrl: String? = null,
    @SerializedName("fileSizeBytes") val fileSizeBytes: Long? = null,
    @SerializedName("mimeType") val mimeType: String? = null,
    @SerializedName("checksumSha256") val checksumSha256: String? = null
)

data class ReportResponseData(
    @SerializedName("id") val id: String?,
    @SerializedName("clientReportId") val clientReportId: String?,
    @SerializedName("technicianId") val technicianId: String?,
    @SerializedName("technicianName") val technicianName: String?,
    @SerializedName("workDate") val workDate: String?,
    @SerializedName("status") val status: String?,
    @SerializedName("submissionType") val submissionType: String?,
    @SerializedName("officialClockInTime") val officialClockInTime: String?,
    @SerializedName("serverSyncedAt") val serverSyncedAt: String?,
    @SerializedName("lateStatus") val lateStatus: String?,
    @SerializedName("lateDurationMinutes") val lateDurationMinutes: Int?,
    @SerializedName("photos") val photos: List<PhotoRecordDto>? = null
)

data class BatchSyncResponseDto(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: ReportResponseData?,
    @SerializedName("error") val error: String? = null,
    @SerializedName("message") val message: String? = null
)

data class DirectPhotoUploadResponseDto(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: PhotoRecordDto?,
    @SerializedName("error") val error: String? = null
)

data class IncidentUploadDto(
    @SerializedName("id") val id: String,
    @SerializedName("technicianId") val technicianId: String,
    @SerializedName("technicianName") val technicianName: String,
    @SerializedName("title") val title: String,
    @SerializedName("incidentType") val incidentType: String,
    @SerializedName("riskLevel") val riskLevel: String,
    @SerializedName("description") val description: String,
    @SerializedName("immediateActionTaken") val immediateActionTaken: String,
    @SerializedName("latitude") val latitude: Double?,
    @SerializedName("longitude") val longitude: Double?,
    @SerializedName("photoUrl") val photoUrl: String?
)

data class IncidentUploadResponseDto(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: Map<String, Any>? = null,
    @SerializedName("error") val error: String? = null
)

data class HealthResponseDto(
    @SerializedName("status") val status: String? = null,
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("serverTime") val serverTime: String? = null
)
