package com.tiktalk.reader.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.tiktalk.reader.data.models.AppSettings
import com.tiktalk.reader.domain.repository.SettingsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    context: Context
) : SettingsRepository {
    private val prefs: SharedPreferences = context.getSharedPreferences("tiktalk_settings", Context.MODE_PRIVATE)
    private val gson = Gson()
    
    private val _settings = MutableStateFlow(loadSettings())
    override val settings: StateFlow<AppSettings> = _settings.asStateFlow()
    
    private fun loadSettings(): AppSettings {
        val json = prefs.getString("settings", null)
        return if (json != null) {
            try {
                gson.fromJson(json, AppSettings::class.java)
            } catch (e: Exception) {
                AppSettings()
            }
        } else {
            AppSettings()
        }
    }
    
    override suspend fun updateSettings(newSettings: AppSettings) {
        prefs.edit().putString("settings", gson.toJson(newSettings)).apply()
        _settings.value = newSettings
    }
}