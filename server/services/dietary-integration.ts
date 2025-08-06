/**
 * Dietary Integration Service
 * Handles dietary restrictions and meal planning integration
 */

import { storage } from '../storage';

class DietaryIntegrationService {
  /**
   * Get dietary requirements for meal planning
   */
  static async getDietaryRequirements(eventId: number) {
    try {
      const allGuests = await storage.getGuestsByEvent(eventId);
      
      // Filter guests with dietary restrictions
      const guestsWithDietary = allGuests.filter(guest => 
        guest.dietaryRestrictions || guest.allergies
      );
      
      const requirements = guestsWithDietary.map(guest => ({
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        dietaryRestrictions: guest.dietaryRestrictions,
        allergies: guest.allergies,
        notes: guest.notes,
        rsvpStatus: guest.rsvpStatus,
        // Include plus one dietary info if available
        plusOneDietary: guest.plusOneConfirmed ? {
          name: guest.plusOneName,
          dietary: guest.plusOneDietary || null
        } : null
      }));
      
      // Generate summary statistics
      const summary = {
        totalWithRestrictions: requirements.length,
        vegetarian: requirements.filter(r => r.dietaryRestrictions?.toLowerCase().includes('vegetarian')).length,
        vegan: requirements.filter(r => r.dietaryRestrictions?.toLowerCase().includes('vegan')).length,
        glutenFree: requirements.filter(r => r.dietaryRestrictions?.toLowerCase().includes('gluten')).length,
        nutAllergies: requirements.filter(r => r.allergies?.toLowerCase().includes('nut')).length,
        otherAllergies: requirements.filter(r => r.allergies && !r.allergies.toLowerCase().includes('nut')).length
      };
      
      return {
        success: true,
        requirements,
        summary,
        total: requirements.length
      };
    } catch (error) {
      console.error('Error getting dietary requirements:', error);
      return {
        success: false,
        error: 'Failed to get dietary requirements',
        requirements: [],
        summary: {},
        total: 0
      };
    }
  }

  /**
   * Get meal planning data for kitchen coordination
   */
  static async getMealPlanningData(eventId: number) {
    try {
      const allGuests = await storage.getGuestsByEvent(eventId);
      const confirmedGuests = allGuests.filter(g => g.rsvpStatus === 'confirmed');
      
      // Calculate meal counts including plus ones and children
      let totalMeals = 0;
      let totalVegetarian = 0;
      let totalVegan = 0;
      let totalSpecialDietary = 0;
      
      const mealBreakdown = confirmedGuests.map(guest => {
        let guestMeals = 1; // Guest themselves
        
        // Add plus one
        if (guest.plusOneConfirmed) {
          guestMeals += 1;
        }
        
        // Add children
        if (guest.numberOfChildren) {
          guestMeals += guest.numberOfChildren;
        }
        
        totalMeals += guestMeals;
        
        // Count dietary preferences
        const dietary = guest.dietaryRestrictions?.toLowerCase() || '';
        if (dietary.includes('vegetarian')) {
          totalVegetarian += guestMeals;
        }
        if (dietary.includes('vegan')) {
          totalVegan += guestMeals;
        }
        if (guest.dietaryRestrictions || guest.allergies) {
          totalSpecialDietary += guestMeals;
        }
        
        return {
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          mealCount: guestMeals,
          dietaryRestrictions: guest.dietaryRestrictions,
          allergies: guest.allergies,
          includesPlusOne: guest.plusOneConfirmed,
          includesChildren: guest.numberOfChildren > 0,
          childrenCount: guest.numberOfChildren || 0
        };
      });
      
      return {
        success: true,
        mealPlanningData: {
          totalMeals,
          totalVegetarian,
          totalVegan,
          totalSpecialDietary,
          confirmedGuests: confirmedGuests.length,
          mealBreakdown
        }
      };
    } catch (error) {
      console.error('Error getting meal planning data:', error);
      return {
        success: false,
        error: 'Failed to get meal planning data'
      };
    }
  }

  /**
   * Update guest dietary restrictions from external meal planning
   */
  static async updateGuestDietary(guestId: number, dietaryData: any) {
    try {
      const updateData: any = {};
      
      if (dietaryData.restrictions) {
        updateData.dietaryRestrictions = dietaryData.restrictions;
      }
      
      if (dietaryData.allergies) {
        updateData.allergies = dietaryData.allergies;
      }
      
      if (dietaryData.notes) {
        updateData.notes = dietaryData.notes;
      }
      
      await storage.updateGuest(guestId, updateData);
      
      return {
        success: true,
        message: 'Guest dietary information updated successfully'
      };
    } catch (error) {
      console.error('Error updating guest dietary info:', error);
      return {
        success: false,
        error: 'Failed to update guest dietary information'
      };
    }
  }
}

export default DietaryIntegrationService;