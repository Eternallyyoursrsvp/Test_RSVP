/**
 * Database Field Encryption Configuration
 * 
 * Defines which database fields should be encrypted and with which context.
 * This configuration ensures consistent encryption across the application.
 */

import { EncryptionContext } from '../services/encryption-service';

// Field encryption mapping for Users table
export const USER_ENCRYPTION_FIELDS = {
  email: EncryptionContext.USER_PII,
  password: EncryptionContext.AUTH_TOKENS, // Password hashes (additional layer)
} as const;

// Field encryption mapping for Wedding Events table
export const WEDDING_EVENT_ENCRYPTION_FIELDS = {
  // Email provider settings
  emailApiKey: EncryptionContext.API_KEYS,
  emailFromAddress: EncryptionContext.USER_PII,
  
  // WhatsApp Business API settings
  whatsappAccessToken: EncryptionContext.API_KEYS,
  whatsappBusinessPhoneId: EncryptionContext.USER_PII,
  whatsappBusinessNumber: EncryptionContext.USER_PII,
  whatsappBusinessAccountId: EncryptionContext.API_KEYS,
  
  // Gmail OAuth settings
  gmailClientSecret: EncryptionContext.API_KEYS,
  gmailAccessToken: EncryptionContext.AUTH_TOKENS,
  gmailRefreshToken: EncryptionContext.AUTH_TOKENS,
  gmailAccount: EncryptionContext.USER_PII,
  gmailPassword: EncryptionContext.AUTH_TOKENS,
  
  // Outlook OAuth settings
  outlookClientSecret: EncryptionContext.API_KEYS,
  outlookAccessToken: EncryptionContext.AUTH_TOKENS,
  outlookRefreshToken: EncryptionContext.AUTH_TOKENS,
  outlookAccount: EncryptionContext.USER_PII,
  
  // Third-party API keys
  sendGridApiKey: EncryptionContext.API_KEYS,
  brevoApiKey: EncryptionContext.API_KEYS,
  
  // Contact information
  accommodationHotelPhone: EncryptionContext.USER_PII,
  transportProviderContact: EncryptionContext.USER_PII,
  transportProviderEmail: EncryptionContext.USER_PII,
} as const;

// Field encryption mapping for Guests table
export const GUEST_ENCRYPTION_FIELDS = {
  email: EncryptionContext.USER_PII,
  phone: EncryptionContext.USER_PII,
  phone2: EncryptionContext.USER_PII,
  dietaryRequirements: EncryptionContext.USER_PII,
  specialRequests: EncryptionContext.USER_PII,
  notes: EncryptionContext.USER_PII,
  emergencyContactName: EncryptionContext.USER_PII,
  emergencyContactPhone: EncryptionContext.USER_PII,
  emergencyContactRelation: EncryptionContext.USER_PII,
} as const;

// Field encryption mapping for Communication History
export const COMMUNICATION_ENCRYPTION_FIELDS = {
  content: EncryptionContext.COMMUNICATIONS,
  metadata: EncryptionContext.METADATA,
  response: EncryptionContext.COMMUNICATIONS,
  errorDetails: EncryptionContext.METADATA,
} as const;

// Field encryption mapping for Flight Details
export const FLIGHT_ENCRYPTION_FIELDS = {
  confirmationNumber: EncryptionContext.USER_PII,
  ticketNumber: EncryptionContext.USER_PII,
  seatNumber: EncryptionContext.USER_PII,
  specialRequests: EncryptionContext.USER_PII,
  emergencyContact: EncryptionContext.USER_PII,
  emergencyPhone: EncryptionContext.USER_PII,
  notes: EncryptionContext.USER_PII,
} as const;

// Field encryption mapping for Accommodation Bookings
export const ACCOMMODATION_ENCRYPTION_FIELDS = {
  confirmationNumber: EncryptionContext.USER_PII,
  contactPhone: EncryptionContext.USER_PII,
  contactEmail: EncryptionContext.USER_PII,
  specialRequests: EncryptionContext.USER_PII,
  notes: EncryptionContext.USER_PII,
} as const;

