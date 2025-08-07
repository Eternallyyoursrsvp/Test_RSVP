import { Request, Response } from 'express';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';
import { db } from '../../db';
import { guestMealSelections } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Validation schema for meal selection
const MealSelectionSchema = z.object({
  ceremonyId: z.number().int().positive('Ceremony ID is required'),
  mealOptionId: z.number().int().positive('Meal option ID is required')
});

export async function setGuestMealSelection(req: Request, res: Response): Promise<void> {
  try {
    const guestId = parseInt(req.params.id);
    if (isNaN(guestId)) {
      return ResponseBuilder.badRequest(res, 'Invalid guest ID');
    }

    // Validate request body
    const validationResult = MealSelectionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid meal selection data', validationResult.error.errors);
    }

    const { ceremonyId, mealOptionId } = validationResult.data;

    // Verify guest exists
    const guest = await db.query.guests.findFirst({
      where: (guests: any, { eq }: any) => eq(guests.id, guestId)
    });

    if (!guest) {
      return ResponseBuilder.notFound(res, 'Guest not found');
    }

    // Verify ceremony exists and belongs to the same event
    const ceremony = await db.query.ceremonies.findFirst({
      where: (ceremonies: any, { eq, and }: any) => and(
        eq(ceremonies.id, ceremonyId),
        eq(ceremonies.eventId, guest.eventId)
      )
    });

    if (!ceremony) {
      return ResponseBuilder.notFound(res, 'Ceremony not found or does not belong to guest\'s event');
    }

    // Verify meal option exists and belongs to the same event
    const mealOption = await db.query.mealOptions.findFirst({
      where: (mealOptions: any, { eq, and }: any) => and(
        eq(mealOptions.id, mealOptionId),
        eq(mealOptions.eventId, guest.eventId)
      )
    });

    if (!mealOption) {
      return ResponseBuilder.notFound(res, 'Meal option not found or does not belong to guest\'s event');
    }

    // Check if meal selection already exists for this guest and ceremony
    const existingSelection = await db.query.guestMealSelections.findFirst({
      where: (guestMealSelections: any, { eq, and }: any) => and(
        eq(guestMealSelections.guestId, guestId),
        eq(guestMealSelections.ceremonyId, ceremonyId)
      )
    });

    let result;
    if (existingSelection) {
      // Update existing meal selection
      result = await db.update(guestMealSelections)
        .set({ 
          mealOptionId,
          updatedAt: new Date().toISOString()
        })
        .where(
          and(
            eq(guestMealSelections.guestId, guestId),
            eq(guestMealSelections.ceremonyId, ceremonyId)
          )
        )
        .returning();
    } else {
      // Create new meal selection
      result = await db.insert(guestMealSelections)
        .values({
          guestId,
          ceremonyId,
          mealOptionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();
    }

    if (!result || result.length === 0) {
      return ResponseBuilder.internalError(res, 'Failed to update meal selection');
    }

    // Return success response
    const response = {
      message: 'Guest meal selection updated successfully',
      mealSelection: {
        guestId,
        ceremonyId,
        mealOptionId,
        ceremonyName: ceremony.name,
        mealOptionName: mealOption.name,
        mealOptionDescription: mealOption.description,
        updatedAt: new Date().toISOString()
      }
    };

    ResponseBuilder.ok(res, response, 'Meal selection updated successfully');

  } catch (error) {
    console.error('Set guest meal selection error:', error);
    ResponseBuilder.internalError(res, 'Failed to update guest meal selection', error);
  }
}