#!/usr/bin/env tsx

import { storage } from "../server/storage";

async function seedDummyGuests() {
  const eventId = 14; // Updated Test Event
  
  console.log('Creating dummy guests for event ID:', eventId);
  
  const dummyGuests = [
    {
      eventId,
      firstName: "Rajesh",
      lastName: "Kumar", 
      email: "rajesh.kumar@example.com",
      phone: "+91-9876543210",
      side: "bride" as const,
      relationship: "Uncle",
      rsvpStatus: "confirmed" as const,
      accommodationRequired: true,
      dietaryRestrictions: "Vegetarian",
      availableOnWhatsapp: true,
      address: "123 MG Road, Mumbai, Maharashtra 400001"
    },
    {
      eventId,
      firstName: "Priya",
      lastName: "Sharma",
      email: "priya.sharma@example.com", 
      phone: "+91-9823456789",
      side: "groom" as const,
      relationship: "Cousin Sister",
      rsvpStatus: "pending" as const,
      accommodationRequired: true,
      dietaryRestrictions: "Gluten Free",
      availableOnWhatsapp: true,
      plusOneAllowed: true,
      address: "456 Park Street, Delhi, Delhi 110001"
    },
    {
      eventId,
      firstName: "Amit",
      lastName: "Patel",
      email: "amit.patel@example.com",
      phone: "+91-9712345678", 
      side: "bride" as const,
      relationship: "Family Friend",
      rsvpStatus: "confirmed" as const,
      accommodationRequired: false,
      dietaryRestrictions: "Jain",
      availableOnWhatsapp: false,
      address: "789 Ring Road, Ahmedabad, Gujarat 380001"
    },
    {
      eventId,
      firstName: "Sneha",
      lastName: "Gupta",
      email: "sneha.gupta@example.com",
      phone: "+91-9634567890",
      side: "groom" as const, 
      relationship: "College Friend",
      rsvpStatus: "declined" as const,
      accommodationRequired: false,
      dietaryRestrictions: "No restrictions",
      availableOnWhatsapp: true,
      plusOneAllowed: true,
      address: "321 Beach Road, Chennai, Tamil Nadu 600001"
    },
    {
      eventId,
      firstName: "Kavya",
      lastName: "Reddy",
      email: "kavya.reddy@example.com",
      phone: "+91-9545678901",
      side: "bride" as const,
      relationship: "Sister",
      rsvpStatus: "confirmed" as const,
      accommodationRequired: true,
      dietaryRestrictions: "Vegan",
      availableOnWhatsapp: true,
      familyMember: true,
      address: "654 IT Park, Hyderabad, Telangana 500001"
    }
  ];

  try {
    for (const guest of dummyGuests) {
      console.log('Creating guest:', guest.firstName, guest.lastName);
      const result = await storage.createGuest(guest);
      console.log('Created guest with ID:', result.id);
    }
    
    console.log('Successfully created', dummyGuests.length, 'dummy guests');
    
    // Verify guests were created
    const allGuests = await storage.getGuestsByEvent(eventId);
    console.log('Total guests in event:', allGuests.length);
    
  } catch (error) {
    console.error('Error creating dummy guests:', error);
  }
}

seedDummyGuests();