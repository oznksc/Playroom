package com.playroom.runtime.kmp

/**
 * Kotlin Multiplatform expect/actual abstractions for Playroom Runtime.
 */

enum class PlatformType {
    DESKTOP,
    ANDROID,
    IOS,
    WEB
}

interface PlatformBridge {
    val platformType: PlatformType
    fun log(tag: String, message: String)
    fun getStorageValue(key: String, defaultValue: String): String
    fun setStorageValue(key: String, value: String)
    fun showToast(message: String)
    fun vibrate(durationMs: Long)
}

class DefaultPlatformBridge(override val platformType: PlatformType = PlatformType.DESKTOP) : PlatformBridge {
    private val memoryStore = mutableMapOf<String, String>()

    override fun log(tag: String, message: String) {
        println("[$tag] $message")
    }

    override fun getStorageValue(key: String, defaultValue: String): String {
        return memoryStore[key] ?: defaultValue
    }

    override fun setStorageValue(key: String, value: String) {
        memoryStore[key] = value
    }

    override fun showToast(message: String) {
        log("Toast", message)
    }

    override fun vibrate(durationMs: Long) {
        log("Haptics", "Vibrate for ${durationMs}ms")
    }
}
