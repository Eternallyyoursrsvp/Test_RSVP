import { db, pgClient } from '../server/db';
import { hotels } from '../shared/schema';
import * as sql from 'postgres';

async function addHotelsSupport() {
  console.log('Running hotels support migration...');

  try {
    // Check if hotels table exists
    const tablesResult = await pgClient.unsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'hotels'
    `);
    
    const hotelTableExists = tablesResult.length > 0;
    
    if (!hotelTableExists) {
      console.log('Creating hotels table...');
      await pgClient.unsafe(`
        CREATE TABLE hotels (
          id SERIAL PRIMARY KEY,
          event_id INTEGER NOT NULL REFERENCES wedding_events(id),
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          phone TEXT,
          website TEXT,
          description TEXT,
          is_default BOOLEAN DEFAULT FALSE,
          price_range TEXT,
          distance_from_venue TEXT,
          amenities TEXT,
          images TEXT,
          special_notes TEXT,
          booking_instructions TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Hotels table created successfully');
    } else {
      console.log('Hotels table already exists');
    }
    
    // Check if accommodations table has the hotel_id column
    const columnResult = await pgClient.unsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'accommodations' 
        AND column_name = 'hotel_id'
    `);
    
    const hotelIdColumnExists = columnResult.length > 0;
    
    if (!hotelIdColumnExists) {
      console.log('Adding hotel_id column to accommodations table...');
      await pgClient.unsafe(`
        ALTER TABLE accommodations 
        ADD COLUMN hotel_id INTEGER REFERENCES hotels(id)
      `);
      console.log('hotel_id column added successfully');
    } else {
      console.log('hotel_id column already exists');
    }
    
    // Seed a default hotel for each existing event to maintain backward compatibility
    const events = await pgClient.unsafe(`
      SELECT id, title, location 
      FROM wedding_events
    `);
    
    for (const event of events) {
      // Check if this event already has hotels
      const existingHotels = await pgClient.unsafe(`
        SELECT id FROM hotels WHERE event_id = $1
      `, [event.id]);
      
      if (existingHotels.length === 0) {
        console.log(`Creating default hotel for event: ${event.title}`);
        
        // Get the location from the event
        const location = event.location || 'Event venue';
        
        // Create a default hotel
        const hotelResult = await pgClient.unsafe(`
          INSERT INTO hotels (
            event_id, 
            name, 
            address, 
            is_default, 
            description
          ) VALUES (
            $1, 
            $2, 
            $3, 
            true, 
            'Default accommodation for the wedding'
          ) RETURNING id
        `, [
          event.id,
          `${event.title} Venue Accommodation`,
          location
        ]);
        
        const hotelId = hotelResult[0].id;
        
        // Update existing accommodations to reference this hotel
        await pgClient.unsafe(`
          UPDATE accommodations 
          SET hotel_id = $1 
          WHERE event_id = $2 AND hotel_id IS NULL
        `, [hotelId, event.id]);
        
        console.log(`Default hotel created for event ${event.id} and accommodations updated`);
      } else {
        console.log(`Event ${event.id} already has hotels configured`);
      }
    }
    
    console.log('Hotels support migration completed successfully!');
    
  } catch (error) {
    console.error('Error running hotels support migration:', error);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// Run the migration
addHotelsSupport()
  .then(() => {
    console.log('Migration completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });