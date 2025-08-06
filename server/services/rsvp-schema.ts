/**
 * Schema definitions for the two-stage RSVP process
 */
import { z } from "zod";

// Stage 1: Basic attendance information
export const RSVPStage1Schema = z.object({
  guestId: z.number(),
  eventId: z.number(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  rsvpStatus: z.enum(["confirmed", "declined"], {
    required_error: "Please select whether you'll attend",
  }),
  isLocalGuest: z.boolean().optional().default(false),
  plusOneAttending: z.boolean().optional(),
  plusOneName: z.string().optional(),
  plusOneEmail: z.string().email().optional(),
  plusOnePhone: z.string().optional(),
  plusOneGender: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  allergies: z.string().optional(),
  ceremonies: z.array(z.object({
    ceremonyId: z.number(),
    attending: z.boolean(),
  })).optional(),
  message: z.string().optional(),
});

// Stage 2: Follow-up details for confirmed guests
export const RSVPStage2Schema = z.object({
  guestId: z.number(),
  eventId: z.number(),
  // Accommodation details
  needsAccommodation: z.boolean().optional(),
  accommodationPreference: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  accommodationNotes: z.string().optional(),
  // Transportation details
  needsTransportation: z.boolean().optional(),
  transportationType: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  transportationNotes: z.string().optional(),
  // Travel details
  travelMode: z.enum(['air', 'train', 'bus', 'car']).optional(),
  flightDetails: z.object({
    flightNumber: z.string().optional(),
    airline: z.string().optional(),
    arrivalAirport: z.string().optional(),
    departureAirport: z.string().optional(),
  }).optional(),
  arrivalDate: z.string().optional(), // Could be transformed to Date later
  arrivalTime: z.string().optional(),
  departureDate: z.string().optional(), // Could be transformed to Date later
  departureTime: z.string().optional(),
  // Children details as structured data
  childrenDetails: z.array(z.object({
    name: z.string(),
    age: z.number().optional(),
    gender: z.string().optional(),
    dietaryRestrictions: z.string().optional()
  })).optional(),
  // Meal selections with more detailed structure
  mealSelections: z.array(z.object({
    ceremonyId: z.number(),
    mealOptionId: z.number(),
    notes: z.string().optional()
  })).optional(),
});

// Combined schema for special cases where both stages are submitted at once
export const RSVPCombinedSchema = RSVPStage1Schema.merge(RSVPStage2Schema);

// Response types
export type RSVPStage1Response = z.infer<typeof RSVPStage1Schema>;
export type RSVPStage2Response = z.infer<typeof RSVPStage2Schema>;
export type RSVPCombinedResponse = z.infer<typeof RSVPCombinedSchema>;

// For backward compatibility
export const RSVPResponseSchema = z.object({
  guestId: z.number(),
  eventId: z.number(),
  attending: z.boolean(),
  plusOneAttending: z.boolean().optional(),
  plusOneName: z.string().optional(),
  plusOneEmail: z.string().email().optional(),
  plusOnePhone: z.string().optional(),
  childrenAttending: z.number().default(0),
  childrenDetails: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  message: z.string().optional(),
  accommodationNeeded: z.boolean().optional(),
  arrivalDate: z.string().optional(),
  departureDate: z.string().optional(),
  transportationNeeded: z.boolean().optional(),
  ceremonies: z.array(z.object({
    ceremonyId: z.number(),
    attending: z.boolean(),
    mealOptionId: z.number().optional()
  })).optional()
});

export type RSVPResponse = z.infer<typeof RSVPResponseSchema>;