// Field encryption mapping for Transport Bookings
export const TRANSPORT_ENCRYPTION_FIELDS = {
  pickupLocation: EncryptionContext.USER_PII,
  dropoffLocation: EncryptionContext.USER_PII,
  pickupTime: EncryptionContext.USER_PII,
  contactPhone: EncryptionContext.USER_PII,
  driverName: EncryptionContext.USER_PII,
  driverPhone: EncryptionContext.USER_PII,
  vehicleDetails: EncryptionContext.USER_PII,
  specialRequests: EncryptionContext.USER_PII,
  notes: EncryptionContext.USER_PII,
} as const;

// Field encryption mapping for RBAC tables
export const RBAC_ENCRYPTION_FIELDS = {
  // User roles metadata might contain sensitive info
  metadata: EncryptionContext.METADATA,
} as const;

// Field encryption mapping for Audit Logs
export const AUDIT_LOG_ENCRYPTION_FIELDS = {
  oldValue: EncryptionContext.METADATA,
  newValue: EncryptionContext.METADATA,
  ipAddress: EncryptionContext.USER_PII,
  userAgent: EncryptionContext.METADATA,
} as const;

// Consolidated field mappings by table
export const TABLE_ENCRYPTION_MAPPINGS = {
  users: USER_ENCRYPTION_FIELDS,
  wedding_events: WEDDING_EVENT_ENCRYPTION_FIELDS,
  guests: GUEST_ENCRYPTION_FIELDS,
  communication_history: COMMUNICATION_ENCRYPTION_FIELDS,  
  flight_details: FLIGHT_ENCRYPTION_FIELDS,
  accommodation_bookings: ACCOMMODATION_ENCRYPTION_FIELDS,
  transport_bookings: TRANSPORT_ENCRYPTION_FIELDS,
  rbac_audit_log: AUDIT_LOG_ENCRYPTION_FIELDS,
} as const;

// Utility type to get encryption fields for a table
export type TableEncryptionFields<T extends keyof typeof TABLE_ENCRYPTION_MAPPINGS> = 
  typeof TABLE_ENCRYPTION_MAPPINGS[T];

// Utility function to get encryption fields for a table
export function getTableEncryptionFields<T extends keyof typeof TABLE_ENCRYPTION_MAPPINGS>(
  tableName: T
): TableEncryptionFields<T> {
  return TABLE_ENCRYPTION_MAPPINGS[tableName];
}

// Fields that should NEVER be encrypted (for reference)
export const NEVER_ENCRYPT_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'is_active',
  'enabled',
  'version',
  'status',
  'type',
  'role',
  'event_id',
  'user_id',
  'guest_id',
] as const;

// High-risk fields that require extra security measures
export const HIGH_RISK_FIELDS = [
  'password',
  'access_token',
  'refresh_token',
  'api_key',
  'client_secret',
  'private_key',
  'webhook_secret',
] as const;

// Fields containing PII that need special handling for GDPR compliance
export const PII_FIELDS = [
  'email',
  'phone',
  'phone2',
  'first_name',
  'last_name',
  'name',
  'address',
  'postal_code',
  'city',
  'country',
  'emergency_contact_name',
  'emergency_contact_phone',
  'ip_address',
  'location',
] as const;

// Export types for TypeScript inference
export type UserEncryptionFields = typeof USER_ENCRYPTION_FIELDS;
export type WeddingEventEncryptionFields = typeof WEDDING_EVENT_ENCRYPTION_FIELDS;
export type GuestEncryptionFields = typeof GUEST_ENCRYPTION_FIELDS;
export type CommunicationEncryptionFields = typeof COMMUNICATION_ENCRYPTION_FIELDS;
export type FlightEncryptionFields = typeof FLIGHT_ENCRYPTION_FIELDS;
export type AccommodationEncryptionFields = typeof ACCOMMODATION_ENCRYPTION_FIELDS;
export type TransportEncryptionFields = typeof TRANSPORT_ENCRYPTION_FIELDS;