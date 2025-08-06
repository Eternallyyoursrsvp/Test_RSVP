/**
 * Script to migrate buffer hour fields from integer hours to HH:MM time format
 */
import { db, pgClient } from "../server/db";

async function migrateBufferHoursToTime() {
  console.log("Migrating buffer hour fields to time format...");

  try {
    // Check if the new time columns exist
    const checkNewColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wedding_events' 
      AND column_name IN ('departure_buffer_time', 'arrival_buffer_time');
    `;
    
    const newColumns = await pgClient.unsafe(checkNewColumnsQuery);
    
    if (newColumns.length === 0) {
      console.log("Adding new time format buffer columns...");
      
      // Add new time format columns
      await pgClient.unsafe(`
        ALTER TABLE wedding_events
        ADD COLUMN IF NOT EXISTS departure_buffer_time TEXT DEFAULT '03:00',
        ADD COLUMN IF NOT EXISTS arrival_buffer_time TEXT DEFAULT '00:30';
      `);
      
      console.log("✅ Added new time format columns");
    }

    // Migrate existing data from hour columns to time format if they exist
    const checkOldColumnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wedding_events' 
      AND column_name IN ('departure_buffer_hours', 'arrival_buffer_hours');
    `;
    
    const oldColumns = await pgClient.unsafe(checkOldColumnsQuery);
    
    if (oldColumns.length > 0) {
      console.log("Found old hour columns, migrating data...");
      
      // Convert existing hour values to HH:MM format
      await pgClient.unsafe(`
        UPDATE wedding_events 
        SET 
          departure_buffer_time = LPAD(COALESCE(departure_buffer_hours, 3)::text, 2, '0') || ':00',
          arrival_buffer_time = LPAD(COALESCE(arrival_buffer_hours, 1)::text, 2, '0') || ':00'
        WHERE departure_buffer_time IS NULL OR arrival_buffer_time IS NULL;
      `);
      
      console.log("✅ Migrated data from hours to time format");
      
      // Drop old hour columns
      await pgClient.unsafe(`
        ALTER TABLE wedding_events
        DROP COLUMN IF EXISTS departure_buffer_hours,
        DROP COLUMN IF EXISTS arrival_buffer_hours;
      `);
      
      console.log("✅ Removed old hour columns");
    }
    
    console.log("✅ Buffer time migration completed successfully");
  } catch (error) {
    console.error("❌ Error migrating buffer times:", error);
    throw error;
  }
}

async function main() {
  try {
    await migrateBufferHoursToTime();
    console.log("✅ Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();