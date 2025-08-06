/**
 * Script to add flight buffer hour fields to the wedding events table
 */
import { db, pgClient } from "../server/db";

async function addFlightBufferFields() {
  console.log("Adding flight buffer hour fields to wedding_events table...");

  try {
    // Check if the buffer fields already exist
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wedding_events' 
      AND column_name IN ('departure_buffer_hours', 'arrival_buffer_hours');
    `;
    
    const result = await pgClient.unsafe(checkQuery);
    
    if (result.length === 0) {
      console.log("Buffer hour fields do not exist. Adding them...");
      
      // Add the new buffer hour fields
      await pgClient.unsafe(`
        ALTER TABLE wedding_events
        ADD COLUMN IF NOT EXISTS departure_buffer_hours INTEGER DEFAULT 3,
        ADD COLUMN IF NOT EXISTS arrival_buffer_hours INTEGER DEFAULT 1;
      `);
      
      console.log("✅ Successfully added flight buffer hour fields:");
      console.log("  - departure_buffer_hours (default: 3)");
      console.log("  - arrival_buffer_hours (default: 1)");
    } else {
      console.log("✅ Flight buffer hour fields already exist");
    }
  } catch (error) {
    console.error("❌ Error adding flight buffer hour fields:", error);
    throw error;
  }
}

async function main() {
  try {
    await addFlightBufferFields();
    console.log("✅ Flight buffer fields setup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Flight buffer fields setup failed:", error);
    process.exit(1);
  }
}

main();