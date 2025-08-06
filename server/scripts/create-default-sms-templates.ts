/**
 * Default SMS Templates Creation Script
 * Creates standard SMS templates for common wedding communication scenarios
 */

import { getSmsService } from '../services/sms-service';
import { getDatabaseConnection } from '../database/schema-validation';

interface TemplateData {
  name: string;
  category: 'rsvp_reminder' | 'transport_update' | 'general' | 'welcome';
  content: string;
  variables: string[];
}

const defaultTemplates: TemplateData[] = [
  {
    name: 'RSVP Reminder',
    category: 'rsvp_reminder',
    content: 'Hi {{guestName}}! This is a friendly reminder to RSVP for {{coupleNames}}\'s wedding by {{rsvpDeadline}}. Please visit {{rsvpUrl}} to confirm your attendance. Thank you!',
    variables: ['guestName', 'coupleNames', 'rsvpDeadline', 'rsvpUrl']
  },
  {
    name: 'RSVP Final Reminder',
    category: 'rsvp_reminder',
    content: 'Final reminder: {{guestName}}, we need your RSVP for {{coupleNames}}\'s wedding by {{rsvpDeadline}} (tomorrow!). Please respond at {{rsvpUrl}}. We hope to celebrate with you!',
    variables: ['guestName', 'coupleNames', 'rsvpDeadline', 'rsvpUrl']
  },
  {
    name: 'Transport Pickup Notification',
    category: 'transport_update',
    content: 'Hi {{guestName}}! Your transport for {{eventName}} is scheduled for pickup at {{pickupTime}} from {{pickupLocation}}. Driver: {{driverName}} ({{driverPhone}}). Please be ready 5 minutes early.',
    variables: ['guestName', 'eventName', 'pickupTime', 'pickupLocation', 'driverName', 'driverPhone']
  },
  {
    name: 'Transport Delay Notification',
    category: 'transport_update',
    content: 'Update: {{guestName}}, your transport pickup is delayed by {{delayMinutes}} minutes due to {{delayReason}}. New pickup time: {{newPickupTime}}. Sorry for any inconvenience!',
    variables: ['guestName', 'delayMinutes', 'delayReason', 'newPickupTime']
  },
  {
    name: 'Flight Status Update',
    category: 'transport_update',
    content: 'Flight Update: {{guestName}}, your flight {{flightNumber}} status has changed to {{flightStatus}}. {{additionalInfo}} Our representative {{repName}} will assist you at the airport.',
    variables: ['guestName', 'flightNumber', 'flightStatus', 'additionalInfo', 'repName']
  },
  {
    name: 'Welcome Message',
    category: 'welcome',
    content: 'Welcome {{guestName}}! Thank you for being part of {{coupleNames}}\'s special celebration. For any assistance during your stay, contact us at {{supportPhone}}. We\'re excited to celebrate with you!',
    variables: ['guestName', 'coupleNames', 'supportPhone']
  },
  {
    name: 'Accommodation Confirmation',
    category: 'general',
    content: 'Hi {{guestName}}! Your accommodation at {{hotelName}} is confirmed for {{checkInDate}} to {{checkOutDate}}. Booking reference: {{bookingRef}}. Hotel contact: {{hotelPhone}}.',
    variables: ['guestName', 'hotelName', 'checkInDate', 'checkOutDate', 'bookingRef', 'hotelPhone']
  },
  {
    name: 'Event Schedule Update',
    category: 'general',
    content: 'Event Update: {{guestName}}, the {{eventName}} schedule has been updated. New time: {{newTime}} at {{venue}}. Please check your email or visit {{detailsUrl}} for full details.',
    variables: ['guestName', 'eventName', 'newTime', 'venue', 'detailsUrl']
  },
  {
    name: 'Emergency Contact',
    category: 'general',
    content: 'Important: {{guestName}}, for any emergency during {{eventName}}, please contact our 24/7 support at {{emergencyPhone}}. Location: {{eventLocation}}. Stay safe!',
    variables: ['guestName', 'eventName', 'emergencyPhone', 'eventLocation']
  },
  {
    name: 'Thank You Message',
    category: 'general',
    content: 'Thank you {{guestName}} for celebrating with {{coupleNames}}! Your presence made our special day even more meaningful. We hope you had a wonderful time. Much love! ❤️',
    variables: ['guestName', 'coupleNames']
  }
];

/**
 * Create default SMS templates for an event
 */
export async function createDefaultSmsTemplates(eventId: number, userId?: number): Promise<void> {
  try {
    console.log(`📱 Creating default SMS templates for event ${eventId}...`);
    
    const db = getDatabaseConnection();
    const smsService = getSmsService();
    
    let createdCount = 0;
    
    for (const templateData of defaultTemplates) {
      try {
        await smsService.createTemplate(eventId, {
          ...templateData,
          createdBy: userId || null
        });
        
        createdCount++;
        console.log(`✅ Created SMS template: ${templateData.name}`);
      } catch (error) {
        // Template might already exist, continue with others
        console.warn(`⚠️ Could not create template ${templateData.name}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    console.log(`📱 Successfully created ${createdCount}/${defaultTemplates.length} SMS templates for event ${eventId}`);
    
  } catch (error) {
    console.error('❌ Failed to create default SMS templates:', error);
    throw error;
  }
}

/**
 * Get available template variables for rendering
 */
export function getAvailableTemplateVariables(): Record<string, string[]> {
  return {
    guest: ['guestName', 'guestEmail', 'guestPhone'],
    event: ['eventName', 'coupleNames', 'brideName', 'groomName', 'eventLocation', 'eventDate'],
    rsvp: ['rsvpUrl', 'rsvpDeadline', 'rsvpStatus'],
    transport: ['pickupTime', 'pickupLocation', 'dropoffLocation', 'driverName', 'driverPhone', 'vehicleType'],
    accommodation: ['hotelName', 'hotelPhone', 'checkInDate', 'checkOutDate', 'bookingRef'],
    flight: ['flightNumber', 'flightStatus', 'departureTime', 'arrivalTime', 'terminal', 'gate'],
    general: ['supportPhone', 'emergencyPhone', 'detailsUrl', 'additionalInfo']
  };
}

/**
 * Validate template content for common issues
 */
export function validateTemplateContent(content: string, variables: string[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check length (SMS limit)
  if (content.length > 1600) {
    errors.push('Template content exceeds SMS length limit (1600 characters)');
  }
  
  // Check for undefined variables in content
  const usedVariables = content.match(/{{(\w+)}}/g)?.map(match => match.replace(/[{}]/g, '')) || [];
  const undefinedVars = usedVariables.filter(variable => !variables.includes(variable));
  
  if (undefinedVars.length > 0) {
    errors.push(`Undefined variables in template: ${undefinedVars.join(', ')}`);
  }
  
  // Check for essential variables based on category
  const essentialVars = ['guestName'];
  const missingEssential = essentialVars.filter(variable => !content.includes(`{{${variable}}}`));
  
  if (missingEssential.length > 0) {
    errors.push(`Missing essential variables: ${missingEssential.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Export default templates for use in other modules
export { defaultTemplates };