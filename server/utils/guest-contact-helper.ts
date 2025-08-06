/**
 * Guest Contact Helper Utilities
 * Handles logic for determining the effective contact based on RSVP contact preferences
 */

export interface EffectiveContact {
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  name: string;
  contactType: 'guest' | 'plus_one';
  isValid: boolean;
}

export interface GuestContactPreference {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  plusOneRsvpContact: boolean;
  plusOneConfirmed: boolean;
  plusOneName: string | null;
  plusOneEmail: string | null;
  plusOnePhone: string | null;
}

/**
 * Get the effective contact information for a guest based on their RSVP contact preference
 */
export function getEffectiveGuestContact(guest: GuestContactPreference): EffectiveContact {
  const usePlusOneContact = guest.plusOneRsvpContact && 
                           guest.plusOneConfirmed && 
                           guest.plusOneName;
  
  if (usePlusOneContact) {
    return {
      email: guest.plusOneEmail || null,
      phone: guest.plusOnePhone || null,
      whatsappNumber: guest.plusOnePhone || null, // Assuming same as phone for plus-one
      name: guest.plusOneName || 'Plus One',
      contactType: 'plus_one',
      isValid: !!(guest.plusOneEmail || guest.plusOnePhone)
    };
  }
  
  return {
    email: guest.email || null,
    phone: guest.phone || null,
    whatsappNumber: guest.whatsappNumber || guest.phone || null,
    name: `${guest.firstName || ''} ${guest.lastName || ''}`.trim() || 'Guest',
    contactType: 'guest',
    isValid: !!(guest.email || guest.phone)
  };
}

/**
 * Get all guests with their effective contact information for communications
 */
export function getGuestsWithEffectiveContacts(guests: GuestContactPreference[]): Array<GuestContactPreference & { effectiveContact: EffectiveContact }> {
  return guests.map(guest => ({
    ...guest,
    effectiveContact: getEffectiveGuestContact(guest)
  }));
}

/**
 * Filter guests by contact availability for specific communication channels
 */
export function filterGuestsByContactMethod(
  guests: GuestContactPreference[], 
  method: 'email' | 'phone' | 'whatsapp'
): Array<GuestContactPreference & { effectiveContact: EffectiveContact }> {
  const guestsWithContacts = getGuestsWithEffectiveContacts(guests);
  
  return guestsWithContacts.filter(guest => {
    const contact = guest.effectiveContact;
    
    switch (method) {
      case 'email':
        return contact.email && contact.email.trim() !== '';
      case 'phone':
        return contact.phone && contact.phone.trim() !== '';
      case 'whatsapp':
        return contact.whatsappNumber && contact.whatsappNumber.trim() !== '';
      default:
        return false;
    }
  });
}

/**
 * Get communication statistics based on effective contacts
 */
export function getContactStatistics(guests: GuestContactPreference[]) {
  const guestsWithContacts = getGuestsWithEffectiveContacts(guests);
  
  const stats = {
    total: guests.length,
    withEmail: 0,
    withPhone: 0,
    withWhatsApp: 0,
    usingPlusOneContact: 0,
    usingGuestContact: 0,
    noValidContact: 0
  };
  
  guestsWithContacts.forEach(guest => {
    const contact = guest.effectiveContact;
    
    if (contact.email) stats.withEmail++;
    if (contact.phone) stats.withPhone++;
    if (contact.whatsappNumber) stats.withWhatsApp++;
    
    if (contact.contactType === 'plus_one') {
      stats.usingPlusOneContact++;
    } else {
      stats.usingGuestContact++;
    }
    
    if (!contact.isValid) {
      stats.noValidContact++;
    }
  });
  
  return stats;
}