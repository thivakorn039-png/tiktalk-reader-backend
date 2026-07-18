package com.tiktalk.reader.di

import android.content.Context
import com.tiktalk.reader.data.repository.SettingsRepositoryImpl
import com.tiktalk.reader.data.tts.TTSManager
import com.tiktalk.reader.data.websocket.TikTalkWebSocketClient
import com.tiktalk.reader.domain.repository.SettingsRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    @Provides
    @Singleton
    fun provideSettingsRepository(@ApplicationContext context: Context): SettingsRepository {
        return SettingsRepositoryImpl(context)
    }
    
    @Provides
    @Singleton
    fun provideTTSManager(@ApplicationContext context: Context): TTSManager {
        return TTSManager(context)
    }
    
    @Provides
    @Singleton
    fun provideWebSocketClient(): TikTalkWebSocketClient {
        return TikTalkWebSocketClient()
    }
}