/**
 * Communication Filtering Service
 * Handles WhatsApp availability and bride/groom side filtering for targeted communication
 */

import { storage } from '../storage';

class CommunicationFilteringService {
  /**
   * Get guests eligible for WhatsApp communication
   */
  static async getWhatsAppEnabledGuests(eventId: number) {
    try {
      const allGuests = await storage.getGuestsByEvent(eventId);
      
      // Filter guests who have WhatsApp enabled
      const whatsappGuests = allGuests.filter(guest => 
        guest.whatsappAvailable && 
        (guest.whatsappSame ? guest.phone : guest.whatsappNumber)
      );
      
      return {
        success: true,
        guests: whatsappGuests.map(guest => ({
          id: guest.id,
          name: `${guest.firstName} ${guest.lastName}`,
          phone: guest.whatsappSame ? guest.phone : guest.whatsappNumber,
          whatsappNumber: guest.whatsappSame ? guest.phone : guest.whatsappNumber,
          side: guest.side,
          rsvpStatus: guest.rsvpStatus
        })),
        total: whatsappGuests.length
      };
    } catch (error) {
      console.error('Error filtering WhatsApp guests:', error);
      return {
        success: false,
        error: 'Failed to filter WhatsApp guests',
        guests: [],
        total: 0
      };
    }
  }

  /**
   * Get guests by bride/groom side for targeted communication
   */
  static async getGuestsBySide(eventId: number, side: 'bride' | 'groom' | 'mutual') {
    try {
      const allGuests = await storage.getGuestsByEvent(eventId);
      
      // Filter guests by specified side
      const filteredGuests = allGuests.filter(guest => {
        if (side === 'mutual') {
          return guest.side === 'mutual' || !guest.side;
        }
        return guest.side === side;
      });
      
      return {
        success: true,
        side,
        guests: filteredGuests.map(guest => ({
          id: guest.id,
          name: `${guest.firstName} ${guest.lastName}`,
          email: guest.email,
          phone: guest.phone,
          whatsappAvailable: guest.whatsappAvailable,
          whatsappNumber: guest.whatsappSame ? guest.phone : guest.whatsappNumber,
          rsvpStatus: guest.rsvpStatus,
          side: guest.side
        })),
        total: filteredGuests.length
      };
    } catch (error) {
      console.error('Error filtering guests by side:', error);
      return {
        success: false,
        error: 'Failed to filter guests by side',
        guests: [],
        total: 0
      };
    }
  }

  /**
   * Get comprehensive communication statistics
   */
  static async getCommunicationStats(eventId: number) {
    try {
      const allGuests = await storage.getGuestsByEvent(eventId);
      
      const stats = {
        total: allGuests.length,
        whatsappEnabled: allGuests.filter(g => g.whatsappAvailable).length,
        emailAvailable: allGuests.filter(g => g.email).length,
        brideSide: allGuests.filter(g => g.side === 'bride').length,
        groomSide: allGuests.filter(g => g.side === 'groom').length,
        mutualSide: allGuests.filter(g => g.side === 'mutual' || !g.side).length,
        confirmed: allGuests.filter(g => g.rsvpStatus === 'confirmed').length,
        pending: allGuests.filter(g => g.rsvpStatus === 'pending').length,
        declined: allGuests.filter(g => g.rsvpStatus === 'declined').length
      };
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error getting communication stats:', error);
      return {
        success: false,
        error: 'Failed to get communication statistics'
      };
    }
  }
}

export default CommunicationFilteringService;