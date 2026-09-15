package com.fieldpulse.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Slate900 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Slate700 = Color(0xFF334155)
val Amber500 = Color(0xFFF59E0B)
val Amber600 = Color(0xFFD97706)
val Amber400 = Color(0xFFFBBF24)
val Emerald600 = Color(0xFF059669)
val Rose600 = Color(0xFFE11D48)
val LightBg = Color(0xFFF8FAFC)
val DarkBg = Color(0xFF0B0F19)

private val DarkColorScheme = darkColorScheme(
    primary = Amber500,
    secondary = Amber400,
    tertiary = Emerald600,
    background = DarkBg,
    surface = Slate900,
    onPrimary = Slate900,
    onBackground = Color.White,
    onSurface = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = Amber500,
    secondary = Amber600,
    tertiary = Emerald600,
    background = LightBg,
    surface = Color.White,
    onPrimary = Color.Black,
    onBackground = Slate900,
    onSurface = Slate900
)

@Composable
fun FieldPulseTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
