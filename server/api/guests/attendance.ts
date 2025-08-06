import { Request, Response } from 'express';
import { ResponseBuilder } from '../../lib/response-builder';
import { z } from 'zod';
import { db } from '../../db';
import { guestCeremonies } from '../../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Validation schema for attendance update
const AttendanceSchema = z.object({
  ceremonyId: z.number().int().positive('Ceremony ID is required'),
  attending: z.boolean('Attending status is required')
});

export async function setGuestAttendance(req: Request, res: Response): Promise<void> {
  try {
    const guestId = parseInt(req.params.id);
    if (isNaN(guestId)) {
      return ResponseBuilder.badRequest(res, 'Invalid guest ID');
    }

    // Validate request body
    const validationResult = AttendanceSchema.safeParse(req.body);
    if (!validationResult.success) {
      return ResponseBuilder.badRequest(res, 'Invalid attendance data', validationResult.error.errors);
    }

    const { ceremonyId, attending } = validationResult.data;

    // Verify guest exists
    const guest = await db.query.guests.findFirst({
      where: (guests, { eq }) => eq(guests.id, guestId)
    });

    if (!guest) {
      return ResponseBuilder.notFound(res, 'Guest not found');
    }

    // Verify ceremony exists and belongs to the same event
    const ceremony = await db.query.ceremonies.findFirst({
      where: (ceremonies, { eq, and }) => and(
        eq(ceremonies.id, ceremonyId),
        eq(ceremonies.eventId, guest.eventId)
      )
    });

    if (!ceremony) {
      return ResponseBuilder.notFound(res, 'Ceremony not found or does not belong to guest\'s event');
    }

    // Check if guest-ceremony relation exists
    const existingRelation = await db.query.guestCeremonies.findFirst({
      where: (guestCeremonies, { eq, and }) => and(
        eq(guestCeremonies.guestId, guestId),
        eq(guestCeremonies.ceremonyId, ceremonyId)
      )
    });

    let result;
    if (existingRelation) {
      // Update existing relation
      result = await db.update(guestCeremonies)
        .set({ 
          attending,
          updatedAt: new Date().toISOString()
        })
        .where(and(
          eq(guestCeremonies.guestId, guestId),
          eq(guestCeremonies.ceremonyId, ceremonyId)
        ))
        .returning();
    } else {
      // Create new relation
      result = await db.insert(guestCeremonies)
        .values({
          guestId,
          ceremonyId,
          attending,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .returning();
    }

    if (!result || result.length === 0) {
      return ResponseBuilder.internalError(res, 'Failed to update attendance');
    }

    // Return success response
    const response = {
      message: `Guest attendance ${attending ? 'confirmed' : 'removed'} for ceremony`,
      attendance: {
        guestId,
        ceremonyId,
        attending,
        ceremonyName: ceremony.name,
        updatedAt: new Date().toISOString()
      }
    };

    ResponseBuilder.ok(res, response, 'Attendance updated successfully');

  } catch (error) {
    console.error('Set guest attendance error:', error);
    ResponseBuilder.internalError(res, 'Failed to update guest attendance', error);
  }
}