import { Request, Response } from 'express';
import { GuestService } from '../../services/guest-service';
import { ResponseBuilder } from '../../lib/response-builder';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

const guestService = new GuestService();

interface CSVRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  relationship?: string;
  isFamily?: string;
  plusOneAllowed?: string;
  plusOneName?: string;
  plusOneEmail?: string;
  plusOnePhone?: string;
  dietaryRestrictions?: string;
  accessibilityNeeds?: string;
  specialRequests?: string;
  notes?: string;
}

function parseCSVRow(row: CSVRow, eventId: number): any {
  return {
    eventId,
    firstName: row.firstName?.trim(),
    lastName: row.lastName?.trim(),
    email: row.email?.trim() || undefined,
    phone: row.phone?.trim() || undefined,
    relationship: row.relationship?.trim() || undefined,
    isFamily: row.isFamily?.toLowerCase() === 'true' || row.isFamily?.toLowerCase() === 'yes',
    rsvpStatus: 'pending' as const,
    plusOneAllowed: row.plusOneAllowed?.toLowerCase() === 'true' || row.plusOneAllowed?.toLowerCase() === 'yes',
    plusOneName: row.plusOneName?.trim() || undefined,
    plusOneEmail: row.plusOneEmail?.trim() || undefined,
    plusOnePhone: row.plusOnePhone?.trim() || undefined,
    plusOneConfirmed: false,
    plusOneRsvpContact: false,
    dietaryRestrictions: row.dietaryRestrictions?.trim() || undefined,
    accessibilityNeeds: row.accessibilityNeeds?.trim() || undefined,
    specialRequests: row.specialRequests?.trim() || undefined,
    notes: row.notes?.trim() || undefined
  };
}

export async function importGuests(req: Request, res: Response): Promise<void> {
  try {
    // Event ID is validated by middleware and available in context
    const eventId = (req as any).context.eventId;
    
    // Check if file was uploaded
    if (!req.file) {
      return ResponseBuilder.badRequest(res, 'No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['text/csv', 'application/csv'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return ResponseBuilder.badRequest(res, 'Invalid file type. Only CSV files are allowed.');
    }

    // Create service context
    const context = {
      userId: (req.user as any).id,
      userRole: (req.user as any).role,
      eventId,
      requestId: req.headers['x-request-id'] as string,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    try {
      // Parse CSV file
      const guests: any[] = [];
      const errors: string[] = [];

      await new Promise<void>((resolve, reject) => {
        const stream = Readable.from(req.file!.buffer);
        
        stream
          .pipe(csv())
          .on('data', (row: CSVRow) => {
            try {
              // Validate required fields
              if (!row.firstName || !row.lastName) {
                errors.push(`Row with missing firstName or lastName: ${JSON.stringify(row)}`);
                return;
              }

              const guest = parseCSVRow(row, eventId);
              guests.push(guest);
            } catch (error) {
              errors.push(`Error parsing row: ${error instanceof Error ? error.message : String(error)}`);
            }
          })
          .on('end', () => {
            resolve();
          })
          .on('error', (error: any) => {
            reject(error);
          });
      });

      // Check for parsing errors
      if (errors.length > 0) {
        return ResponseBuilder.badRequest(res, 'CSV parsing errors detected', errors);
      }

      // Check if any guests were found
      if (guests.length === 0) {
        return ResponseBuilder.badRequest(res, 'No valid guests found in CSV file');
      }

      // Call service method to bulk create guests
      const result = await guestService.bulkCreateGuests(guests, context);
      
      if (result.success && result.data) {
        const response = {
          totalProcessed: guests.length,
          totalCreated: result.data.length,
          guests: result.data,
          summary: {
            successful: result.data.length,
            failed: guests.length - result.data.length
          }
        };
        
        ResponseBuilder.created(res, response, `Successfully imported ${result.data.length} guests`);
      } else {
        ResponseBuilder.internalError(res, 'Failed to import guests', result.error);
      }

    } catch (parseError) {
      ResponseBuilder.badRequest(res, 'Error parsing CSV file', parseError instanceof Error ? parseError.message : String(parseError));
    }

  } catch (error) {
    throw error;
  }
}

// Export template for download
export async function getImportTemplate(req: Request, res: Response): Promise<void> {
  try {
    const csvTemplate = `firstName,lastName,email,phone,relationship,isFamily,plusOneAllowed,plusOneName,plusOneEmail,plusOnePhone,dietaryRestrictions,accessibilityNeeds,specialRequests,notes
John,Doe,john.doe@example.com,+1234567890,Friend,false,true,Jane Doe,jane.doe@example.com,+1234567891,Vegetarian,Wheelchair access,None,VIP guest
Jane,Smith,jane.smith@example.com,+1987654321,Family,true,false,,,,"No nuts","",None,Sister of bride`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="guest-import-template.csv"');
    res.send(csvTemplate);
  } catch (error) {
    throw error;
  }
}