import { WeddingEvent, Guest, Hotel, Accommodation } from '../../shared/schema';

/**
 * Variable Substitution Engine
 * Processes template variables with real data from database
 */

export interface VariableContext {
  event?: WeddingEvent;
  guest?: Guest;
  hotel?: Hotel;
  accommodation?: Accommodation;
  rsvpLink?: string;
  rsvpStage2Link?: string;
  customVariables?: Record<string, string>;
}

/**
 * Available template variables with descriptions
 */
export const TEMPLATE_VARIABLES = {
  // Guest Variables
  guest_name: 'Guest full name',
  guest_first_name: 'Guest first name',
  guest_last_name: 'Guest last name',
  guest_email: 'Guest email address',
  guest_phone: 'Guest phone number',
  
  // Event Variables
  event_name: 'Wedding event title',
  couple_names: 'Couple names together',
  bride_name: 'Bride name',
  groom_name: 'Groom name', 
  start_date: 'Wedding start date',
  end_date: 'Wedding end date',
  location: 'Wedding location',
  description: 'Wedding description',
  
  // RSVP Variables
  rsvp_deadline: 'RSVP deadline date',
  rsvp_link: 'RSVP form link',
  rsvp_stage2_link: 'Stage 2 RSVP link',
  rsvp_summary: 'RSVP confirmation summary',
  
  // Accommodation Variables
  hotel_name: 'Hotel name',
  hotel_address: 'Hotel address',
  hotel_phone: 'Hotel phone number',
  hotel_website: 'Hotel website',
  hotel_details: 'Complete hotel information',
  booking_instructions: 'Hotel booking instructions',
  booking_deadline: 'Hotel booking deadline',
  special_rates: 'Special hotel rates',
  accommodation_notes: 'Accommodation special notes',
  
  // Transport Variables
  transport_provider_name: 'Transport provider name',
  transport_provider_contact: 'Transport provider contact',
  transport_details: 'Transport arrangement details',
  transport_schedule: 'Transport schedule',
  airport_rep_contact: 'Airport representative contact',
  
  // Flight Variables
  flight_coordination_info: 'Flight coordination information',
  flight_details: 'Flight booking details',
  recommended_airlines: 'Recommended airlines',
  airline_discount_codes: 'Airline discount codes',
  
  // Ceremony Variables
  ceremony_schedule: 'Ceremony schedule',
  venue_details: 'Venue information',
  attire_code: 'Dress code/attire',
  ceremony_notes: 'Important ceremony notes',
  
  // Communication Variables
  next_steps: 'Next steps for guest',
  important_reminders: 'Important reminders',
  emergency_contacts: 'Emergency contact information',
  details_deadline: 'Deadline for providing details',
  
  // Post-Wedding Variables
  photo_sharing_link: 'Wedding photo sharing link',
  personal_thank_you_note: 'Personal thank you message',
  
  // Weather & Updates
  weather_info: 'Weather information',
  final_schedule: 'Final event schedule',
  final_reminders: 'Final reminders',
};

/**
 * Substitute variables in template content
 */
export function substituteVariables(
  content: string,
  context: VariableContext
): string {
  let processedContent = content;
  
  // Process each variable type
  processedContent = substituteGuestVariables(processedContent, context.guest);
  processedContent = substituteEventVariables(processedContent, context.event);
  processedContent = substituteRSVPVariables(processedContent, context);
  processedContent = substituteAccommodationVariables(processedContent, context);
  processedContent = substituteTransportVariables(processedContent, context.event);
  processedContent = substituteCustomVariables(processedContent, context.customVariables);
  
  return processedContent;
}

/**
 * Substitute guest-related variables
 */
function substituteGuestVariables(content: string, guest?: Guest): string {
  if (!guest) {
    return content
      .replace(/\{\{guest_name\}\}/g, '[Guest Name]')
      .replace(/\{\{guest_first_name\}\}/g, '[First Name]')
      .replace(/\{\{guest_last_name\}\}/g, '[Last Name]')
      .replace(/\{\{guest_email\}\}/g, '[Email]')
      .replace(/\{\{guest_phone\}\}/g, '[Phone]');
  }
  
  const nameParts = guest.name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return content
    .replace(/\{\{guest_name\}\}/g, guest.name)
    .replace(/\{\{guest_first_name\}\}/g, firstName)
    .replace(/\{\{guest_last_name\}\}/g, lastName)
    .replace(/\{\{guest_email\}\}/g, guest.email || '[Email not provided]')
    .replace(/\{\{guest_phone\}\}/g, guest.phone || '[Phone not provided]');
}

