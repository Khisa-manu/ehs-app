package com.fieldpulse.app.data.local

import android.content.Context
import androidx.room.*
import com.fieldpulse.app.data.model.ClockRecord
import com.fieldpulse.app.data.model.EHSIncident
import com.fieldpulse.app.data.model.SyncStatus
import com.fieldpulse.app.data.model.Technician
import kotlinx.coroutines.flow.Flow

@Dao
interface ClockRecordDao {
    @Query("SELECT * FROM clock_records ORDER BY timestamp DESC")
    fun getAllRecords(): Flow<List<ClockRecord>>

    @Query("SELECT * FROM clock_records WHERE syncStatus = 'PENDING_OFFLINE'")
    suspend fun getPendingOfflineRecords(): List<ClockRecord>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: ClockRecord)

    @Update
    suspend fun updateRecord(record: ClockRecord)

    @Query("DELETE FROM clock_records WHERE id = :id")
    suspend fun deleteRecord(id: String)
}

@Dao
interface EHSIncidentDao {
    @Query("SELECT * FROM ehs_incidents ORDER BY timestamp DESC")
    fun getAllIncidents(): Flow<List<EHSIncident>>

    @Query("SELECT * FROM ehs_incidents WHERE syncStatus = 'PENDING_OFFLINE'")
    suspend fun getPendingOfflineIncidents(): List<EHSIncident>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIncident(incident: EHSIncident)

    @Update
    suspend fun updateIncident(incident: EHSIncident)
}

@Dao
interface TechnicianDao {
    @Query("SELECT * FROM technicians ORDER BY name ASC")
    fun getAllTechnicians(): Flow<List<Technician>>

    @Query("SELECT * FROM technicians WHERE id = :id")
    suspend fun getTechnicianById(id: String): Technician?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTechnician(technician: Technician)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(technicians: List<Technician>)

    @Update
    suspend fun updateTechnician(technician: Technician)

    @Query("DELETE FROM technicians WHERE id = :id")
    suspend fun deleteTechnician(id: String)

    @Query("SELECT COUNT(*) FROM technicians")
    suspend fun getCount(): Int
}

@Database(entities = [ClockRecord::class, EHSIncident::class, Technician::class], version = 3, exportSchema = false)
@TypeConverters(Converters::class)
abstract class FieldPulseDatabase : RoomDatabase() {
    abstract fun clockRecordDao(): ClockRecordDao
    abstract fun ehsIncidentDao(): EHSIncidentDao
    abstract fun technicianDao(): TechnicianDao

    companion object {
        @Volatile
        private var INSTANCE: FieldPulseDatabase? = null

        fun getDatabase(context: Context): FieldPulseDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    FieldPulseDatabase::class.java,
                    "fieldpulse_db"
                ).fallbackToDestructiveMigration().build()
                INSTANCE = instance
                instance
            }
        }
    }
}
