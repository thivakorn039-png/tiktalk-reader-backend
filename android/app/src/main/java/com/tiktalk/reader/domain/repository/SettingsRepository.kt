package com.tiktalk.reader.domain.repository

import com.tiktalk.reader.data.models.AppSettings
import kotlinx.coroutines.flow.StateFlow

interface SettingsRepository {
    val settings: StateFlow<AppSettings>
    suspend fun updateSettings(newSettings: AppSettings)
}