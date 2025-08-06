import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, json, decimal, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("staff"), // staff, admin, couple, planner
  // Enterprise security fields
  passwordChangeRequired: boolean("password_change_required").default(false),
  emailVerified: boolean("email_verified").default(false),
  invitationToken: text("invitation_token"),
  invitationExpiresAt: timestamp("invitation_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  accountLockedUntil: timestamp("account_locked_until"),
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Wedding Events
export const weddingEvents = pgTable("wedding_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  coupleNames: text("couple_names").notNull(),
  brideName: text("bride_name").notNull(),
  groomName: text("groom_name").notNull(),
  startDate: date("start_date").notNull(), // Start date of the wedding events
  endDate: date("end_date").notNull(),     // End date of the wedding events
  date: date("date"),                      // Keeping for backward compatibility
  location: text("location").notNull(),
  description: text("description"),
  rsvpDeadline: date("rsvp_deadline"),    // Deadline for RSVP submissions
  // RSVP Settings
  allowPlusOnes: boolean("allow_plus_ones").default(true),
  allowChildrenDetails: boolean("allow_children_details").default(true),
  customRsvpUrl: text("custom_rsvp_url"),
  rsvpWelcomeTitle: text("rsvp_welcome_title"),
  rsvpWelcomeMessage: text("rsvp_welcome_message"),
  rsvpCustomBranding: text("rsvp_custom_branding"),
  rsvpShowSelectAll: boolean("rsvp_show_select_all").default(true),
  // Email Configuration
  emailProvider: text("email_provider").default("resend"), // 'resend', 'sendgrid', etc.
  emailApiKey: text("email_api_key"),                      // API key for the email provider
  emailFromAddress: text("email_from_address"),            // The "from" email address
  emailFromDomain: text("email_from_domain"),              // Domain for the email
  emailConfigured: boolean("email_configured").default(false),
  communicationConfigured: boolean("communication_configured").default(false),
  // WhatsApp Business API Integration
  whatsappBusinessPhoneId: text("whatsapp_business_phone_id"),
  whatsappBusinessNumber: text("whatsapp_business_number"),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  whatsappAccessToken: text("whatsapp_access_token"),
  whatsappConfigured: boolean("whatsapp_configured").default(false),
  // Email Communication Settings
  emailFrom: text("email_from"),
  emailReplyTo: text("email_reply_to"),
  useGmail: boolean("use_gmail").default(false),
  useOutlook: boolean("use_outlook").default(false),
  useSendGrid: boolean("use_sendgrid").default(false),
  // Gmail settings
  gmailClientId: text("gmail_client_id"),
  gmailClientSecret: text("gmail_client_secret"),
  gmailRedirectUri: text("gmail_redirect_uri"),
  gmailAccount: text("gmail_account"),
  gmailAccessToken: text("gmail_access_token"),
  gmailRefreshToken: text("gmail_refresh_token"),
  gmailTokenExpiry: timestamp("gmail_token_expiry"),
  // Gmail Direct SMTP settings (alternative to OAuth)
  useGmailDirectSMTP: boolean("use_gmail_direct_smtp").default(false),
  gmailPassword: text("gmail_password"),
  gmailSmtpHost: text("gmail_smtp_host").default("smtp.gmail.com"),
  gmailSmtpPort: integer("gmail_smtp_port").default(587),
  gmailSmtpSecure: boolean("gmail_smtp_secure").default(false),
  // Outlook settings
  outlookClientId: text("outlook_client_id"),
  outlookClientSecret: text("outlook_client_secret"),
  outlookRedirectUri: text("outlook_redirect_uri"),
  outlookAccount: text("outlook_account"),
  outlookAccessToken: text("outlook_access_token"),
  outlookRefreshToken: text("outlook_refresh_token"),
  outlookTokenExpiry: timestamp("outlook_token_expiry"),
  // SendGrid settings
  sendGridApiKey: text("sendgrid_api_key"),
  // Brevo settings
  brevoApiKey: text("brevo_api_key"),
  // Travel & Accommodation Settings
  
  // Accommodation Settings
  accommodationMode: text("accommodation_mode").default("none"), // 'all', 'none', 'selected', 'special_deal'
  accommodationSpecialDeals: text("accommodation_special_deals"), // Details for special hotel deals
  accommodationInstructions: text("accommodation_instructions"), // Instructions for booking
  accommodationHotelName: text("accommodation_hotel_name"), // For special deals or when providing for all
  accommodationHotelAddress: text("accommodation_hotel_address"),
  accommodationHotelPhone: text("accommodation_hotel_phone"),
  accommodationHotelWebsite: text("accommodation_hotel_website"),
  accommodationSpecialRates: text("accommodation_special_rates"), // Rate codes or discount information
  
  // Transport Settings
  transportMode: text("transport_mode").default("none"), // 'all', 'none', 'selected', 'special_deal'
  transportSpecialDeals: text("transport_special_deals"), // Details for special transport arrangements
  transportInstructions: text("transport_instructions"), // Instructions for arranging transport
  transportProviderName: text("transport_provider_name"), // For special deals
  transportProviderContact: text("transport_provider_contact"),
  transportProviderEmail: text("transport_provider_email"),
  transportProviderWebsite: text("transport_provider_website"),
  sendTravelUpdates: boolean("send_travel_updates").default(true),
  notifyGuests: boolean("notify_guests").default(true),
  providesAirportPickup: boolean("provides_airport_pickup").default(false),
  providesVenueTransfers: boolean("provides_venue_transfers").default(false),
  transportPickupNote: text("transport_pickup_note"),
  transportReturnNote: text("transport_return_note"),
  
  // Flight Settings
  flightMode: text("flight_mode").default("none"), // 'all', 'none', 'selected', 'special_deal'
  flightSpecialDeals: text("flight_special_deals"), // Details for special airline deals
  flightInstructions: text("flight_instructions"), // Instructions for booking flights
  recommendedAirlines: text("recommended_airlines"),
  airlineDiscountCodes: text("airline_discount_codes"),
  departureBufferTime: text("departure_buffer_time").default("03:00"), // Time before departure for check-in (HH:MM)
  arrivalBufferTime: text("arrival_buffer_time").default("00:30"), // Time after arrival for pickup (HH:MM)
  
  // Supporting old fields for backward compatibility
  offerTravelAssistance: boolean("offer_travel_assistance").default(false),
  transportationProvided: boolean("transportation_provided").default(false),
  defaultArrivalLocation: text("default_arrival_location"),
  defaultDepartureLocation: text("default_departure_location"),
  defaultHotelName: text("default_hotel_name"),
  defaultHotelAddress: text("default_hotel_address"),
  defaultHotelPhone: text("default_hotel_phone"),
  defaultHotelWebsite: text("default_hotel_website"),
  specialHotelRates: text("special_hotel_rates"),
  bookingInstructions: text("booking_instructions"),
  // General metadata
  createdBy: integer("created_by").notNull(),
});

