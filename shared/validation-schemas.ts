/**
 * Centralized Validation Schemas
 * 
 * This file contains reusable Zod validation schemas for consistent form validation
 * across the application. Each schema can be composed and extended as needed.
 */
import { z } from "zod";

// ===== Basic Information =====

/**
 * Contact Information Schema
 */
export const contactSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string()
    .min(7, "Phone number must be at least 7 characters")
    .max(20, "Phone number must be at most 20 characters")
    .optional(),
});

/**
 * Name Schema
 */
export const nameSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100, "First name is too long"),
  lastName: z.string().min(1, "Last name is required").max(100, "Last name is too long"),
});

/**
 * Address Schema
 */
export const addressSchema = z.object({
  streetAddress: z.string().min(1, "Street address is required").max(100, "Street address is too long"),
  city: z.string().min(1, "City is required").max(100, "City is too long"),
  state: z.string().min(1, "State is required").max(100, "State is too long"),
  postalCode: z.string().min(1, "Postal code is required").max(20, "Postal code is too long"),
  country: z.string().min(1, "Country is required").max(100, "Country is too long"),
});

// ===== Event Information =====

/**
 * Date Range Schema
 */
export const dateRangeSchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
}).refine(data => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "End date must be on or after start date",
  path: ["endDate"],
});

/**
 * Ceremony Schema
 */
