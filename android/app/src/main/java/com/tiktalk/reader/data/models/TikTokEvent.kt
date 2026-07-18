package com.tiktalk.reader.data.models

sealed class TikTokEvent {
    abstract val user: String
    
    data class Comment(override val user: String, val message: String) : TikTokEvent()
    data class Gift(override val user: String, val gift: String, val count: Int) : TikTokEvent()
    data class Follow(override val user: String) : TikTokEvent()
    data class Status(val status: String, val message: String = "") : TikTokEvent()
}