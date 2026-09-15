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
     * Resolves smart candidate endpoints based on the configured baseUrl.
     * Prevents duplicate path prefixes (/api/v1/api/v1) and supports both
     * Node/Vite Express endpoints (/api/v1/...) and cPanel PHP endpoints (/v1/... or /cpanel-backend/...).
     */
    fun resolveCandidateEndpoints(subPath: String): List<String> {
        val cleanBase = baseUrl.trim().trimEnd('/')
        val cleanPath = subPath.trim().trimStart('/')

        val list = mutableListOf<String>()

        // 1. Direct path from baseUrl
        list.add("$cleanBase/$cleanPath")

        // 2. Base without trailing /api or /v1 or /cpanel-backend
        var host = cleanBase
        for (prefix in listOf("/api/v1", "/api", "/v1", "/cpanel-backend/api/v1", "/cpanel-backend/v1", "/cpanel-backend")) {
            if (host.endsWith(prefix)) {
                host = host.removeSuffix(prefix).trimEnd('/')
                break
            }
        }

        // Standard candidates
        list.add("$host/api/v1/$cleanPath")
        list.add("$host/v1/$cleanPath")
        list.add("$host/cpanel-backend/v1/$cleanPath")
        list.add("$host/cpanel-backend/api/v1/$cleanPath")
        list.add("$host/cpanel-backend/index.php/v1/$cleanPath")
        list.add("$host/$cleanPath")

        return list.distinct()
    }

    /**
     * Tests connectivity to the backend server.
     */
    suspend fun testConnection(): ApiResult<String> = withContext(Dispatchers.IO) {
        val candidates = resolveCandidateEndpoints("health")

        var lastError: String? = null
        for (urlStr in candidates) {
            try {
                val url = URL(urlStr)
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 6000
                    readTimeout = 8000
                    instanceFollowRedirects = true
                    setRequestProperty("Accept", "application/json")
                    setRequestProperty("User-Agent", "FieldPulse-Android/1.0")
                }

                val code = conn.responseCode
                if (code in 200..299) {
                    val stream = conn.inputStream
                    val response = stream?.let { s ->
                        BufferedReader(InputStreamReader(s, Charsets.UTF_8)).use { it.readText() }
                    } ?: ""
                    conn.disconnect()
                    return@withContext ApiResult.Success("Connected successfully (HTTP $code)")
                } else if (code == 302 || code == 301) {
                    val loc = conn.getHeaderField("Location") ?: ""
                    lastError = "Redirect HTTP $code to $loc. (If using Cloud Run, access requires browser session; use your LAN IP or cPanel host for APK)"
                } else {
                    lastError = "HTTP $code from $urlStr"
                }
                conn.disconnect()
            } catch (e: Exception) {
                lastError = formatNetworkException(e, urlStr)
            }
        }

        ApiResult.Error(lastError ?: "Failed to reach backend server at $baseUrl")
    }

    /**
     * Uploads an individual evidence photo directly to PHP/MySQL backend or Vite SQLite API.
     */
    suspend fun uploadPhotoDirect(photo: PhotoItemDto): ApiResult<PhotoRecordDto> = withContext(Dispatchers.IO) {
        val candidates = resolveCandidateEndpoints("photos/upload-direct")
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
        val candidates = resolveCandidateEndpoints("sync/batch")
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
                        lastError = respDto.error ?: respDto.message ?: "Batch sync rejected by server"
                    }
                } else if (result is ApiResult.Error) {
                    lastError = result.message
                }
            } catch (e: Exception) {
                lastError = formatNetworkException(e, endpoint)
                Log.w(TAG, "Sync batch endpoint $endpoint failed: ${e.message}")
            }
        }

        ApiResult.Error(lastError ?: "Failed to synchronize report to $baseUrl")
    }

    /**
     * Reports an EHS incident or safety hazard to backend.
     */
    suspend fun submitIncident(incident: IncidentUploadDto): ApiResult<Boolean> = withContext(Dispatchers.IO) {
        val candidates = resolveCandidateEndpoints("ehs/incidents")
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
                lastError = formatNetworkException(e, endpoint)
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
                connectTimeout = 15000
                readTimeout = 30000
                instanceFollowRedirects = true
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

            val stream = if (isSuccess) conn.inputStream else conn.errorStream
            val responseText = stream?.let { s ->
                BufferedReader(InputStreamReader(s, Charsets.UTF_8)).use { it.readText() }
            } ?: ""

            if (isSuccess) {
                ApiResult.Success(responseText)
            } else {
                ApiResult.Error("HTTP $statusCode: $responseText", statusCode)
            }
        } catch (e: Exception) {
            val formatted = formatNetworkException(e, endpoint)
            ApiResult.Error(formatted, 0, e)
        } finally {
            conn?.disconnect()
        }
    }

    private fun formatNetworkException(e: Exception, endpoint: String): String {
        val host = try { URL(endpoint).host } catch (_: Exception) { endpoint }
        return when {
            e is java.net.ConnectException && (host == "10.0.2.2" || host == "localhost") ->
                "Connection refused to $host. Note: 10.0.2.2 is for Android Emulator only. On physical phones, set your computer's Wi-Fi LAN IP (e.g. http://192.168.x.x:3000) in Server Settings."
            e is java.net.ConnectException ->
                "Connection refused to $host. Ensure server is running and port 3000 is open in firewall."
            e is java.net.SocketTimeoutException ->
                "Connection timed out reaching $host (exceeded timeout)."
            e is java.net.UnknownHostException ->
                "Could not resolve host '$host'. Check device internet and URL spelling."
            else ->
                "${e.javaClass.simpleName}: ${e.message}"
        }
    }
}
