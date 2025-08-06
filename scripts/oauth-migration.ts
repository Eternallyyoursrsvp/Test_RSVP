import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrateOAuthCredentials() {
  try {
    console.log("Starting OAuth credentials migration...");

    // Add Gmail OAuth fields
    await db.execute(sql`
      ALTER TABLE wedding_events 
      ADD COLUMN IF NOT EXISTS gmail_client_id TEXT,
      ADD COLUMN IF NOT EXISTS gmail_client_secret TEXT,
      ADD COLUMN IF NOT EXISTS gmail_redirect_uri TEXT,
      ADD COLUMN IF NOT EXISTS gmail_account TEXT,
      ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
      ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMP,
      ADD COLUMN IF NOT EXISTS use_gmail BOOLEAN DEFAULT FALSE
    `);
    
    console.log("Added Gmail OAuth columns");

    // Add Outlook OAuth fields
    await db.execute(sql`
      ALTER TABLE wedding_events 
      ADD COLUMN IF NOT EXISTS outlook_client_id TEXT,
      ADD COLUMN IF NOT EXISTS outlook_client_secret TEXT,
      ADD COLUMN IF NOT EXISTS outlook_redirect_uri TEXT,
      ADD COLUMN IF NOT EXISTS outlook_account TEXT,
      ADD COLUMN IF NOT EXISTS outlook_access_token TEXT,
      ADD COLUMN IF NOT EXISTS outlook_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS outlook_token_expiry TIMESTAMP,
      ADD COLUMN IF NOT EXISTS use_outlook BOOLEAN DEFAULT FALSE
    `);
    
    console.log("Added Outlook OAuth columns");

    // Add general email configuration fields
    await db.execute(sql`
      ALTER TABLE wedding_events 
      ADD COLUMN IF NOT EXISTS email_from TEXT,
      ADD COLUMN IF NOT EXISTS email_reply_to TEXT,
      ADD COLUMN IF NOT EXISTS use_sendgrid BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sendgrid_api_key TEXT
    `);
    
    console.log("Added email configuration columns");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Execute the migration
migrateOAuthCredentials()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });