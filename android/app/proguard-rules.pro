# FieldPulse ProGuard / R8 Rules
-keep class com.fieldpulse.app.data.model.** { *; }
-keep class com.fieldpulse.app.data.local.** { *; }
-keep class com.fieldpulse.app.data.remote.** { *; }
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
