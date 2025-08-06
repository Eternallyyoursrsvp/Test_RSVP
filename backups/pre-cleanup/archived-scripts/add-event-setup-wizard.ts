/**
 * Script to add event setup wizard tracking tables to the database
 */
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addEventSetupWizardTables() {
  console.log('Adding event setup wizard table...');
  
  try {
    // Create the event_setup_progress table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS event_setup_progress (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES wedding_events(id) ON DELETE CASCADE,
        step_id TEXT NOT NULL,
        is_completed BOOLEAN NOT NULL DEFAULT false,
        step_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (event_id, step_id)
      );
    `);
    
    console.log('Event setup wizard table created successfully.');
    
    // Add indexes for faster queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_event_setup_progress_event_id ON event_setup_progress(event_id);
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_event_setup_progress_step_id ON event_setup_progress(step_id);
    `);
    
    console.log('Event setup wizard indexes created successfully.');
    
    return true;
  } catch (error) {
    console.error('Error adding event setup wizard tables:', error);
    throw error;
  }
}

async function main() {
  try {
    await addEventSetupWizardTables();
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();