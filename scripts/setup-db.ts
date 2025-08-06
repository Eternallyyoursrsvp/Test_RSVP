import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../shared/schema";
import { users } from "../shared/schema";
import { storage } from "../server/storage";

async function main() {
  console.log("Setting up the database...");
  
  // Create postgres connection for migrations
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Use a separate connection for migrations
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient, { schema });

  // Push schema to database 
  console.log("Pushing schema to database...");
  
  try {
    // Create admin user
    console.log("Creating admin user...");
    const existingAdmin = await storage.getUserByUsername("admin");
    
    if (!existingAdmin) {
      await storage.createUser({
        name: "Administrator",
        username: "admin",
        password: "password", // This should be hashed in production
        email: "admin@example.com",
        role: "admin",
      });
      console.log("Admin user created successfully");
    } else {
      console.log("Admin user already exists");
    }
    
    // Create sample event if none exists
    const events = await storage.getAllEvents();
    if (events.length === 0) {
      console.log("Creating sample event...");
      const adminUser = await storage.getUserByUsername("admin");
      if (adminUser) {
        const event = await storage.createEvent({
          title: "Ravi & Priya Wedding",
          date: "2025-11-15",
          coupleNames: "Ravi & Priya",
          brideName: "Priya Sharma",
          groomName: "Ravi Patel",
          location: "Golden Palace, Mumbai",
          createdBy: adminUser.id,
          description: "A beautiful celebration of love and culture",
          whatsappBusinessPhoneId: null,
          whatsappBusinessNumber: null,
          whatsappBusinessAccountId: null,
          whatsappAccessToken: null,
        });
        
        console.log("Sample event created:", event.title);
        
        // Create sample ceremonies
        console.log("Creating sample ceremonies...");
        const mehndiCeremony = await storage.createCeremony({
          name: "Mehndi Ceremony",
          eventId: event.id,
          date: "2025-11-13",
          location: "Poolside, Golden Palace",
          startTime: "16:00",
          endTime: "22:00",
          description: "Traditional Mehndi ceremony with music and dance",
          attireCode: "Casual Indian wear, colorful attire"
        });
        
        const sangeetCeremony = await storage.createCeremony({
          name: "Sangeet Night",
          eventId: event.id,
          date: "2025-11-14",
          location: "Grand Ballroom, Golden Palace",
          startTime: "19:00",
          endTime: "01:00",
          description: "Music and dance celebration",
          attireCode: "Formal Indian wear"
        });
        
        const weddingCeremony = await storage.createCeremony({
          name: "Wedding Ceremony",
          eventId: event.id,
          date: "2025-11-15",
          location: "Garden, Golden Palace",
          startTime: "10:00",
          endTime: "14:00",
          description: "Traditional Hindu wedding ceremony",
          attireCode: "Formal traditional wear"
        });
        
        const receptionCeremony = await storage.createCeremony({
          name: "Reception",
          eventId: event.id,
          date: "2025-11-15",
          location: "Royal Hall, Golden Palace",
          startTime: "19:00",
          endTime: "23:00",
          description: "Dinner and celebration",
          attireCode: "Formal wear"
        });
        
        console.log("Sample ceremonies created");
        
        // Create sample relationship types
        console.log("Creating relationship types...");
        await storage.createRelationshipType({
          name: "Family",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Close Friend",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Friend",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Colleague",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Extended Family",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Family Friend",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Neighbor",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "College Friend",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Business Associate",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Relative",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Childhood Friend",
          category: "relationship",
          isDefault: true,
        });
        
        await storage.createRelationshipType({
          name: "Other",
          category: "relationship",
          isDefault: true,
        });
      }
    } else {
      console.log("Events already exist, skipping sample data creation");
    }
    
    console.log("Database setup completed successfully");
  } catch (error) {
    console.error("Error setting up the database:", error);
    process.exit(1);
  } finally {
    await migrationClient.end();
    process.exit(0);
  }
}

main().catch(console.error);