export const ceremonySchema = z.object({
  name: z.string().min(1, "Ceremony name is required").max(100, "Ceremony name is too long"),
  date: z.string().min(1, "Ceremony date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  location: z.string().min(1, "Location is required").max(200, "Location is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

// ===== Guest and RSVP Information =====

/**
 * Base RSVP Status Schema
 */
export const rsvpStatusSchema = z.enum(["pending", "confirmed", "declined"]);

/**
 * RSVP Stage 1 Schema (Basic Attendance)
 */
export const rsvpStage1Schema = z.object({
  ...nameSchema.shape,
  ...contactSchema.shape,
  rsvpStatus: z.enum(["confirmed", "declined"]),
  plusOneName: z.string().optional(),
  message: z.string().max(1000, "Message is too long").optional(),
  ceremonies: z.record(z.string(), z.boolean()).optional(),
});

/**
 * Child Information Schema
 */
export const childSchema = z.object({
  name: z.string().min(1, "Child name is required"),
  age: z.preprocess(
    (val) => (val === "" ? undefined : Number(val)),
    z.number().min(0, "Age must be positive").max(18, "Age must be 18 or under").optional()
  ),
  gender: z.string().optional(),
  dietaryRestrictions: z.string().max(200, "Dietary restrictions is too long").optional()
});

/**
 * Flight Details Schema
 */
export const flightDetailsSchema = z.object({
  flightNumber: z.string().optional(),
  airline: z.string().optional(),
  arrivalAirport: z.string().optional(),
  departureAirport: z.string().optional(),
});

/**
 * Travel Mode Schema
 */
export const travelModeSchema = z.enum(['air', 'train', 'bus', 'car', 'other']);

/**
 * Accommodation Preference Schema
 */
export const accommodationPreferenceSchema = z.enum(['provided', 'self_managed', 'special_arrangement']);

/**
 * Transportation Preference Schema
 */
export const transportationTypeSchema = z.enum(['provided', 'self_managed', 'special_arrangement']);

/**
 * Meal Selection Schema
 */
export const mealSelectionSchema = z.object({
  ceremonyId: z.number(),
  mealOptionId: z.number(),
  notes: z.string().max(200, "Notes is too long").optional()
});

/**
 * RSVP Stage 2 Schema (Travel & Accommodation)
 */
export const rsvpStage2Schema = z.object({
  guestId: z.number(),
  eventId: z.number(),
  // Accommodation details
  needsAccommodation: z.boolean().optional(),
  accommodationPreference: accommodationPreferenceSchema.optional(),
  accommodationNotes: z.string().max(500, "Notes is too long").optional(),
  hotelPreference: z.string().optional(),
  // Transportation details
  needsTransportation: z.boolean().optional(),
  transportationType: transportationTypeSchema.optional(),
  transportationNotes: z.string().max(500, "Notes is too long").optional(),
  // Travel details
  travelMode: travelModeSchema.optional(),
  flightDetails: flightDetailsSchema.optional(),
  arrivalDate: z.string().optional(),
  arrivalTime: z.string().optional(),
  departureDate: z.string().optional(),
  departureTime: z.string().optional(),
  // Children details
  childrenDetails: z.array(childSchema).optional(),
  // Meal selections
  mealSelections: z.array(mealSelectionSchema).optional(),
  // Special requests
  specialRequests: z.string().max(1000, "Special requests is too long").optional(),
});

// ===== Communication Settings =====

/**
 * Email Configuration Schema
 */
export const emailConfigSchema = z.object({
  emailFrom: z.string().email("Invalid email address").min(1, "Email address is required"),
  emailReplyTo: z.string().email("Invalid email address").optional(),
  sendRsvpReminders: z.boolean().default(true),
  sendRsvpConfirmations: z.boolean().default(true),
  sendTravelUpdates: z.boolean().default(true),
});

/**
 * WhatsApp Configuration Schema
 */
export const whatsappConfigSchema = z.object({
  enableWhatsapp: z.boolean().default(false),
  whatsappBusinessNumber: z.string().min(10, "Phone number is required").optional()
    .refine(val => !val || /^\+?[0-9]{10,15}$/.test(val), {
      message: "Invalid phone number format"
    }),
});

/**
 * Email Template Schema
 */
export const emailTemplateSchema = z.object({
  type: z.string(),
  emailSubject: z.string().min(1, "Email subject is required"),
  emailTemplate: z.string().min(1, "Email template is required"),
  sendImmediately: z.boolean().default(true),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

/**
 * WhatsApp Template Schema
 */
export const whatsappTemplateSchema = z.object({
  type: z.string(),
  whatsappTemplate: z.string().min(1, "WhatsApp template is required"),
  sendImmediately: z.boolean().default(true),
  scheduledDate: z.string().optional().nullable(),
  scheduledTime: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

/**
 * Communication Settings Schema
 */
export const communicationSettingsSchema = z.object({
  ...emailConfigSchema.shape,
  ...whatsappConfigSchema.shape,
  useGmail: z.boolean().default(false),
  useOutlook: z.boolean().default(false),
  useSendGrid: z.boolean().default(false),
  gmailAccount: z.string().email("Invalid email address").optional(),
  outlookAccount: z.string().email("Invalid email address").optional(),
  sendGridApiKey: z.string().optional(),
});

// ===== Event Settings =====

/**
 * Basic Event Information Schema
 */
export const eventBasicInfoSchema = z.object({
  title: z.string().min(1, "Event title is required").max(100, "Event title is too long"),
  coupleNames: z.string().min(1, "Couple names are required").max(100, "Couple names are too long"),
  brideName: z.string().min(1, "Bride name is required").max(100, "Bride name is too long"),
  groomName: z.string().min(1, "Groom name is required").max(100, "Groom name is too long"),
  ...dateRangeSchema.shape,
  location: z.string().min(1, "Location is required").max(200, "Location is too long"),
  description: z.string().max(500, "Description is too long").optional(),
});

/**
 * Guest Management Settings Schema
 */
export const guestManagementSchema = z.object({
  allowPlusOnes: z.boolean().default(true),
  allowChildrenDetails: z.boolean().default(true),
  rsvpDeadline: z.string().optional(),
});

/**
 * Travel and Accommodation Settings Schema
 */
export const travelAccommodationSchema = z.object({
  // Accommodation settings
  accommodationMode: z.string(),
  accommodationSpecialDeals: z.string().optional().nullable(),
  accommodationInstructions: z.string().optional().nullable(),
  accommodationHotelName: z.string().optional().nullable(),
  accommodationHotelAddress: z.string().optional().nullable(),
  accommodationHotelPhone: z.string().optional().nullable(),
  accommodationHotelWebsite: z.string().optional().nullable(),
  accommodationSpecialRates: z.string().optional().nullable(),
  
  // Transportation settings
  transportMode: z.string(),
  transportSpecialDeals: z.string().optional().nullable(),
  transportInstructions: z.string().optional().nullable(),
  transportProviderName: z.string().optional().nullable(),
  transportProviderContact: z.string().optional().nullable(),
  transportProviderWebsite: z.string().optional().nullable(),
  defaultArrivalLocation: z.string().optional().nullable(),
  defaultDepartureLocation: z.string().optional().nullable(),
  
  // Flight settings
  flightMode: z.string(),
  flightSpecialDeals: z.string().optional().nullable(),
  flightInstructions: z.string().optional().nullable(),
  recommendedAirlines: z.string().optional().nullable(),
  airlineDiscountCodes: z.string().optional().nullable(),
});

/**
 * Complete Event Settings Schema
 */
export const completeEventSchema = z.object({
  basicInfo: eventBasicInfoSchema,
  guestManagement: guestManagementSchema,
  travelAccommodation: travelAccommodationSchema,
  communication: communicationSettingsSchema,
});

// Types for all schemas (to be used in form validations)
export type ContactInfo = z.infer<typeof contactSchema>;
export type NameInfo = z.infer<typeof nameSchema>;
export type AddressInfo = z.infer<typeof addressSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type CeremonyInfo = z.infer<typeof ceremonySchema>;
export type RsvpStage1 = z.infer<typeof rsvpStage1Schema>;
export type RsvpStage2 = z.infer<typeof rsvpStage2Schema>;
export type ChildInfo = z.infer<typeof childSchema>;
export type FlightDetails = z.infer<typeof flightDetailsSchema>;
export type MealSelection = z.infer<typeof mealSelectionSchema>;
export type EmailConfig = z.infer<typeof emailConfigSchema>;
export type WhatsappConfig = z.infer<typeof whatsappConfigSchema>;
export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
export type WhatsappTemplate = z.infer<typeof whatsappTemplateSchema>;
export type CommunicationSettings = z.infer<typeof communicationSettingsSchema>;
export type EventBasicInfo = z.infer<typeof eventBasicInfoSchema>;
export type GuestManagementSettings = z.infer<typeof guestManagementSchema>;
export type TravelAccommodationSettings = z.infer<typeof travelAccommodationSchema>;
export type CompleteEventSettings = z.infer<typeof completeEventSchema>;