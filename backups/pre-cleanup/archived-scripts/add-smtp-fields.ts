import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

// Use direct postgres connection for migration
const sql = postgres(process.env.DATABASE_URL);

async function addSMTPFields() {
  try {
    console.log('Adding SMTP fields to wedding_events table...');
    
    // Check if columns already exist to prevent duplicate column errors
    const existingColumns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'wedding_events' 
      AND column_name IN ('gmail_smtp_host', 'gmail_smtp_port', 'gmail_smtp_secure');
    `;
    
    const existingColumnNames = existingColumns.map(col => col.column_name);
    
    // Add columns that don't already exist
    if (!existingColumnNames.includes('gmail_smtp_host')) {
      await sql`
        ALTER TABLE wedding_events 
        ADD COLUMN gmail_smtp_host VARCHAR(255) DEFAULT 'smtp.gmail.com';
      `;
      console.log('Added gmail_smtp_host column');
    }
    
    if (!existingColumnNames.includes('gmail_smtp_port')) {
      await sql`
        ALTER TABLE wedding_events 
        ADD COLUMN gmail_smtp_port INTEGER DEFAULT 587;
      `;
      console.log('Added gmail_smtp_port column');
    }
    
    if (!existingColumnNames.includes('gmail_smtp_secure')) {
      await sql`
        ALTER TABLE wedding_events 
        ADD COLUMN gmail_smtp_secure BOOLEAN DEFAULT false;
      `;
      console.log('Added gmail_smtp_secure column');
    }
    
    console.log('SMTP fields added successfully');
  } catch (error) {
    console.error('Error adding SMTP fields:', error);
    throw error;
  }
}

async function main() {
  try {
    await addSMTPFields();
    console.log('Migration completed successfully');
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

main();