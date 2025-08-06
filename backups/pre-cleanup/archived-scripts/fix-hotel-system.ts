import { db, pgClient } from '../server/db';
import { hotels, accommodations } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Script to fix the hotel management system by creating default hotels for events
 * and linking existing accommodations to them
 */
async function fixHotelSystem() {
  console.log('Running hotel system fix...');

  try {
    // 1. Get all events
    const events = await pgClient.unsafe(`
      SELECT id, title, location 
      FROM wedding_events
    `);
    console.log(`Found ${events.length} events to process`);
    
    // 2. Process each event
    for (const event of events) {
      const eventId = event.id;
      
      // Check if this event already has hotels
      const existingHotels = await db.select().from(hotels).where(eq(hotels.eventId, eventId));
      
      if (existingHotels.length === 0) {
        console.log(`Creating default hotel for event: ${event.title} (ID: ${eventId})`);
        
        // Get the location from the event
        const location = event.location || 'Event venue';
        
        // Create a default hotel
        const [hotel] = await db.insert(hotels).values({
          eventId: eventId,
          name: `${event.title} Main Accommodation`,
          address: location,
          description: 'Default accommodation for the wedding',
          isDefault: true
        }).returning();
        
        console.log(`Created default hotel (ID: ${hotel.id}) for event ${eventId}`);
        
        // Update existing accommodations to reference this hotel
        const [updateResult] = await pgClient.unsafe(`
          UPDATE accommodations 
          SET hotel_id = $1 
          WHERE event_id = $2 AND (hotel_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM hotels WHERE id = accommodations.hotel_id
          ))
        `, [hotel.id, eventId]);
        
        const updatedCount = updateResult ? updateResult.count || 0 : 0;
        console.log(`Updated ${updatedCount} accommodations for event ${eventId} to use hotel ${hotel.id}`);
      } else {
        console.log(`Event ${eventId} already has ${existingHotels.length} hotels configured`);
        
        // Fix any accommodations with missing or invalid hotel references
        const defaultHotel = existingHotels.find(h => h.isDefault) || existingHotels[0];
        
        const [updateResult] = await pgClient.unsafe(`
          UPDATE accommodations 
          SET hotel_id = $1 
          WHERE event_id = $2 AND (hotel_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM hotels WHERE id = accommodations.hotel_id
          ))
        `, [defaultHotel.id, eventId]);
        
        const updatedCount = updateResult ? updateResult.count || 0 : 0;
        console.log(`Updated ${updatedCount} accommodations for event ${eventId} to use hotel ${defaultHotel.id}`);
      }
    }
    
    console.log('Hotel system fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing hotel system:', error);
    throw error;
  } finally {
    await pgClient.end();
  }
}

// Run the script
fixHotelSystem().then(() => {
  console.log('Hotel system fix script completed');
  process.exit(0);
}).catch(error => {
  console.error('Hotel system fix script failed:', error);
  process.exit(1);
});