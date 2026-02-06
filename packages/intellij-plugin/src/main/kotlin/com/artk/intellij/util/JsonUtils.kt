package com.artk.intellij.util

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.JsonSyntaxException
import java.io.File
import java.lang.reflect.Type

/**
 * Utility functions for JSON operations
 */
object JsonUtils {

    private val gson: Gson = GsonBuilder()
        .setPrettyPrinting()
        .serializeNulls()
        .create()

    /**
     * Parse JSON string to object
     */
    fun <T> fromJson(json: String, classOfT: Class<T>): T? {
        return try {
            gson.fromJson(json, classOfT)
        } catch (e: JsonSyntaxException) {
            null
        }
    }

    /**
     * Parse JSON string to object with type
     */
    fun <T> fromJson(json: String, typeOfT: Type): T? {
        return try {
            gson.fromJson(json, typeOfT)
        } catch (e: JsonSyntaxException) {
            null
        }
    }

    /**
     * Parse JSON file to object
     */
    fun <T> fromFile(file: File, classOfT: Class<T>): T? {
        return try {
            if (!file.exists()) return null
            fromJson(file.readText(), classOfT)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Convert object to JSON string
     */
    fun toJson(obj: Any): String {
        return gson.toJson(obj)
    }

    /**
     * Convert object to JSON and write to file
     */
    fun toFile(file: File, obj: Any): Boolean {
        return try {
            file.parentFile?.mkdirs()
            file.writeText(toJson(obj))
            true
        } catch (e: Exception) {
            false
        }
    }
}
