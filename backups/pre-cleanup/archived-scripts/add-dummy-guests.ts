import { storage } from "../server/storage";
import { InsertGuest } from "@shared/schema";

const dummyGuests: InsertGuest[] = [
  {
    eventId: 1,
    firstName: "Arjun",
    lastName: "Sharma", 
    email: "arjun.sharma@email.com",
    phone: "9876543210",
    countryCode: "+91",
    gender: "male",
    salutation: "Mr.",
    side: "groom",
    relationship: "Brother",
    rsvpStatus: "confirmed",
    address: "123 MG Road, Mumbai",
    plusOneAllowed: true,
    plusOneName: "Priya Sharma",
    plusOneEmail: "priya.sharma@email.com",
    plusOnePhone: "9876543211",
    plusOneGender: "female",
    plusOneSalutation: "Mrs.",
    plusOneRelationship: "Sister-in-law",
    needsAccommodation: true,
    dietaryRestrictions: "Vegetarian",
    whatsappAvailable: true,
    whatsappNumber: "9876543210",
    notes: "VIP guest - groom's brother"
  },
  {
    eventId: 1,
    firstName: "Kavya",
    lastName: "Reddy",
    email: "kavya.reddy@email.com", 
    phone: "9876543212",
    countryCode: "+91",
    gender: "female",
    salutation: "Ms.",
    side: "bride",
    relationship: "Best Friend",
    rsvpStatus: "confirmed",
    address: "456 Park Street, Bangalore",
    plusOneAllowed: false,
    needsAccommodation: true,
    dietaryRestrictions: "No restrictions",
    whatsappAvailable: true,
    whatsappNumber: "9876543212",
    notes: "Maid of honor"
  },
  {
    eventId: 1,
    firstName: "Rohan",
    lastName: "Gupta",
    email: "rohan.gupta@email.com",
    phone: "9876543213", 
    countryCode: "+91",
    gender: "male",
    salutation: "Mr.",
    side: "groom",
    relationship: "College Friend",
    rsvpStatus: "pending",
    address: "789 Connaught Place, Delhi",
    plusOneAllowed: true,
    needsAccommodation: false,
    dietaryRestrictions: "Vegan",
    whatsappAvailable: true,
    whatsappNumber: "9876543213",
    notes: "Arriving day before wedding"
  },
  {
    eventId: 1,
    firstName: "Anjali",
    lastName: "Patel",
    email: "anjali.patel@email.com",
    phone: "9876543214",
    countryCode: "+91", 
    gender: "female",
    salutation: "Dr.",
    side: "bride",
    relationship: "Cousin",
    rsvpStatus: "confirmed",
    address: "321 Ring Road, Ahmedabad",
    plusOneAllowed: true,
    plusOneName: "Vikram Patel",
    plusOneEmail: "vikram.patel@email.com",
    plusOnePhone: "9876543215",
    plusOneGender: "male",
    plusOneSalutation: "Mr.",
    plusOneRelationship: "Husband",
    needsAccommodation: true,
    dietaryRestrictions: "Gluten-free",
    numberOfChildren: 2,
    whatsappAvailable: true,
    whatsappNumber: "9876543214",
    notes: "Traveling with 2 children"
  },
  {
    eventId: 1,
    firstName: "Siddharth",
    lastName: "Nair",
    email: "siddharth.nair@email.com",
    phone: "9876543216",
    countryCode: "+91",
    gender: "male", 
    salutation: "Mr.",
    side: "groom",
    relationship: "Uncle",
    rsvpStatus: "declined",
    address: "654 Marine Drive, Kochi",
    plusOneAllowed: true,
    plusOneName: "Meera Nair",
    plusOneEmail: "meera.nair@email.com", 
    plusOnePhone: "9876543217",
    plusOneGender: "female",
    plusOneSalutation: "Mrs.",
    plusOneRelationship: "Aunt",
    needsAccommodation: false,
    dietaryRestrictions: "No restrictions",
    whatsappAvailable: false,
    notes: "Unable to attend due to health reasons"
  },
  {
    eventId: 1,
    firstName: "Ishita",
    lastName: "Singh",
    email: "ishita.singh@email.com",
    phone: "9876543218",
    countryCode: "+91",
    gender: "female",
    salutation: "Ms.",
    side: "bride",
    relationship: "Colleague",
    rsvpStatus: "confirmed",
    address: "987 Sector 5, Gurgaon",
    plusOneAllowed: false,
    needsAccommodation: true,
    dietaryRestrictions: "Lactose intolerant",
    allergies: "Nuts",
    whatsappAvailable: true,
    whatsappNumber: "9876543218",
    notes: "Arriving by flight on Friday evening"
  },
  {
    eventId: 1,
    firstName: "Aditya",
    lastName: "Kapoor",
    email: "aditya.kapoor@email.com",
    phone: "9876543219",
    countryCode: "+91",
    gender: "male",
    salutation: "Mr.",
    side: "groom",
    relationship: "Neighbor",
    rsvpStatus: "pending",
    address: "147 Model Town, Ludhiana",
    plusOneAllowed: true,
    needsAccommodation: false,
    dietaryRestrictions: "No restrictions",
    whatsappAvailable: true,
    whatsappNumber: "9876543219",
    notes: "Family friend - known for 20+ years"
  },
  {
    eventId: 1,
    firstName: "Pooja",
    lastName: "Agarwal",
    email: "pooja.agarwal@email.com",
    phone: "9876543220",
    countryCode: "+91",
    gender: "female",
    salutation: "Mrs.",
    side: "bride",
    relationship: "Aunt",
    rsvpStatus: "confirmed",
    address: "258 Civil Lines, Jaipur",
    plusOneAllowed: true,
    plusOneName: "Rajesh Agarwal",
    plusOneEmail: "rajesh.agarwal@email.com",
    plusOnePhone: "9876543221",
    plusOneGender: "male",
    plusOneSalutation: "Mr.",
    plusOneRelationship: "Uncle",
    needsAccommodation: true,
    dietaryRestrictions: "Diabetic-friendly",
    numberOfChildren: 1,
    whatsappAvailable: true,
    whatsappNumber: "9876543220",
    notes: "Elder in family - special arrangements needed"
  }
];

export async function addDummyGuests() {
  console.log("Adding dummy guests for testing...");
  
  try {
    for (const guest of dummyGuests) {
      const createdGuest = await storage.createGuest(guest);
      console.log(`✅ Created guest: ${createdGuest.firstName} ${createdGuest.lastName}`);
    }
    console.log(`✅ Successfully added ${dummyGuests.length} dummy guests`);
  } catch (error) {
    console.error("❌ Error adding dummy guests:", error);
    throw error;
  }
}

if (require.main === module) {
  addDummyGuests()
    .then(() => {
      console.log("Dummy guests added successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to add dummy guests:", error);
      process.exit(1);
    });
}