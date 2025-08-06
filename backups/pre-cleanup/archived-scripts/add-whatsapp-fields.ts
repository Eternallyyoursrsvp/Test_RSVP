/**
 * Script to add WhatsApp integration fields to the events table
 */
import { db } from '../server/db';
import { events } from '@shared/schema';
import { sql } from 'drizzle-orm';

async function addWhatsAppFields() {
  try {
    console.log('Adding WhatsApp fields to events table...');

    // Check if the columns already exist
    const checkColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name = 'whatsapp_provider'
    `);

    if (checkColumns.length > 0) {
      console.log('WhatsApp fields already exist in the events table.');
      return;
    }

    // Add WhatsApp fields to events table
    await db.execute(sql`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS whatsapp_provider varchar,
      ADD COLUMN IF NOT EXISTS whatsapp_configured boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS whatsapp_access_token varchar,
      ADD COLUMN IF NOT EXISTS whatsapp_business_phone_id varchar,
      ADD COLUMN IF NOT EXISTS whatsapp_business_number varchar,
      ADD COLUMN IF NOT EXISTS whatsapp_business_account_id varchar
    `);

    console.log('WhatsApp fields added to events table successfully!');
  } catch (error) {
    console.error('Error adding WhatsApp fields to events table:', error);
    throw error;
  }
}

async function main() {
  try {
    await addWhatsAppFields();
    console.log('WhatsApp fields migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();