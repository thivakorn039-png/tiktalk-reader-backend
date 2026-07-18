package com.tiktalk.reader.presentation.home

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tiktalk.reader.data.tts.TTSManager
import com.tiktalk.reader.service.ReaderForegroundService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    ttsManager: TTSManager
) : ViewModel() {

    val connectionStatus: StateFlow<String> = ReaderForegroundService.connectionStatus
    val queueCount: StateFlow<Int> = ReaderForegroundService.queueCount
    val currentSpeaking: StateFlow<String?> = ttsManager.currentText
        .stateIn(viewModelScope, SharingStarted.Lazily, null)

    fun startService(username: String) {
        val cleanUsername = if (username.startsWith("@")) username.substring(1) else username
        val intent = Intent(context, ReaderForegroundService::class.java).apply {
            action = ReaderForegroundService.ACTION_START
            putExtra(ReaderForegroundService.EXTRA_USERNAME, cleanUsername)
        }
        context.startForegroundService(intent)
    }

    fun stopService() {
        val intent = Intent(context, ReaderForegroundService::class.java).apply {
            action = ReaderForegroundService.ACTION_STOP
        }
        context.startService(intent)
    }
}