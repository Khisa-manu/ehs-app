package com.fieldpulse.app.data.remote

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.google.gson.Gson
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class FieldPulseApiClient private constructor(private val context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences("fieldpulse_network_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val TAG = "FieldPulseApiClient"
        const val DEFAULT_BASE_URL = "http://10.0.2.2:3000"
        private const val PREF_KEY_BASE_URL = "backend_base_url"

        @Volatile
        private var INSTANCE: FieldPulseApiClient? = null

        fun getInstance(context: Context): FieldPulseApiClient {
            return INSTANCE ?: synchronized(this) {
                val instance = FieldPulseApiClient(context.applicationContext)
                INSTANCE = instance
                instance
            }
        }
    }

    var baseUrl: String
        get() = prefs.getString(PREF_KEY_BASE_URL, DEFAULT_BASE_URL)?.trimEnd('/') ?: DEFAULT_BASE_URL
        set(value) {
            val cleaned = value.trim().trimEnd('/')
            prefs.edit().putString(PREF_KEY_BASE_URL, cleaned).apply()
        }

    /**
     * Tests connectivity to the backend server.
     */
    suspend fun testConnection(): ApiResult<String> = withContext(Dispatchers.IO) {
        val candidates = listOf(
            "$baseUrl/v1/health",
            "$baseUrl/api/v1/health",
            "$baseUrl/cpanel-backend/v1/health"
        )

        var lastError: String? = null
        for (urlStr in candidates) {
            try {
                val url = URL(urlStr)
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 5000
                    readTimeout = 5000
                    setRequestProperty("Accept", "application/json")
                }

                val code = conn.responseCode
                if (code in 200..299) {
                    val reader = BufferedReader(InputStreamReader(conn.inputStream))
                    val response = reader.readText()
                    reader.close()
                    conn.disconnect()
                    return@withContext ApiResult.Success("Connected successfully to $urlStr (HTTP $code)")
                } else {
                    lastError = "HTTP $code from $urlStr"
                }
                conn.disconnect()
            } catch (e: Exception) {
                lastError = "${e.javaClass.simpleName}: ${e.message}"
            }
        }

        ApiResult.Error(lastError ?: "Failed to reach backend server at $baseUrl")
    }

    /**
     * Uploads an individual evidence photo directly to PHP/MySQL backend or Vite SQLite API.
     */
    suspend fun uploadPhotoDirect(photo: PhotoItemDto): ApiResult<PhotoRecordDto> = withContext(Dispatchers.IO) {
        val candidates = listOf(
            "$baseUrl/v1/photos/upload-direct",
            "$baseUrl/api/v1/photos/upload-direct",
            "$baseUrl/cpanel-backend/v1/photos/upload-direct"
        )

        val jsonBody = gson.toJson(photo)

        for (endpoint in candidates) {
            try {
                val result = executePost(endpoint, jsonBody)
                if (result.isSuccess) {
                    val respDto = gson.fromJson((result as ApiResult.Success).data, DirectPhotoUploadResponseDto::class.java)
                    if (respDto.success && respDto.data != null) {
                        return@withContext ApiResult.Success(respDto.data)
                    } else {
                        return@withContext ApiResult.Error(respDto.error ?: "Photo upload rejected by server")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Photo upload endpoint $endpoint failed: ${e.message}")
            }
        }

        ApiResult.Error("Unable to upload photo to backend at $baseUrl")
    }

    /**
     * Synchronizes a complete daily clock-in report with evidence photos and EHS audit checklist.
     */
    suspend fun syncBatchReport(payload: BatchSyncRequestDto): ApiResult<ReportResponseData> = withContext(Dispatchers.IO) {
        val candidates = listOf(
            "$baseUrl/v1/sync/batch",
            "$baseUrl/api/v1/sync/batch",
            "$baseUrl/cpanel-backend/v1/sync/batch"
        )

        val jsonBody = gson.toJson(payload)
        var lastError: String? = null

        for (endpoint in candidates) {
            try {
                val result = executePost(endpoint, jsonBody)
                if (result is ApiResult.Success) {
                    val respDto = gson.fromJson(result.data, BatchSyncResponseDto::class.java)
                    if (respDto.success && respDto.data != null) {
                        return@withContext ApiResult.Success(respDto.data)
                    } else {
                        lastError = respDto.error ?: respDto.message ?: "Batch sync failed"
                    }
                } else if (result is ApiResult.Error) {
                    lastError = result.message
                }
            } catch (e: Exception) {
                lastError = "${e.javaClass.simpleName}: ${e.message}"
                Log.w(TAG, "Sync batch endpoint $endpoint failed: ${e.message}")
            }
        }

        ApiResult.Error(lastError ?: "Failed to synchronize report to $baseUrl")
    }

    /**
     * Reports an EHS incident or safety hazard to backend.
     */
    suspend fun submitIncident(incident: IncidentUploadDto): ApiResult<Boolean> = withContext(Dispatchers.IO) {
        val candidates = listOf(
            "$baseUrl/v1/ehs/incidents",
            "$baseUrl/api/v1/ehs/incidents",
            "$baseUrl/cpanel-backend/v1/ehs/incidents"
        )

        val jsonBody = gson.toJson(incident)
        var lastError: String? = null

        for (endpoint in candidates) {
            try {
                val result = executePost(endpoint, jsonBody)
                if (result is ApiResult.Success) {
                    val respDto = gson.fromJson(result.data, IncidentUploadResponseDto::class.java)
                    if (respDto.success) {
                        return@withContext ApiResult.Success(true)
                    } else {
                        lastError = respDto.error ?: "Incident upload rejected"
                    }
                } else if (result is ApiResult.Error) {
                    lastError = result.message
                }
            } catch (e: Exception) {
                lastError = "${e.javaClass.simpleName}: ${e.message}"
            }
        }

        ApiResult.Error(lastError ?: "Failed to report incident to $baseUrl")
    }

    private fun executePost(endpoint: String, jsonBody: String): ApiResult<String> {
        var conn: HttpURLConnection? = null
        return try {
            val url = URL(endpoint)
            conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 12000
                readTimeout = 20000
                doOutput = true
                doInput = true
                setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "FieldPulse-Android/1.0")
            }

            val writer = OutputStreamWriter(conn.outputStream, Charsets.UTF_8)
            writer.write(jsonBody)
            writer.flush()
            writer.close()

            val statusCode = conn.responseCode
            val isSuccess = statusCode in 200..299

            val inputStream = if (isSuccess) conn.inputStream else conn.errorStream
            val reader = BufferedReader(InputStreamReader(inputStream ?: conn.inputStream, Charsets.UTF_8))
            val responseText = reader.readText()
            reader.close()

            if (isSuccess) {
                ApiResult.Success(responseText)
            } else {
                ApiResult.Error("Server returned HTTP $statusCode: $responseText", statusCode)
            }
        } catch (e: Exception) {
            ApiResult.Error("Network error connecting to $endpoint: ${e.message}", 0, e)
        } finally {
            conn?.disconnect()
        }
    }
}