export const insertWeddingEventSchema = createInsertSchema(weddingEvents).omit({
  id: true,
});

// Guests
export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  gender: text("gender"), // male, female, other
  salutation: text("salutation"), // Mr, Mrs, Ms, Dr, etc.
  countryCode: text("country_code"),
  phone: text("phone"),
  whatsappSame: boolean("whatsapp_same").default(true),
  whatsappCountryCode: text("whatsapp_country_code"),
  whatsappNumber: text("whatsapp_number"),
  whatsappAvailable: boolean("whatsapp_available").default(false),
  address: text("address"),
  side: text("side").notNull(), // "bride" or "groom"
  isFamily: boolean("is_family").default(false), // is a family member
  relationship: text("relationship"),
  rsvpStatus: text("rsvp_status").default("pending"), // pending, confirmed, declined
  rsvpDate: date("rsvp_date"),                        // Date when the RSVP was submitted
  plusOneAllowed: boolean("plus_one_allowed").default(false),
  plusOneConfirmed: boolean("plus_one_confirmed").default(false), // Whether plus one is confirmed by guest
  plusOneName: text("plus_one_name"),
  plusOneEmail: text("plus_one_email"),
  plusOnePhone: text("plus_one_phone"),
  plusOneCountryCode: text("plus_one_country_code"),
  plusOneRelationship: text("plus_one_relationship"), // relationship to main guest
  plusOneRsvpContact: boolean("plus_one_rsvp_contact").default(false), // switch RSVP contact to plus one
  plusOneGender: text("plus_one_gender"), // male, female, other
  plusOneSalutation: text("plus_one_salutation"), // Mr, Mrs, Ms, Dr, etc.
  childrenDetails: jsonb("children_details").default("[]"), // array of {name, age, gender, salutation}
  childrenNotes: text("children_notes"), // special notes about children
  // Legacy fields for backward compatibility
  numberOfChildren: integer("number_of_children").default(0), // Deprecated - use childrenDetails.length instead
  childrenNames: text("children_names"),                      // Deprecated - use childrenDetails instead
  dietaryRestrictions: text("dietary_restrictions"),
  allergies: text("allergies"),
  tableAssignment: text("table_assignment"),
  giftTracking: text("gift_tracking"),
  needsAccommodation: boolean("needs_accommodation").default(false),
  accommodationPreference: text("accommodation_preference"), // Guest's preference for accommodation type
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
});

// Events/Ceremonies
export const ceremonies = pgTable("ceremonies", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location").notNull(),
  description: text("description"),
  attireCode: text("attire_code"),
});

export const insertCeremonySchema = createInsertSchema(ceremonies).omit({
  id: true,
});

// Guest Ceremony Attendance
export const guestCeremonies = pgTable("guest_ceremonies", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull(),
  ceremonyId: integer("ceremony_id").notNull(),
  attending: boolean("attending").default(false),
});

export const insertGuestCeremonySchema = createInsertSchema(guestCeremonies).omit({
  id: true,
});

