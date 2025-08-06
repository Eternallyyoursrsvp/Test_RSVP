import { db, pgClient } from "../server/db";

async function addAccommodationModeTransportColumns() {
  console.log("Adding accommodation and travel columns to the database...");

  try {
    // Check if accommodation_mode column exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wedding_events' AND column_name = 'accommodation_mode';
    `;

    const result = await pgClient.unsafe(checkColumnQuery);
    
    if (result.length === 0) {
      console.log("accommodation_mode column does not exist. Adding columns...");
      
      // Add the missing columns
      await pgClient.unsafe(`
        ALTER TABLE wedding_events
        ADD COLUMN IF NOT EXISTS accommodation_mode TEXT DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS accommodation_special_deals TEXT,
        ADD COLUMN IF NOT EXISTS accommodation_instructions TEXT,
        ADD COLUMN IF NOT EXISTS accommodation_hotel_name TEXT,
        ADD COLUMN IF NOT EXISTS accommodation_hotel_address TEXT,
        ADD COLUMN IF NOT EXISTS accommodation_hotel_phone TEXT,
        ADD COLUMN IF NOT EXISTS accommodation_hotel_website TEXT,
        ADD COLUMN IF NOT EXISTS accommodation_special_rates TEXT,
        
        ADD COLUMN IF NOT EXISTS transport_mode TEXT DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS transport_special_deals TEXT,
        ADD COLUMN IF NOT EXISTS transport_instructions TEXT,
        ADD COLUMN IF NOT EXISTS transport_provider_name TEXT,
        ADD COLUMN IF NOT EXISTS transport_provider_contact TEXT,
        ADD COLUMN IF NOT EXISTS transport_provider_website TEXT,
        
        ADD COLUMN IF NOT EXISTS flight_mode TEXT DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS flight_special_deals TEXT,
        ADD COLUMN IF NOT EXISTS flight_instructions TEXT,
        ADD COLUMN IF NOT EXISTS recommended_airlines TEXT,
        ADD COLUMN IF NOT EXISTS airline_discount_codes TEXT,
        
        ADD COLUMN IF NOT EXISTS default_arrival_location TEXT,
        ADD COLUMN IF NOT EXISTS default_departure_location TEXT;
      `);

      console.log("Successfully added accommodation and travel columns");
    } else {
      console.log("accommodation_mode column already exists. No changes needed.");
    }

    // Create hotels table for multiple hotels
    await pgClient.unsafe(`
      CREATE TABLE IF NOT EXISTS hotels (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        website TEXT,
        room_types TEXT,
        special_rates TEXT,
        booking_instructions TEXT,
        is_default BOOLEAN DEFAULT false,
        FOREIGN KEY (event_id) REFERENCES wedding_events(id) ON DELETE CASCADE
      );
    `);
    
    console.log("Successfully created hotels table");

  } catch (error) {
    console.error("Error adding accommodation and travel columns:", error);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// Run the migration
addAccommodationModeTransportColumns()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });