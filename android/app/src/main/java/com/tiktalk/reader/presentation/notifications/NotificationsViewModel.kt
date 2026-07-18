package com.tiktalk.reader.presentation.notifications

import androidx.lifecycle.ViewModel
import com.tiktalk.reader.data.models.TikTokEvent
import com.tiktalk.reader.service.ReaderForegroundService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject

@HiltViewModel
class NotificationsViewModel @Inject constructor() : ViewModel() {
    val events: StateFlow<List<TikTokEvent>> = ReaderForegroundService.eventHistory
}