/**
 * Substitute event-related variables
 */
function substituteEventVariables(content: string, event?: WeddingEvent): string {
  if (!event) {
    return content
      .replace(/\{\{event_name\}\}/g, '[Event Name]')
      .replace(/\{\{couple_names\}\}/g, '[Couple Names]')
      .replace(/\{\{bride_name\}\}/g, '[Bride Name]')
      .replace(/\{\{groom_name\}\}/g, '[Groom Name]')
      .replace(/\{\{start_date\}\}/g, '[Start Date]')
      .replace(/\{\{end_date\}\}/g, '[End Date]')
      .replace(/\{\{location\}\}/g, '[Location]')
      .replace(/\{\{description\}\}/g, '[Description]');
  }
  
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };
  
  return content
    .replace(/\{\{event_name\}\}/g, event.title || '[Event Name]')
    .replace(/\{\{couple_names\}\}/g, event.coupleNames || '[Couple Names]')
    .replace(/\{\{bride_name\}\}/g, event.brideName || '[Bride Name]')
    .replace(/\{\{groom_name\}\}/g, event.groomName || '[Groom Name]')
    .replace(/\{\{start_date\}\}/g, event.startDate ? formatDate(event.startDate) : '[Start Date]')
    .replace(/\{\{end_date\}\}/g, event.endDate ? formatDate(event.endDate) : '[End Date]')
    .replace(/\{\{location\}\}/g, event.location || '[Location]')
    .replace(/\{\{description\}\}/g, event.description || '[Description]');
}

/**
 * Substitute RSVP-related variables
 */
function substituteRSVPVariables(content: string, context: VariableContext): string {
  const rsvpDeadline = context.event?.rsvpDeadline 
    ? new Date(context.event.rsvpDeadline).toLocaleDateString()
    : '[RSVP Deadline]';
    
  return content
    .replace(/\{\{rsvp_deadline\}\}/g, rsvpDeadline)
    .replace(/\{\{rsvp_link\}\}/g, context.rsvpLink || '[RSVP Link]')
    .replace(/\{\{rsvp_stage2_link\}\}/g, context.rsvpStage2Link || '[Stage 2 RSVP Link]')
    .replace(/\{\{rsvp_summary\}\}/g, '[RSVP Summary]');
}

/**
 * Substitute accommodation-related variables
 */
function substituteAccommodationVariables(content: string, context: VariableContext): string {
  const event = context.event;
  const hotel = context.hotel;
  
  const hotelDetails = hotel ? 
    `${hotel.name}\n${hotel.address || ''}\nPhone: ${hotel.phone || 'N/A'}\nWebsite: ${hotel.website || 'N/A'}` :
    event?.accommodationHotelName ? 
      `${event.accommodationHotelName}\n${event.accommodationHotelAddress || ''}\nPhone: ${event.accommodationHotelPhone || 'N/A'}\nWebsite: ${event.accommodationHotelWebsite || 'N/A'}` :
      '[Hotel Details]';
  
  return content
    .replace(/\{\{hotel_name\}\}/g, hotel?.name || event?.accommodationHotelName || '[Hotel Name]')
    .replace(/\{\{hotel_address\}\}/g, hotel?.address || event?.accommodationHotelAddress || '[Hotel Address]')
    .replace(/\{\{hotel_phone\}\}/g, hotel?.phone || event?.accommodationHotelPhone || '[Hotel Phone]')
    .replace(/\{\{hotel_website\}\}/g, hotel?.website || event?.accommodationHotelWebsite || '[Hotel Website]')
    .replace(/\{\{hotel_details\}\}/g, hotelDetails)
    .replace(/\{\{booking_instructions\}\}/g, event?.accommodationInstructions || '[Booking Instructions]')
    .replace(/\{\{booking_deadline\}\}/g, '[Booking Deadline]')
    .replace(/\{\{special_rates\}\}/g, event?.accommodationSpecialRates || '[Special Rates]')
    .replace(/\{\{accommodation_notes\}\}/g, event?.accommodationSpecialDeals || '[Accommodation Notes]');
}

/**
 * Substitute transport-related variables
 */
