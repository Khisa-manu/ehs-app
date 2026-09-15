# Spectrum Engineering EHS Native Android (Kotlin & Jetpack Compose)

This directory contains the 100% native Android application for **Spectrum Engineering EHS**, implemented in **Kotlin** and modern **Jetpack Compose**.

---

## 📱 Native Features Included

- **Authentication & Login Portal**: Full technician credential sign-in, safety PIN authorization, demo fast-select, and secure logout with session caching.
- **Jetpack Compose UI**: Modern declarative UI with Material 3 theming (Dark Slate + Safety Amber).
- **Room Database (SQLite)**: Full local offline data storage and sync queue for field technician clock-in records and EHS safety incident reports.
- **Location & Geofencing**: Fine & coarse location APIs with tamper/mock location spoof detection.
- **CameraX Integration**: Site photo capture and visual hazard documentation.
- **Coroutines & Flow**: Reactive data streams with StateFlow and ViewModel lifecycle architecture.

---

## 🚀 How to Run & Build in Android Studio

1. Open **Android Studio** (Ladybug / Koala or newer).
2. Select **Open**, and navigate to the `android/` directory of this project.
3. Allow Gradle to sync dependencies.
4. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. Click **Run (`Shift + F10`)** to launch on an Android Device or Emulator.

---

## 📦 How to Create an Android Applet in Google AI Studio

If you want Google AI Studio to compile and preview Kotlin apps natively:
1. In AI Studio, click **New Applet**.
2. Select the **Android (Kotlin + Jetpack Compose)** project template.
3. Paste these source files into your new Android workspace:
   - `MainActivity.kt`
   - `LoginScreen.kt`
   - `FieldPulseViewModel.kt`
   - `ClockInScreen.kt`
   - `EHSReportScreen.kt`
   - `RecordsScreen.kt`
   - `FieldPulseDatabase.kt`
   - `Models.kt`
4. AI Studio will run `assembleDebug` automatically and generate `app-debug.apk`.
