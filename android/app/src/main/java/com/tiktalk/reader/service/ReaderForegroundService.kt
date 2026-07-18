package com.tiktalk.reader.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.tiktalk.reader.MainActivity
import com.tiktalk.reader.data.models.TikTokEvent
import com.tiktalk.reader.data.tts.TTSManager
import com.tiktalk.reader.data.websocket.TikTalkWebSocketClient
import com.tiktalk.reader.domain.repository.SettingsRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

@AndroidEntryPoint
class ReaderForegroundService : Service() {

    @Inject lateinit var webSocketClient: TikTalkWebSocketClient
    @Inject lateinit var ttsManager: TTSManager
    @Inject lateinit var settingsRepository: SettingsRepository

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Priority Queues using channels or lists
    private val giftQueue = mutableListOf<TikTokEvent.Gift>()
    private val followQueue = mutableListOf<TikTokEvent.Follow>()
    private val commentQueue = mutableListOf<TikTokEvent.Comment>()
    
    private var isProcessingQueue = false

    companion object {
        const val CHANNEL_ID = "ReaderServiceChannel"
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val EXTRA_USERNAME = "EXTRA_USERNAME"
        
        private val _eventHistory = MutableStateFlow<List<TikTokEvent>>(emptyList())
        val eventHistory = _eventHistory.asStateFlow()
        
        private val _connectionStatus = MutableStateFlow("disconnected")
        val connectionStatus = _connectionStatus.asStateFlow()
        
        private val _queueCount = MutableStateFlow(0)
        val queueCount = _queueCount.asStateFlow()
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        
        serviceScope.launch {
            webSocketClient.events.collect { event ->
                handleEvent(event)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val username = intent.getStringExtra(EXTRA_USERNAME) ?: return START_NOT_STICKY
                startForegroundServiceNotification(username)
                webSocketClient.connect(username)
            }
            ACTION_STOP -> {
                stopSelf()
            }
        }
        return START_NOT_STICKY
    }

    private fun handleEvent(event: TikTokEvent) {
        when (event) {
            is TikTokEvent.Status -> {
                _connectionStatus.value = event.status
            }
            is TikTokEvent.Gift -> {
                addEventToHistory(event)
                if (settingsRepository.settings.value.readGifts) {
                    giftQueue.add(event)
                    updateQueueCount()
                    processQueue()
                }
            }
            is TikTokEvent.Follow -> {
                addEventToHistory(event)
                if (settingsRepository.settings.value.readFollowers) {
                    followQueue.add(event)
                    updateQueueCount()
                    processQueue()
                }
            }
            is TikTokEvent.Comment -> {
                addEventToHistory(event)
                if (settingsRepository.settings.value.readComments) {
                    commentQueue.add(event)
                    updateQueueCount()
                    processQueue()
                }
            }
        }
    }

    private fun addEventToHistory(event: TikTokEvent) {
        val list = _eventHistory.value.toMutableList()
        list.add(0, event)
        if (list.size > 20) {
            list.removeLast()
        }
        _eventHistory.value = list
    }

    private fun updateQueueCount() {
        _queueCount.value = giftQueue.size + followQueue.size + commentQueue.size
    }

    private fun processQueue() {
        if (isProcessingQueue) return
        isProcessingQueue = true
        
        serviceScope.launch {
            while (isActive) {
                val settings = settingsRepository.settings.value
                val eventToProcess = when {
                    giftQueue.isNotEmpty() -> giftQueue.removeAt(0)
                    followQueue.isNotEmpty() -> followQueue.removeAt(0)
                    commentQueue.isNotEmpty() -> commentQueue.removeAt(0)
                    else -> null
                }

                if (eventToProcess == null) {
                    isProcessingQueue = false
                    break
                }
                
                updateQueueCount()

                val textToSpeak = when (eventToProcess) {
                    is TikTokEvent.Gift -> settings.giftTemplate
                        .replace("{user}", eventToProcess.user)
                        .replace("{gift}", eventToProcess.gift)
                        .replace("{count}", eventToProcess.count.toString())
                    is TikTokEvent.Follow -> settings.followTemplate
                        .replace("{user}", eventToProcess.user)
                    is TikTokEvent.Comment -> settings.commentTemplate
                        .replace("{user}", eventToProcess.user)
                        .replace("{message}", eventToProcess.message)
                    else -> ""
                }
                
                ttsManager.speakAndWait(
                    textToSpeak, 
                    settings.speechSpeed, 
                    settings.speechPitch, 
                    settings.speechVolume
                )
            }
        }
    }

    private fun startForegroundServiceNotification(username: String) {
        val pendingIntent = Intent(this, MainActivity::class.java).let {
            PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
        }
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("TikTalk Reader")
            .setContentText("Reading events for $username")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .build()
            
        startForeground(1, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Reader Service Channel",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        webSocketClient.disconnect()
        ttsManager.stop()
        _eventHistory.value = emptyList()
        _queueCount.value = 0
        _connectionStatus.value = "disconnected"
    }
}