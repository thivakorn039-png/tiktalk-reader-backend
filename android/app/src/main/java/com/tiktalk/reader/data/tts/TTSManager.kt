package com.tiktalk.reader.data.tts

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TTSManager @Inject constructor(private val context: Context) : TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private var isInitialized = false

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking = _isSpeaking.asStateFlow()

    private val _currentText = MutableStateFlow<String?>(null)
    val currentText = _currentText.asStateFlow()

    private val speakChannel = Channel<Unit>(Channel.RENDEZVOUS)

    init {
        tts = TextToSpeech(context, this)
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale("th", "TH"))
            if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
                isInitialized = true
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        _isSpeaking.value = true
                    }
                    override fun onDone(utteranceId: String?) {
                        _isSpeaking.value = false
                        _currentText.value = null
                        speakChannel.trySend(Unit)
                    }
                    override fun onError(utteranceId: String?) {
                        _isSpeaking.value = false
                        _currentText.value = null
                        speakChannel.trySend(Unit)
                    }
                })
            }
        }
    }

    suspend fun speakAndWait(text: String, speed: Float, pitch: Float, volume: Float) {
        if (!isInitialized || text.isBlank()) return
        
        tts?.setSpeechRate(speed)
        tts?.setPitch(pitch)
        
        val params = Bundle().apply {
            putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume)
        }
        
        val utteranceId = System.currentTimeMillis().toString()
        _currentText.value = text
        tts?.speak(text, TextToSpeech.QUEUE_ADD, params, utteranceId)
        
        // Wait until onDone is called
        speakChannel.receive()
    }

    fun stop() {
        tts?.stop()
        _isSpeaking.value = false
        _currentText.value = null
        // Clear channel
        while (speakChannel.tryReceive().isSuccess) {}
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
    }
}