/**
 * Script to update accommodation table schema adding bedType and maxOccupancy fields
 * and migrating data from capacity field to maxOccupancy
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function updateAccommodationSchema() {
  console.log("🔄 Starting accommodation schema update...");

  try {
    // Check if columns already exist to avoid errors
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'accommodations' 
      AND column_name IN ('bed_type', 'max_occupancy')
    `);
    
    const existingColumns = checkResult.rows.map((row: any) => row.column_name);
    
    // Add bed_type column if it doesn't exist
    if (!existingColumns.includes('bed_type')) {
      console.log("Adding bed_type column...");
      await db.execute(sql`
        ALTER TABLE accommodations 
        ADD COLUMN bed_type TEXT
      `);
    }
    
    // Add max_occupancy column if it doesn't exist
    if (!existingColumns.includes('max_occupancy')) {
      console.log("Adding max_occupancy column...");
      await db.execute(sql`
        ALTER TABLE accommodations 
        ADD COLUMN max_occupancy INTEGER
      `);
      
      // Copy capacity values to max_occupancy
      console.log("Migrating capacity values to max_occupancy...");
      await db.execute(sql`
        UPDATE accommodations 
        SET max_occupancy = capacity 
        WHERE max_occupancy IS NULL
      `);
      
      // Set max_occupancy to not null
      console.log("Setting max_occupancy to NOT NULL...");
      await db.execute(sql`
        ALTER TABLE accommodations 
        ALTER COLUMN max_occupancy SET NOT NULL
      `);
    }
    
    // Remove global_room_type_id if it exists and is causing errors
    const checkGlobalRoomTypeColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'accommodations' 
      AND column_name = 'global_room_type_id'
    `);
    
    if (checkGlobalRoomTypeColumn.rows.length > 0) {
      console.log("Dropping global_room_type_id column...");
      await db.execute(sql`
        ALTER TABLE accommodations 
        DROP COLUMN IF EXISTS global_room_type_id
      `);
    }
    
    console.log("✅ Accommodation schema update completed successfully!");
  } catch (error) {
    console.error("❌ Error updating accommodation schema:", error);
    throw error;
  }
}

async function main() {
  try {
    await updateAccommodationSchema();
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();