// Travel Information
export const travelInfo = pgTable("travel_info", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull(),
  travelMode: text("travel_mode"), // air, road, train
  arrivalDate: date("arrival_date"),
  arrivalTime: text("arrival_time"),
  arrivalLocation: text("arrival_location"),
  departureDate: date("departure_date"),
  departureTime: text("departure_time"),
  departureLocation: text("departure_location"),
  flightNumber: text("flight_number"),
  airline: text("airline"), // Airline name
  terminal: text("terminal"), // Terminal information
  gate: text("gate"), // Gate information
  flightStatus: text("flight_status").default("scheduled"), // scheduled, confirmed, delayed, cancelled
  needsTransportation: boolean("needs_transportation").default(false),
  transportationType: text("transportation_type"), // pickup, drop, both
  specialRequirements: text("special_requirements"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTravelInfoSchema = createInsertSchema(travelInfo).omit({
  id: true,
});

// Hotels for accommodation
export const hotels = pgTable("hotels", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  website: text("website"),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  priceRange: text("price_range"), // Price range (e.g., "₹5000-10000")
  distanceFromVenue: text("distance_from_venue"), // Distance from main venue
  amenities: text("amenities"), // Comma-separated list of amenities
  images: text("images"), // Comma-separated URLs of hotel images
  specialNotes: text("special_notes"), // Any special notes for guests
  bookingInstructions: text("booking_instructions"), // Instructions for booking
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertHotelSchema = createInsertSchema(hotels).omit({
  id: true,
  createdAt: true,
});

// Global Room Types (shared across all events)
export const globalRoomTypes = pgTable("global_room_types", {
  id: serial("id").primaryKey(),
  hotelName: text("hotel_name").notNull(), // The hotel name this room type belongs to
  name: text("name").notNull(), // Name of the room type (e.g., "Deluxe Room")
  category: text("category").notNull(), // Standard, Deluxe, Suite, etc.
  capacity: integer("capacity").notNull(), // Number of people the room can accommodate
  specialFeatures: text("special_features"), // Special features of this room type
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGlobalRoomTypeSchema = createInsertSchema(globalRoomTypes).omit({
  id: true,
  createdAt: true,
});

// Accommodations (room types for specific events)
export const accommodations = pgTable("accommodations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  hotelId: integer("hotel_id").references(() => hotels.id), // Link to hotel
  name: text("name").notNull(),
  roomType: text("room_type").notNull(),
  bedType: text("bed_type"), // New field: king, queen, twin, etc.
  maxOccupancy: integer("max_occupancy").notNull(), // New field replacing capacity
  capacity: integer("capacity"), // Kept for backward compatibility
  totalRooms: integer("total_rooms").notNull(),
  allocatedRooms: integer("allocated_rooms").default(0),
  pricePerNight: text("price_per_night"),
  specialFeatures: text("special_features"),
  showPricing: boolean("show_pricing").default(false), // Only show pricing for special deals
});

export const insertAccommodationSchema = createInsertSchema(accommodations).omit({
  id: true,
});

// Room Allocations
export const roomAllocations = pgTable("room_allocations", {
  id: serial("id").primaryKey(),
  accommodationId: integer("accommodation_id").notNull(),
  guestId: integer("guest_id").notNull(),
  roomNumber: text("room_number"),
  checkInDate: date("check_in_date"),
  checkInStatus: text("check_in_status").default("pending"), // pending, confirmed, checked-in, no-show
  checkInTime: text("check_in_time"),
  checkOutDate: date("check_out_date"),
  checkOutStatus: text("check_out_status").default("pending"), // pending, checked-out
  checkOutTime: text("check_out_time"),
  // Legacy fields for backward compatibility
  checkIn: date("check_in"),           // Deprecated - use checkInDate instead
  checkOut: date("check_out"),         // Deprecated - use checkOutDate instead
  specialRequests: text("special_requests"),
  // For tracking accompanying guests in same room
  includesPlusOne: boolean("includes_plus_one").default(false),
  includesChildren: boolean("includes_children").default(false),
  childrenCount: integer("children_count").default(0),
  additionalGuestsInfo: text("additional_guests_info"),
});

export const insertRoomAllocationSchema = createInsertSchema(roomAllocations).omit({
  id: true,
});

// Meal Options
export const mealOptions = pgTable("meal_options", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  ceremonyId: integer("ceremony_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  isGlutenFree: boolean("is_gluten_free").default(false),
  isNutFree: boolean("is_nut_free").default(false),
});

export const insertMealOptionSchema = createInsertSchema(mealOptions).omit({
  id: true,
});

// Guest Meal Selections
export const guestMealSelections = pgTable("guest_meal_selections", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull(),
  mealOptionId: integer("meal_option_id").notNull(),
  ceremonyId: integer("ceremony_id").notNull(),
  notes: text("notes"),
});

export const insertGuestMealSelectionSchema = createInsertSchema(guestMealSelections).omit({
  id: true,
});

// Messages for the couple
export const coupleMessages = pgTable("couple_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  guestId: integer("guest_id").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCoupleMessageSchema = createInsertSchema(coupleMessages).omit({
  id: true,
  createdAt: true,
});

// Relationship Types
export const relationshipTypes = pgTable("relationship_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // family, friend, custom
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRelationshipTypeSchema = createInsertSchema(relationshipTypes).omit({
  id: true,
  createdAt: true,
});

// WhatsApp Message Templates
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // invitation, rsvp, reminder, ceremony, travel, accommodation
  templateId: text("template_id"), // WhatsApp Business API template ID
  content: text("content").notNull(),
  parameters: jsonb("parameters").default("[]"), // Array of parameters to fill in template
  language: text("language").default("en_US"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used"),
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

// RSVP Follow-up Message Templates
export const rsvpFollowupTemplates = pgTable("rsvp_followup_templates", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  type: text("type").notNull(), // "confirmation" or "decline"
  emailTemplate: text("email_template"), // HTML template for email
  emailSubject: text("email_subject"), // Subject line for email
  whatsappTemplate: text("whatsapp_template"), // Text-only template for WhatsApp
  sendImmediately: boolean("send_immediately").default(true), // Whether to send immediately after RSVP
  scheduledDate: date("scheduled_date"), // If not sending immediately, date to send
  scheduledTime: text("scheduled_time"), // If not sending immediately, time to send
  enabled: boolean("enabled").default(true), // Whether this followup is enabled
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertRsvpFollowupTemplateSchema = createInsertSchema(rsvpFollowupTemplates).omit({
  id: true,
  lastUpdated: true,
});

// RSVP Follow-up Message Logs - tracking sent messages
export const rsvpFollowupLogs = pgTable("rsvp_followup_logs", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull(),
  templateId: integer("template_id").notNull(),
  channel: text("channel").notNull(), // "email" or "whatsapp"
  status: text("status").notNull(), // "sent", "delivered", "failed"
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertRsvpFollowupLogSchema = createInsertSchema(rsvpFollowupLogs).omit({
  id: true,
  sentAt: true,
});

// Communication Templates - Comprehensive template management for all communication types
export const communicationTemplates = pgTable("communication_templates", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }), // NULL for global templates
  categoryId: text("category_id").notNull(), // initial_invitations, formal_invitations, etc.
  templateId: text("template_id").notNull(), // save_the_date_email, formal_invitation_email, etc.
  channel: text("channel").notNull(), // email, whatsapp, sms
  name: text("name").notNull(), // Display name
  description: text("description"),
  subject: text("subject"), // Email subject line (null for WhatsApp/SMS)
  content: text("content").notNull(), // Template content with variables
  variables: jsonb("variables").default('[]'), // JSON array of variable placeholders
  tags: jsonb("tags").default('[]'), // JSON array of template tags for filtering
  conditionalOn: text("conditional_on"), // Condition for dynamic activation
  enabled: boolean("enabled").default(true),
  sortOrder: integer("sort_order").default(0),
  isSystem: boolean("is_system").default(false), // System templates can't be deleted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCommunicationTemplateSchema = createInsertSchema(communicationTemplates).omit({
  id: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
});

// Email Template Styles
export const emailTemplateStyles = pgTable("email_template_styles", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  headerLogo: text("header_logo"), // URL to logo image
  headerBackground: text("header_background"), // Background color or URL
  bodyBackground: text("body_background"), // Background color or URL
  textColor: text("text_color").default("000000"),
  linkColor: text("link_color").default("0000FF"),
  buttonColor: text("button_color").default("4CAF50"),
  buttonTextColor: text("button_text_color").default("FFFFFF"),
  fontFamily: text("font_family").default("Arial, sans-serif"),
  fontSize: text("font_size").default("16px"),
  borderColor: text("border_color").default("DDDDDD"),
  footerText: text("footer_text"),
  footerBackground: text("footer_background"), // Background color or URL
  css: text("css"), // Custom CSS for advanced styling
  isDefault: boolean("is_default").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailTemplateStyleSchema = createInsertSchema(emailTemplateStyles).omit({
  id: true,
  lastUpdated: true,
  createdAt: true,
});

// Email Assets (images, banners, etc.)
export const emailAssets = pgTable("email_assets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // logo, banner, signature, background, etc.
  url: text("url").notNull(), // URL to the asset
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  tags: text("tags"), // Comma-separated tags for organization
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailAssetSchema = createInsertSchema(emailAssets).omit({
  id: true,
  createdAt: true,
});

// Email Signatures
export const emailSignatures = pgTable("email_signatures", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(), // HTML content
  plainText: text("plain_text"), // Plain text version
  includesSocialLinks: boolean("includes_social_links").default(false),
  socialLinks: jsonb("social_links").default({}), // JSON with social media links
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmailSignatureSchema = createInsertSchema(emailSignatures).omit({
  id: true,
  createdAt: true,
});

// Email Sending History
export const emailHistory = pgTable("email_history", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  templateId: integer("template_id"),
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  recipients: text("recipients").notNull(), // JSON array or comma-separated list
  ccRecipients: text("cc_recipients"), // JSON array or comma-separated list
  bccRecipients: text("bcc_recipients"), // JSON array or comma-separated list
  bodyHtml: text("body_html"),
  bodyText: text("body_text"),
  status: text("status").notNull(), // sent, delivered, failed
  errorMessage: text("error_message"),
  messageId: text("message_id"),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  deliveredAt: timestamp("delivered_at"),
});

export const insertEmailHistorySchema = createInsertSchema(emailHistory).omit({
  id: true,
  openCount: true,
  clickCount: true,
  sentAt: true,
  deliveredAt: true,
});

// RBAC System Tables

// Roles table for dynamic role management
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., 'super_admin', 'event_manager', 'vendor'
  displayName: text("display_name").notNull(), // e.g., 'Super Administrator', 'Event Manager'
  description: text("description"),
  isActive: boolean("is_active").default(true),
  isSystemRole: boolean("is_system_role").default(false), // Cannot be deleted
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Permissions table for granular access control
export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g., 'events:create', 'guests:read'
  displayName: text("display_name").notNull(),
  description: text("description"),
  resource: text("resource").notNull(), // e.g., 'events', 'guests', 'communications'
  action: text("action").notNull(), // e.g., 'create', 'read', 'update', 'delete'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Role-Permission junction table
export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull(),
  grantedBy: integer("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});

// User-Role junction table (supports multiple roles per user)
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  roleId: integer("role_id").references(() => roles.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }), // For event-specific roles
  assignedBy: integer("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional role expiration
  isActive: boolean("is_active").default(true),
});

// Direct user permissions (overrides role permissions - for exceptions)
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }), // Event-specific permission
  granted: boolean("granted").default(true), // true = grant, false = deny (explicit deny)
  grantedBy: integer("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  reason: text("reason"), // Why this permission was granted/denied
});

// Audit trail for all RBAC changes
export const rbacAuditLog = pgTable("rbac_audit_log", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(), // 'role_assigned', 'permission_granted', 'role_created', etc.
  resourceType: text("resource_type").notNull(), // 'user', 'role', 'permission'
  resourceId: text("resource_id").notNull(), // ID of the affected resource
  targetUserId: integer("target_user_id").references(() => users.id), // User affected by the change
  performedBy: integer("performed_by").references(() => users.id).notNull(),
  oldValue: jsonb("old_value"), // Previous state
  newValue: jsonb("new_value"), // New state
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// User sessions for better security tracking
export const userSessions = pgTable("user_sessions", {
  id: text("id").primaryKey(), // UUID
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  deviceId: text("device_id"),
  deviceName: text("device_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  mfaVerified: boolean("mfa_verified").default(false),
  riskScore: integer("risk_score").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema validation schemas
export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  assignedAt: true,
});

export const insertUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  grantedAt: true,
});

export const insertRbacAuditLogSchema = createInsertSchema(rbacAuditLog).omit({
  id: true,
  timestamp: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  lastActivity: true,
  createdAt: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type WeddingEvent = typeof weddingEvents.$inferSelect;
export type InsertWeddingEvent = z.infer<typeof insertWeddingEventSchema>;

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;

export type Ceremony = typeof ceremonies.$inferSelect;
export type InsertCeremony = z.infer<typeof insertCeremonySchema>;

export type GuestCeremony = typeof guestCeremonies.$inferSelect;
export type InsertGuestCeremony = z.infer<typeof insertGuestCeremonySchema>;

export type TravelInfo = typeof travelInfo.$inferSelect;
export type InsertTravelInfo = z.infer<typeof insertTravelInfoSchema>;

export type Hotel = typeof hotels.$inferSelect;
export type InsertHotel = z.infer<typeof insertHotelSchema>;

export type Accommodation = typeof accommodations.$inferSelect;
export type InsertAccommodation = z.infer<typeof insertAccommodationSchema>;

export type GlobalRoomType = typeof globalRoomTypes.$inferSelect;
export type InsertGlobalRoomType = z.infer<typeof insertGlobalRoomTypeSchema>;

export type RoomAllocation = typeof roomAllocations.$inferSelect;
export type InsertRoomAllocation = z.infer<typeof insertRoomAllocationSchema>;

export type MealOption = typeof mealOptions.$inferSelect;
export type InsertMealOption = z.infer<typeof insertMealOptionSchema>;

export type GuestMealSelection = typeof guestMealSelections.$inferSelect;
export type InsertGuestMealSelection = z.infer<typeof insertGuestMealSelectionSchema>;

export type CoupleMessage = typeof coupleMessages.$inferSelect;
export type InsertCoupleMessage = z.infer<typeof insertCoupleMessageSchema>;

// Transport Vendors - external transport service providers
export const transportVendors = pgTable("transport_vendors", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  whatsappNumber: text("whatsapp_number"),
  vehicleFleet: jsonb("vehicle_fleet"), // Array of vehicle types and capacities
  specialization: text("specialization").array(), // ['airport_shuttle', 'luxury_cars', 'buses']
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Location Representatives - airport/station coordinators
export const locationRepresentatives = pgTable("location_representatives", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(),
  locationType: text("location_type"), // 'airport', 'train_station', 'hotel'
  locationName: text("location_name"), // 'GOI Terminal 1', 'Mumbai Central'
  terminalGate: text("terminal_gate"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  loginCredentials: jsonb("login_credentials"), // For app access
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Event Vehicles - available fleet for the event
export const eventVehicles = pgTable("event_vehicles", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  vendorId: integer("vendor_id").notNull(),
  vehicleType: text("vehicle_type").notNull(), // 'sedan', 'suv', 'tempo_traveller', 'mini_bus', 'coach'
  vehicleName: text("vehicle_name"),
  capacity: integer("capacity").notNull(),
  availableCount: integer("available_count").notNull(),
  hourlyRate: text("hourly_rate"), // Store as text for now
  features: text("features").array(), // ['ac', 'luggage_space', 'wheelchair_accessible']
  status: text("status").default("available").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Guest Travel Information - flight/train details
export const guestTravelInfo = pgTable("guest_travel_info", {
  id: serial("id").primaryKey(),
  guestId: integer("guest_id").notNull(),
  eventId: integer("event_id").notNull(),
  arrivalMethod: text("arrival_method"), // 'flight', 'train', 'car', 'bus'
  flightNumber: text("flight_number"),
  trainNumber: text("train_number"),
  scheduledArrival: timestamp("scheduled_arrival"),
  actualArrival: timestamp("actual_arrival"),
  delayMinutes: integer("delay_minutes").default(0),
  status: text("status").default("scheduled").notNull(), // 'scheduled', 'delayed', 'arrived', 'missed'
  terminalGate: text("terminal_gate"),
  luggageCount: integer("luggage_count"),
  specialAssistance: boolean("special_assistance").default(false),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transport Groups - groups of guests traveling together
export const transportGroups = pgTable("transport_groups", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull(), // Group identifier (e.g., "Airport Group A - May 15 Morning")
  transportMode: text("transport_mode").notNull(), // 'car', 'bus', 'shuttle', 'taxi', etc.
  vehicleType: text("vehicle_type"), // 'sedan', 'suv', 'mini-bus', 'coach', etc.
  vehicleCapacity: integer("vehicle_capacity"), // Number of people the vehicle can accommodate
  pickupLocation: text("pickup_location").notNull(), // Airport, train station, etc.
  pickupLocationDetails: text("pickup_location_details"), // Terminal, gate, etc.
  pickupDate: date("pickup_date").notNull(),
  pickupTimeSlot: text("pickup_time_slot").notNull(), // 2-hour time slot
  dropoffLocation: text("dropoff_location").notNull(), // Hotel, venue, etc.
  dropoffLocationDetails: text("dropoff_location_details"), // Room number, entrance, etc.
  vehicleCount: integer("vehicle_count").default(1), // Number of vehicles needed
  status: text("status").default("draft").notNull(), // 'draft', 'approved', 'completed', 'cancelled'
  providerName: text("provider_name"), // Name of transport provider
  providerContact: text("provider_contact"), // Contact details for provider
  driverInfo: text("driver_info"), // Driver name, contact, etc.
  specialInstructions: text("special_instructions"), // Instructions for driver, coordinator, or guests
  plannerNotes: text("planner_notes"), // Private notes for planner
  // Enhanced coordination fields
  assignedVendorId: integer("assigned_vendor_id"),
  airportRepId: integer("airport_rep_id"),
  vehicleId: integer("vehicle_id"),
  pickupStatus: text("pickup_status").default("pending"),
  guestsPickedUp: integer("guests_picked_up").default(0),
  totalGuests: integer("total_guests").default(0),
  delayNotifications: jsonb("delay_notifications"),
  realTimeUpdates: jsonb("real_time_updates"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransportGroupSchema = createInsertSchema(transportGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Transport Allocations - assigns guests to transport groups
export const transportAllocations = pgTable("transport_allocations", {
  id: serial("id").primaryKey(),
  transportGroupId: integer("transport_group_id").notNull(),
  guestId: integer("guest_id").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'confirmed', 'cancelled', 'no-show'
  includesPlusOne: boolean("includes_plus_one").default(false), // If the guest's plus one is included
  includesChildren: boolean("includes_children").default(false), // If the guest's children are included
  childrenCount: integer("children_count").default(0), // Number of children included
  specialNeeds: text("special_needs"), // Accessibility needs, extra luggage, etc.
  confirmedByGuest: boolean("confirmed_by_guest").default(false), // If the guest has confirmed
  flightDelayed: boolean("flight_delayed").default(false), // Flag for delayed flights
  delayInformation: text("delay_information"), // Details about the delay
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTransportAllocationSchema = createInsertSchema(transportAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Event Setup Wizard Progress (matching the actual database structure)
export const eventSetupProgress = pgTable("event_setup_progress", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => weddingEvents.id, { onDelete: 'cascade' }),
  currentStep: text("current_step"),
  basicInfoComplete: boolean("basic_info_complete").default(false),
  venuesComplete: boolean("venues_complete").default(false),
  rsvpComplete: boolean("rsvp_complete").default(false),
  accommodationComplete: boolean("accommodation_complete").default(false),
  transportComplete: boolean("transport_complete").default(false),
  communicationComplete: boolean("communication_complete").default(false),
  stylingComplete: boolean("styling_complete").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEventSetupProgressSchema = createInsertSchema(eventSetupProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

// Insert schemas for new transport tables
export const insertTransportVendorSchema = createInsertSchema(transportVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLocationRepresentativeSchema = createInsertSchema(locationRepresentatives).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEventVehicleSchema = createInsertSchema(eventVehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGuestTravelInfoSchema = createInsertSchema(guestTravelInfo).omit({
  id: true,
  createdAt: true,
});

export type TransportVendor = typeof transportVendors.$inferSelect;
export type InsertTransportVendor = z.infer<typeof insertTransportVendorSchema>;

export type LocationRepresentative = typeof locationRepresentatives.$inferSelect;
export type InsertLocationRepresentative = z.infer<typeof insertLocationRepresentativeSchema>;

export type EventVehicle = typeof eventVehicles.$inferSelect;
export type InsertEventVehicle = z.infer<typeof insertEventVehicleSchema>;

export type GuestTravelInfo = typeof guestTravelInfo.$inferSelect;
export type InsertGuestTravelInfo = z.infer<typeof insertGuestTravelInfoSchema>;

export type TransportGroup = typeof transportGroups.$inferSelect;
export type InsertTransportGroup = z.infer<typeof insertTransportGroupSchema>;

export type TransportAllocation = typeof transportAllocations.$inferSelect;
export type InsertTransportAllocation = z.infer<typeof insertTransportAllocationSchema>;

export type RelationshipType = typeof relationshipTypes.$inferSelect;
export type InsertRelationshipType = z.infer<typeof insertRelationshipTypeSchema>;

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;

export type RsvpFollowupTemplate = typeof rsvpFollowupTemplates.$inferSelect;
export type InsertRsvpFollowupTemplate = z.infer<typeof insertRsvpFollowupTemplateSchema>;

export type RsvpFollowupLog = typeof rsvpFollowupLogs.$inferSelect;
export type InsertRsvpFollowupLog = z.infer<typeof insertRsvpFollowupLogSchema>;



// Brand Assets - Logo, banners, colors, fonts for consistent branding
export const brandAssets = pgTable("brand_assets", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  assetType: text("asset_type").notNull(), // logo, email_banner, whatsapp_profile, social_media
  assetName: text("asset_name").notNull(), // Display name
  fileName: text("file_name"), // Original filename
  filePath: text("file_path"), // Storage path
  fileSize: integer("file_size"), // File size in bytes
  mimeType: text("mime_type"), // File MIME type
  dimensions: text("dimensions"), // Width x Height for images
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default('{}'), // Additional metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBrandAssetSchema = createInsertSchema(brandAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Brand Settings - Colors, fonts, and styling preferences
export const brandSettings = pgTable("brand_settings", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  primaryColor: text("primary_color").default("#F59E0B"), // Hex color code
  secondaryColor: text("secondary_color").default("#EA580C"), // Hex color code
  accentColor: text("accent_color").default("#FEF3C7"), // Hex color code
  primaryFont: text("primary_font").default("serif"), // Font family for headings
  secondaryFont: text("secondary_font").default("sans-serif"), // Font family for body
  logoUrl: text("logo_url"), // Logo asset URL
  emailBannerUrl: text("email_banner_url"), // Email header banner URL
  whatsappProfileUrl: text("whatsapp_profile_url"), // WhatsApp profile picture URL
  socialMediaKitUrl: text("social_media_kit_url"), // Social media assets URL
  customCss: text("custom_css"), // Custom CSS overrides
  brandGuidelines: text("brand_guidelines"), // Brand usage guidelines
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBrandSettingSchema = createInsertSchema(brandSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Communication Logs - Track all sent communications
export const communicationLogs = pgTable("communication_logs", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  guestId: integer("guest_id").references(() => guests.id, { onDelete: "cascade" }),
  templateId: integer("template_id").references(() => communicationTemplates.id, { onDelete: "set null" }),
  channel: text("channel").notNull(), // email, whatsapp, sms
  recipient: text("recipient").notNull(), // Email address or phone number
  subject: text("subject"), // Email subject (null for WhatsApp/SMS)
  content: text("content").notNull(), // Actual content sent (after variable substitution)
  status: text("status").notNull().default("pending"), // pending, sent, delivered, failed, opened, clicked
  errorMessage: text("error_message"), // Error details if failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  metadata: jsonb("metadata").default('{}'), // Additional tracking data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunicationLogSchema = createInsertSchema(communicationLogs).omit({
  id: true,
  createdAt: true,
});

export type CommunicationTemplate = typeof communicationTemplates.$inferSelect;
export type InsertCommunicationTemplate = z.infer<typeof insertCommunicationTemplateSchema>;

export type BrandAsset = typeof brandAssets.$inferSelect;
export type InsertBrandAsset = z.infer<typeof insertBrandAssetSchema>;

export type BrandSetting = typeof brandSettings.$inferSelect;
export type InsertBrandSetting = z.infer<typeof insertBrandSettingSchema>;

export type CommunicationLog = typeof communicationLogs.$inferSelect;
export type InsertCommunicationLog = z.infer<typeof insertCommunicationLogSchema>;

// Flight Details - Guest flight information for travel coordination
export const flightDetails = pgTable("flight_details", {
  id: text("id").primaryKey(), // UUID
  guestId: integer("guest_id").references(() => guests.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  flightType: text("flight_type").notNull(), // 'arrival' | 'departure'
  airline: text("airline").notNull(),
  flightNumber: text("flight_number").notNull(),
  departureAirport: text("departure_airport").notNull(), // IATA code
  arrivalAirport: text("arrival_airport").notNull(), // IATA code
  scheduledDeparture: timestamp("scheduled_departure").notNull(),
  scheduledArrival: timestamp("scheduled_arrival").notNull(),
  actualDeparture: timestamp("actual_departure"),
  actualArrival: timestamp("actual_arrival"),
  status: text("status").notNull().default("scheduled"), // 'scheduled' | 'boarding' | 'departed' | 'arrived' | 'delayed' | 'cancelled'
  gate: text("gate"),
  terminal: text("terminal"),
  seat: text("seat"),
  assistanceRequired: boolean("assistance_required").default(false),
  specialRequirements: jsonb("special_requirements").default('[]'), // Array of special requirements
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFlightDetailsSchema = createInsertSchema(flightDetails).omit({
  createdAt: true,
  updatedAt: true,
});

// Flight Assistance Requests - Airport assistance requests for guests
export const flightAssistanceRequests = pgTable("flight_assistance_requests", {
  id: text("id").primaryKey(), // UUID
  flightId: text("flight_id").references(() => flightDetails.id, { onDelete: "cascade" }).notNull(),
  guestId: integer("guest_id").references(() => guests.id, { onDelete: "cascade" }).notNull(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  assistanceType: text("assistance_type").notNull(), // 'pickup' | 'checkin' | 'wheelchair' | 'language' | 'customs' | 'baggage'
  description: text("description"),
  contactPhone: text("contact_phone"),
  meetingPoint: text("meeting_point"),
  representativeId: text("representative_id"),
  status: text("status").notNull().default("requested"), // 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFlightAssistanceRequestSchema = createInsertSchema(flightAssistanceRequests).omit({
  createdAt: true,
  updatedAt: true,
});

// Airport Representatives - Airport assistance personnel
export const airportRepresentatives = pgTable("airport_representatives", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  airport: text("airport").notNull(), // IATA airport code
  languages: jsonb("languages").default('["en"]'), // Array of language codes
  specializations: jsonb("specializations").default('[]'), // Array of specialization types
  availability: jsonb("availability").default('{}'), // Weekly availability schedule
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"), // 0-5 rating
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAirportRepresentativeSchema = createInsertSchema(airportRepresentatives).omit({
  createdAt: true,
  updatedAt: true,
});

// Type exports for flight-related tables
export type FlightDetails = typeof flightDetails.$inferSelect;
export type InsertFlightDetails = z.infer<typeof insertFlightDetailsSchema>;

export type FlightAssistanceRequest = typeof flightAssistanceRequests.$inferSelect;
export type InsertFlightAssistanceRequest = z.infer<typeof insertFlightAssistanceRequestSchema>;

export type AirportRepresentative = typeof airportRepresentatives.$inferSelect;
export type InsertAirportRepresentative = z.infer<typeof insertAirportRepresentativeSchema>;

// RBAC Type exports
export type Role = typeof roles.$inferSelect;
export type InsertRole = z.infer<typeof insertRoleSchema>;

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;

export type RbacAuditLog = typeof rbacAuditLog.$inferSelect;
export type InsertRbacAuditLog = z.infer<typeof insertRbacAuditLogSchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

// SMS Provider Configuration - SMS service provider settings
export const smsProviderConfigs = pgTable("sms_provider_configs", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  providerName: text("provider_name").notNull(), // 'twilio', 'aws_sns', 'other'
  providerType: text("provider_type").notNull(), // 'primary', 'backup', 'test'
  isActive: boolean("is_active").default(true),
  configuration: jsonb("configuration").notNull(), // Provider-specific config (API keys, etc.)
  supportedCountries: jsonb("supported_countries").default('[]'), // ISO country codes
  rateLimits: jsonb("rate_limits").default('{}'), // Rate limiting configuration
  webhookUrl: text("webhook_url"), // Webhook for delivery status
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SMS Templates - Reusable SMS message templates
export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'rsvp_reminder', 'transport_update', 'general', 'welcome'
  subject: text("subject"), // For MMS or rich content
  content: text("content").notNull(), // Template with variables like {{guestName}}
  variables: jsonb("variables").default('[]'), // Available template variables
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SMS Delivery Logs - Track SMS delivery status and analytics
export const smsDeliveryLogs = pgTable("sms_delivery_logs", {
  id: text("id").primaryKey(), // UUID
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  guestId: integer("guest_id").references(() => guests.id, { onDelete: "cascade" }),
  templateId: integer("template_id").references(() => smsTemplates.id, { onDelete: "set null" }),
  providerId: integer("provider_id").references(() => smsProviderConfigs.id).notNull(),
  phoneNumber: text("phone_number").notNull(),
  countryCode: text("country_code").notNull(), // ISO country code
  content: text("content").notNull(), // Final rendered content
  providerMessageId: text("provider_message_id"), // External provider's message ID
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'delivered', 'failed', 'undelivered'
  errorCode: text("error_code"), // Provider error code
  errorMessage: text("error_message"), // Human readable error
  cost: decimal("cost", { precision: 10, scale: 6 }), // Cost in USD
  segments: integer("segments").default(1), // Number of SMS segments
  direction: text("direction").default("outbound"), // 'outbound', 'inbound'
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  webhookData: jsonb("webhook_data").default('{}'), // Raw webhook payload
  retryCount: integer("retry_count").default(0),
  maxRetries: integer("max_retries").default(3),
  nextRetryAt: timestamp("next_retry_at"),
  metadata: jsonb("metadata").default('{}'), // Additional tracking data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// SMS Opt-out Management - Handle SMS unsubscriptions
export const smsOptOuts = pgTable("sms_opt_outs", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  phoneNumber: text("phone_number").notNull(),
  countryCode: text("country_code").notNull(),
  guestId: integer("guest_id").references(() => guests.id, { onDelete: "set null" }),
  reason: text("reason"), // 'user_request', 'compliance', 'bounce', 'complaint'
  optOutMethod: text("opt_out_method"), // 'keyword', 'admin', 'api', 'webhook'
  isActive: boolean("is_active").default(true),
  optedOutAt: timestamp("opted_out_at").defaultNow().notNull(),
  optedBackInAt: timestamp("opted_back_in_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SMS Analytics Summary - Aggregated SMS statistics
export const smsAnalytics = pgTable("sms_analytics", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  providerId: integer("provider_id").references(() => smsProviderConfigs.id),
  date: date("date").notNull(),
  totalSent: integer("total_sent").default(0),
  totalDelivered: integer("total_delivered").default(0),
  totalFailed: integer("total_failed").default(0),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).default("0.00"),
  averageDeliveryTime: integer("average_delivery_time"), // seconds
  deliveryRate: decimal("delivery_rate", { precision: 5, scale: 2 }).default("0.00"), // percentage
  errorRate: decimal("error_rate", { precision: 5, scale: 2 }).default("0.00"), // percentage
  topErrorCodes: jsonb("top_error_codes").default('[]'),
  countryBreakdown: jsonb("country_breakdown").default('{}'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for SMS tables
export const insertSmsProviderConfigSchema = createInsertSchema(smsProviderConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmsTemplateSchema = createInsertSchema(smsTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSmsDeliveryLogSchema = createInsertSchema(smsDeliveryLogs).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertSmsOptOutSchema = createInsertSchema(smsOptOuts).omit({
  id: true,
  createdAt: true,
});

export const insertSmsAnalyticsSchema = createInsertSchema(smsAnalytics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for SMS tables
export type SmsProviderConfig = typeof smsProviderConfigs.$inferSelect;
export type InsertSmsProviderConfig = z.infer<typeof insertSmsProviderConfigSchema>;

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = z.infer<typeof insertSmsTemplateSchema>;

export type SmsDeliveryLog = typeof smsDeliveryLogs.$inferSelect;
export type InsertSmsDeliveryLog = z.infer<typeof insertSmsDeliveryLogSchema>;

export type SmsOptOut = typeof smsOptOuts.$inferSelect;
export type InsertSmsOptOut = z.infer<typeof insertSmsOptOutSchema>;

export type SmsAnalytics = typeof smsAnalytics.$inferSelect;
export type InsertSmsAnalytics = z.infer<typeof insertSmsAnalyticsSchema>;

// Communication Events - Unified analytics for all communication channels
export const communicationEvents = pgTable("communication_events", {
  id: text("id").primaryKey(), // UUID
  eventId: text("event_id").notNull(), // Reference to wedding event
  guestId: text("guest_id"), // Optional reference to guest
  messageId: text("message_id").notNull(), // Reference to specific message
  channel: text("channel").notNull(), // 'email', 'sms', 'whatsapp', 'push'
  eventType: text("event_type").notNull(), // 'message_sent', 'message_delivered', 'message_opened', etc.
  timestamp: timestamp("timestamp").notNull(),
  data: jsonb("data"), // Additional event-specific data
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  location: jsonb("location"), // {country, region, city}
  device: jsonb("device"), // {type, os, browser}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A/B Tests - Communication testing framework
export const abTests = pgTable("ab_tests", {
  id: text("id").primaryKey(), // UUID
  eventId: text("event_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  channel: text("channel").notNull(), // 'email', 'sms', 'whatsapp'
  variants: jsonb("variants").notNull(), // Array of variant configurations
  status: text("status").notNull(), // 'draft', 'active', 'paused', 'completed'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  targetAudience: jsonb("target_audience"), // {totalSize, criteria}
  primaryMetric: text("primary_metric").notNull(), // 'delivery_rate', 'open_rate', etc.
  confidenceLevel: decimal("confidence_level", { precision: 3, scale: 2 }).default("0.95"),
  minSampleSize: integer("min_sample_size").default(1000),
  results: jsonb("results"), // Test results and statistical data
  winnerVariant: text("winner_variant"), // ID of winning variant
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Email Messages - Email tracking table
export const emailMessages = pgTable("email_messages", {
  id: text("id").primaryKey(), // UUID
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  messageId: text("message_id").unique(), // Provider message ID
  recipientEmail: text("recipient_email").notNull(),
  subject: text("subject").notNull(),
  templateId: text("template_id"),
  templateName: text("template_name"),
  status: text("status").default("pending"), // 'pending', 'sent', 'delivered', 'failed'
  cost: decimal("cost", { precision: 8, scale: 4 }),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// WhatsApp Messages - WhatsApp tracking table  
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: text("id").primaryKey(), // UUID
  eventId: integer("event_id").references(() => weddingEvents.id, { onDelete: "cascade" }).notNull(),
  messageId: text("message_id"),
  providerMessageId: text("provider_message_id"), // WhatsApp API message ID
  recipientPhone: text("recipient_phone").notNull(),
  templateName: text("template_name"),
  templateLanguage: text("template_language").default("en"),
  status: text("status").default("pending"), // 'pending', 'sent', 'delivered', 'read', 'failed'
  cost: decimal("cost", { precision: 8, scale: 4 }),
  metadata: jsonb("metadata"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for communication analytics tables
export const insertCommunicationEventSchema = createInsertSchema(communicationEvents).omit({
  createdAt: true,
});

export const insertABTestSchema = createInsertSchema(abTests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({
  createdAt: true,
  updatedAt: true,
});

// Type exports for communication analytics tables
export type CommunicationEvent = typeof communicationEvents.$inferSelect;
export type InsertCommunicationEvent = z.infer<typeof insertCommunicationEventSchema>;

export type ABTest = typeof abTests.$inferSelect;
export type InsertABTest = z.infer<typeof insertABTestSchema>;

export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;
