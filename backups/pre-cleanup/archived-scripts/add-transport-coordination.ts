/**
 * Script to add enhanced transport coordination tables for three-party system
 * Planner → Vendor → Airport Rep coordination
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addTransportCoordinationTables() {
  console.log("Adding transport coordination tables...");

  try {
    // Transport Vendors table
    const checkVendorsTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'transport_vendors'
    `);
    
    if (checkVendorsTable.length === 0) {
      console.log("Creating transport_vendors table...");
      await db.execute(sql`
        CREATE TABLE transport_vendors (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          contact_person TEXT,
          phone TEXT,
          email TEXT,
          whatsapp_number TEXT,
          vehicle_fleet JSONB,
          specialization TEXT[],
          status TEXT DEFAULT 'active',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log("✅ transport_vendors table created successfully");
    }

    // Location Representatives table
    const checkRepsTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'location_representatives'
    `);
    
    if (checkRepsTable.length === 0) {
      console.log("Creating location_representatives table...");
      await db.execute(sql`
        CREATE TABLE location_representatives (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          location_type TEXT,
          location_name TEXT,
          terminal_gate TEXT,
          phone TEXT,
          whatsapp_number TEXT,
          login_credentials JSONB,
          status TEXT DEFAULT 'active',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log("✅ location_representatives table created successfully");
    }

    // Event Vehicles table
    const checkVehiclesTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'event_vehicles'
    `);
    
    if (checkVehiclesTable.length === 0) {
      console.log("Creating event_vehicles table...");
      await db.execute(sql`
        CREATE TABLE event_vehicles (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL,
          vendor_id INTEGER NOT NULL,
          vehicle_type TEXT NOT NULL,
          vehicle_name TEXT,
          capacity INTEGER NOT NULL,
          available_count INTEGER NOT NULL,
          hourly_rate DECIMAL,
          features TEXT[],
          status TEXT DEFAULT 'available',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log("✅ event_vehicles table created successfully");
    }

    // Add coordination fields to existing transport_groups table
    console.log("Adding coordination fields to transport_groups table...");
    await db.execute(sql`
      ALTER TABLE transport_groups 
      ADD COLUMN IF NOT EXISTS assigned_vendor_id INTEGER,
      ADD COLUMN IF NOT EXISTS airport_rep_id INTEGER,
      ADD COLUMN IF NOT EXISTS vehicle_id INTEGER,
      ADD COLUMN IF NOT EXISTS pickup_status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS guests_picked_up INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_guests INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS delay_notifications JSONB,
      ADD COLUMN IF NOT EXISTS real_time_updates JSONB
    `);

    // Guest Travel Info table
    const checkTravelInfoTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'guest_travel_info'
    `);
    
    if (checkTravelInfoTable.length === 0) {
      console.log("Creating guest_travel_info table...");
      await db.execute(sql`
        CREATE TABLE guest_travel_info (
          id SERIAL PRIMARY KEY,
          guest_id INTEGER NOT NULL,
          event_id INTEGER NOT NULL,
          arrival_method TEXT,
          flight_number TEXT,
          train_number TEXT,
          scheduled_arrival TIMESTAMP,
          actual_arrival TIMESTAMP,
          delay_minutes INTEGER DEFAULT 0,
          status TEXT DEFAULT 'scheduled',
          terminal_gate TEXT,
          luggage_count INTEGER,
          special_assistance BOOLEAN DEFAULT FALSE,
          last_updated TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log("✅ guest_travel_info table created successfully");
    }

    console.log("✅ All transport coordination tables created successfully");
  } catch (error) {
    console.error("❌ Error creating transport coordination tables:", error);
    throw error;
  }
}

async function main() {
  try {
    await addTransportCoordinationTables();
    console.log("✅ Transport coordination setup completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Transport coordination setup failed:", error);
    process.exit(1);
  }
}

// Run if called directly
main();

export { addTransportCoordinationTables };