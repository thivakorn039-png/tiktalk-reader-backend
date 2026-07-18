package com.tiktalk.reader.data.websocket

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.tiktalk.reader.data.models.TikTokEvent
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TikTalkWebSocketClient @Inject constructor() {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(20, TimeUnit.SECONDS)
        .build()
        
    private var webSocket: WebSocket? = null
    private val gson = Gson()
    
    private val _events = MutableSharedFlow<TikTokEvent>(extraBufferCapacity = 50)
    val events = _events.asSharedFlow()
    
    // Hardcoded Render URL. In production, this might come from Config/BuildType
    private val WS_URL = "wss://tiktalk-reader.onrender.com/ws"
    
    fun connect(username: String) {
        disconnect()
        val request = Request.Builder().url(WS_URL).build()
        
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val connectMsg = JsonObject().apply {
                    addProperty("action", "connect")
                    addProperty("username", username)
                }
                webSocket.send(gson.toJson(connectMsg))
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = gson.fromJson(text, JsonObject::class.java)
                    val type = json.get("type")?.asString ?: return
                    
                    val event = when(type) {
                        "comment" -> TikTokEvent.Comment(
                            user = json.get("user")?.asString ?: "",
                            message = json.get("message")?.asString ?: ""
                        )
                        "gift" -> TikTokEvent.Gift(
                            user = json.get("user")?.asString ?: "",
                            gift = json.get("gift")?.asString ?: "",
                            count = json.get("count")?.asInt ?: 1
                        )
                        "follow" -> TikTokEvent.Follow(
                            user = json.get("user")?.asString ?: ""
                        )
                        "status" -> TikTokEvent.Status(
                            status = json.get("status")?.asString ?: "",
                            message = json.get("message")?.asString ?: ""
                        )
                        else -> null
                    }
                    
                    event?.let { _events.tryEmit(it) }
                    
                } catch (e: Exception) {
                    Log.e("WS", "Parse error", e)
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _events.tryEmit(TikTokEvent.Status("disconnected"))
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _events.tryEmit(TikTokEvent.Status("error", t.message ?: "Unknown error"))
            }
        })
    }
    
    fun disconnect() {
        try {
            val disconnectMsg = JsonObject().apply { addProperty("action", "disconnect") }
            webSocket?.send(gson.toJson(disconnectMsg))
        } catch (e: Exception) {
            // ignore
        }
        webSocket?.close(1000, "User disconnected")
        webSocket = null
        _events.tryEmit(TikTokEvent.Status("disconnected"))
    }
}