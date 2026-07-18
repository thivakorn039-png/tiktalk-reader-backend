package com.tiktalk.reader.data.models

data class AppSettings(
    val readComments: Boolean = true,
    val readGifts: Boolean = true,
    val readFollowers: Boolean = true,
    val speechSpeed: Float = 1.0f,
    val speechPitch: Float = 1.0f,
    val speechVolume: Float = 1.0f,
    val commentTemplate: String = "{user} กล่าวว่า {message}",
    val giftTemplate: String = "ขอบคุณ {user} ที่ส่ง {gift} จำนวน {count}",
    val followTemplate: String = "ขอบคุณ {user} ที่กดติดตาม"
)