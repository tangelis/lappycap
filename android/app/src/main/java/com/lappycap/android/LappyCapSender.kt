package com.lappycap.android

import android.content.Context
import android.util.Log
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.cast.framework.CastSession
import com.google.android.gms.cast.framework.SessionManager
import com.google.android.gms.cast.framework.SessionManagerListener
import org.json.JSONObject

class LappyCapSender(context: Context) {

    companion object {
        private const val TAG = "LappyCapSender"
        private const val NAMESPACE = "urn:x-cast:com.lappycap"
    }

    private val castContext: CastContext = CastContext.getSharedInstance(context)
    private val sessionManager: SessionManager = castContext.sessionManager

    private var onConnectionChanged: ((Boolean) -> Unit)? = null

    private val sessionManagerListener = object : SessionManagerListener<CastSession> {
        override fun onSessionStarting(session: CastSession) {}
        override fun onSessionStarted(session: CastSession, sessionId: String) {
            Log.d(TAG, "Cast session started: $sessionId")
            onConnectionChanged?.invoke(true)
        }
        override fun onSessionStartFailed(session: CastSession, error: Int) {
            Log.e(TAG, "Cast session start failed: $error")
            onConnectionChanged?.invoke(false)
        }
        override fun onSessionEnding(session: CastSession) {}
        override fun onSessionEnded(session: CastSession, error: Int) {
            Log.d(TAG, "Cast session ended")
            onConnectionChanged?.invoke(false)
        }
        override fun onSessionResuming(session: CastSession, sessionId: String) {}
        override fun onSessionResumed(session: CastSession, wasSuspended: Boolean) {
            Log.d(TAG, "Cast session resumed")
            onConnectionChanged?.invoke(true)
        }
        override fun onSessionResumeFailed(session: CastSession, error: Int) {
            onConnectionChanged?.invoke(false)
        }
        override fun onSessionSuspended(session: CastSession, reason: Int) {}
    }

    init {
        sessionManager.addSessionManagerListener(sessionManagerListener, CastSession::class.java)
    }

    fun setOnConnectionChangedListener(listener: (Boolean) -> Unit) {
        onConnectionChanged = listener
    }

    val isConnected: Boolean
        get() = sessionManager.currentCastSession?.isConnected == true

    fun getDeviceName(): String? {
        return sessionManager.currentCastSession?.castDevice?.friendlyName
    }

    fun sendMessage(json: String) {
        val session = sessionManager.currentCastSession
        if (session == null || !session.isConnected) {
            Log.w(TAG, "Cannot send message — no active Cast session")
            return
        }

        try {
            session.sendMessage(NAMESPACE, json)
                .setResultCallback { status ->
                    if (status.isSuccess) {
                        Log.d(TAG, "Message sent: $json")
                    } else {
                        Log.e(TAG, "Failed to send message: ${status.statusCode}")
                    }
                }
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message", e)
        }
    }

    fun sendLoad(audioUrl: String, stationName: String, sceneName: String, volume: Float) {
        val json = JSONObject().apply {
            put("type", "load")
            put("audioUrl", audioUrl)
            put("stationName", stationName)
            put("sceneName", sceneName)
            put("volume", volume.toDouble())
        }
        sendMessage(json.toString())
    }

    fun sendScene(sceneName: String) {
        val json = JSONObject().apply {
            put("type", "scene")
            put("sceneName", sceneName)
        }
        sendMessage(json.toString())
    }

    fun sendNext() {
        sendMessage("""{"type":"next"}""")
    }

    fun sendPrev() {
        sendMessage("""{"type":"prev"}""")
    }

    fun sendShuffle() {
        sendMessage("""{"type":"shuffle"}""")
    }

    fun sendPause() {
        sendMessage("""{"type":"pause"}""")
    }

    fun sendResume() {
        sendMessage("""{"type":"resume"}""")
    }

    fun sendSettings(cycleDuration: Int, blendDuration: Int, volume: Float) {
        val json = JSONObject().apply {
            put("type", "settings")
            put("cycleDuration", cycleDuration)
            put("blendDuration", blendDuration)
            put("volume", volume.toDouble())
        }
        sendMessage(json.toString())
    }

    fun release() {
        sessionManager.removeSessionManagerListener(sessionManagerListener, CastSession::class.java)
    }
}