function substituteTransportVariables(content: string, event?: WeddingEvent): string {
  const transportDetails = event?.transportProviderName ?
    `Provider: ${event.transportProviderName}\nContact: ${event.transportProviderContact || 'N/A'}\nEmail: ${event.transportProviderEmail || 'N/A'}` :
    '[Transport Details]';
  
  return content
    .replace(/\{\{transport_provider_name\}\}/g, event?.transportProviderName || '[Transport Provider]')
    .replace(/\{\{transport_provider_contact\}\}/g, event?.transportProviderContact || '[Provider Contact]')
    .replace(/\{\{transport_details\}\}/g, transportDetails)
    .replace(/\{\{transport_schedule\}\}/g, '[Transport Schedule]')
    .replace(/\{\{airport_rep_contact\}\}/g, event?.transportProviderContact || '[Airport Rep Contact]')
    .replace(/\{\{flight_coordination_info\}\}/g, event?.flightInstructions || '[Flight Information]')
    .replace(/\{\{flight_details\}\}/g, '[Flight Details]')
    .replace(/\{\{recommended_airlines\}\}/g, event?.recommendedAirlines || '[Recommended Airlines]')
    .replace(/\{\{airline_discount_codes\}\}/g, event?.airlineDiscountCodes || '[Discount Codes]');
}

/**
 * Substitute custom variables
 */
function substituteCustomVariables(content: string, customVariables?: Record<string, string>): string {
  if (!customVariables) return content;
  
  let processedContent = content;
  Object.entries(customVariables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    processedContent = processedContent.replace(regex, value);
  });
  
  return processedContent;
}

/**
 * Extract all variables used in template content
 */
export function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = variableRegex.exec(content)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables;
}

/**
 * Validate that all required variables are available in context
 */
export function validateVariableContext(
  content: string,
  context: VariableContext
): { isValid: boolean; missingVariables: string[] } {
  const usedVariables = extractVariablesFromContent(content);
  const missingVariables: string[] = [];
  
  // Check which variables are missing from context
  for (const variable of usedVariables) {
    if (!isVariableAvailable(variable, context)) {
      missingVariables.push(variable);
    }
  }
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}

/**
 * Check if a specific variable is available in the context
 */
function isVariableAvailable(variable: string, context: VariableContext): boolean {
  // Guest variables
  if (variable.startsWith('guest_')) {
    return !!context.guest;
  }
  
  // Event variables
  if (['event_name', 'couple_names', 'bride_name', 'groom_name', 'start_date', 'end_date', 'location', 'description'].includes(variable)) {
    return !!context.event;
  }
  
  // RSVP variables
  if (variable === 'rsvp_link') {
    return !!context.rsvpLink;
  }
  
  if (variable === 'rsvp_stage2_link') {
    return !!context.rsvpStage2Link;
  }
  
  // Accommodation variables
  if (variable.startsWith('hotel_') || variable.includes('accommodation') || variable.includes('booking')) {
    return !!(context.hotel || context.event?.accommodationHotelName);
  }
  
  // Transport variables
  if (variable.includes('transport') || variable.includes('flight')) {
    return !!(context.event?.transportProviderName || context.event?.flightInstructions);
  }
  
  // Custom variables
  if (context.customVariables && variable in context.customVariables) {
    return true;
  }
  
  // Default to available (will show placeholder)
  return true;
}

/**
 * Generate preview content with sample data
 */
export function generatePreviewContent(content: string): string {
  const sampleContext: VariableContext = {
    event: {
      title: 'Raj Weds Riya',
      coupleNames: 'Raj & Riya',
      brideName: 'Riya Patel',
      groomName: 'Raj Sharma',
      startDate: '2025-08-28',
      endDate: '2025-08-30',
      location: 'Goa, India',
      description: 'A beautiful celebration of love and tradition',
      accommodationHotelName: 'Grand Hyatt Goa',
      accommodationHotelAddress: 'P.O. Bambolim, Goa 403206',
      accommodationHotelPhone: '+91 832 671 1234',
      transportProviderName: 'Sunset Getaways',
      transportProviderContact: '+91 93814 26464'
    } as WeddingEvent,
    guest: {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '+91 98765 43210'
    } as Guest,
    rsvpLink: 'https://example.com/rsvp/abc123',
    rsvpStage2Link: 'https://example.com/rsvp/stage2/abc123',
    customVariables: {
      ceremony_schedule: 'Mehendi: Aug 28, 6:00 PM\nSangam: Aug 29, 10:00 AM\nWedding: Aug 29, 7:00 PM',
      venue_details: 'Grand Hyatt Goa\nBeautiful beachfront location with traditional Indian wedding setup',
      attire_code: 'Traditional Indian attire requested\nMehendi: Bright colors\nWedding: Formal traditional wear'
    }
  };
  
  return substituteVariables(content, sampleContext);
}