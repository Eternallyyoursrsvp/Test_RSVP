/**
 * Script to add transport group management tables to the database
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addTransportTables() {
  console.log("Adding transport module tables...");

  try {
    // Check if transport_groups table already exists
    const checkTransportGroupsTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'transport_groups'
    `);
    
    if (checkTransportGroupsTable.length === 0) {
      console.log("Creating transport_groups table...");
      await db.execute(sql`
        CREATE TABLE transport_groups (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          transport_mode TEXT NOT NULL,
          vehicle_type TEXT,
          vehicle_capacity INTEGER,
          pickup_location TEXT NOT NULL,
          pickup_location_details TEXT,
          pickup_date DATE NOT NULL,
          pickup_time_slot TEXT NOT NULL,
          dropoff_location TEXT NOT NULL,
          dropoff_location_details TEXT,
          vehicle_count INTEGER DEFAULT 1,
          status TEXT NOT NULL DEFAULT 'draft',
          provider_name TEXT,
          provider_contact TEXT,
          driver_info TEXT,
          special_instructions TEXT,
          planner_notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log("✅ transport_groups table created successfully");
    } else {
      console.log("transport_groups table already exists");
    }

    // Check if transport_allocations table already exists
    const checkTransportAllocationsTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'transport_allocations'
    `);
    
    if (checkTransportAllocationsTable.length === 0) {
      console.log("Creating transport_allocations table...");
      await db.execute(sql`
        CREATE TABLE transport_allocations (
          id SERIAL PRIMARY KEY,
          transport_group_id INTEGER NOT NULL,
          guest_id INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          includes_plus_one BOOLEAN DEFAULT FALSE,
          includes_children BOOLEAN DEFAULT FALSE,
          children_count INTEGER DEFAULT 0,
          special_needs TEXT,
          confirmed_by_guest BOOLEAN DEFAULT FALSE,
          flight_delayed BOOLEAN DEFAULT FALSE,
          delay_information TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log("✅ transport_allocations table created successfully");
    } else {
      console.log("transport_allocations table already exists");
    }

    console.log("✅ All transport module tables created successfully");
  } catch (error) {
    console.error("❌ Error creating transport module tables:", error);
    throw error;
  }
}

async function main() {
  try {
    await addTransportTables();
    console.log("✅ Database migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    process.exit(1);
  }
}

main();