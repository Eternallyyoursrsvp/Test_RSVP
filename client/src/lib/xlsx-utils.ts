import * as XLSX from "sheetjs-style";

/**
 * Format hotel assignments for Excel export
 * @param accommodations List of accommodations with guest assignments
 * @returns Formatted data for Excel export
 */
export async function formatHotelAssignmentsForExport(eventId: number) {
  try {
    // Fetch hotel assignments data
    const response = await fetch(`/api/events/${eventId}/hotel-assignments`);
    if (!response.ok) {
      throw new Error('Failed to fetch hotel assignments');
    }
    const data = await response.json();
    
    // Ensure data is an array
    const assignments = Array.isArray(data) ? data : [];
    
    return assignments.map((assignment: any) => ({
      "Guest Name": `${assignment.guest?.firstName || ""} ${assignment.guest?.lastName || ""}`,
      "Email": assignment.guest?.email || "",
      "RSVP Status": assignment.guest?.rsvpStatus || "Pending",
      "Hotel": assignment.hotel?.name || "",
      "Room Type": assignment.accommodation?.name || "",
      "Room Features": assignment.accommodation?.specialFeatures || "",
      "Check-in Date": assignment.checkInDate || "",
      "Check-out Date": assignment.checkOutDate || "",
      "Special Requests": assignment.specialRequests || ""
    }));
  } catch (error) {
    console.error('Failed to format hotel assignments for export:', error);
    throw error;
  }
}

/**
 * Exports data to an Excel file
 * @param data Array of objects to export
 * @param filename Filename for the exported file
 * @param sheetName Name of the worksheet
 */
export function exportToExcel<T>(data: T[], filename: string, sheetName = "Sheet1") {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/**
 * Parses an Excel file and returns the data as an array of objects
 * @param file Excel file to parse
 * @returns Promise resolving to an array of objects
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      reject(error);
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Converts an array of guests to the expected format for import
 * @param rawData Raw data from Excel file
 * @param eventId Event ID to associate guests with
 * @returns Array of guests in the required format
 */
export function formatGuestsForImport(rawData: any[], eventId: number) {
  return rawData.map((row) => ({
    eventId,
    firstName: row['First Name'] || '',
    lastName: row['Last Name'] || '',
    email: row['Email'] || '',
    phone: row['Phone'] || '',
    address: row['Address'] || '',
    isFamily: row['Is Family'] === 'Yes',
    relationship: row['Relationship'] || '',
    rsvpStatus: row['RSVP Status'] || 'pending',
    plusOneAllowed: row['Plus One Allowed'] === 'Yes',
    plusOneName: row['Plus One Name'] || '',
    numberOfChildren: parseInt(row['Number of Children'] || '0'),
    childrenNames: row['Children Names'] || '',
    dietaryRestrictions: row['Dietary Restrictions'] || '',
    tableAssignment: row['Table Assignment'] || '',
    giftTracking: row['Gift Tracking'] || '',
    notes: row['Notes'] || ''
  }));
}

/**
 * Prepares guest data for export to Excel
 * @param guests Array of guest objects
 * @returns Array of guests formatted for Excel export
 */
export function formatGuestsForExport(guests: any[]) {
  return guests.map(guest => ({
    'First Name': guest.firstName,
    'Last Name': guest.lastName,
    'Email': guest.email,
    'Phone': guest.phone,
    'Address': guest.address,
    'Is Family': guest.isFamily ? 'Yes' : 'No',
    'Relationship': guest.relationship,
    'RSVP Status': guest.rsvpStatus,
    'Plus One Allowed': guest.plusOneAllowed ? 'Yes' : 'No',
    'Plus One Name': guest.plusOneName,
    'Number of Children': guest.numberOfChildren,
    'Children Names': guest.childrenNames,
    'Dietary Restrictions': guest.dietaryRestrictions,
    'Table Assignment': guest.tableAssignment,
    'Gift Tracking': guest.giftTracking,
    'Notes': guest.notes
  }));
}

/**
 * Creates an Excel template for guest import
 * @param filename Filename for the template
 */
export function createGuestImportTemplate(filename: string = "guest_import_template") {
  const templateData = [
    {
      'First Name': 'John',
      'Last Name': 'Doe',
      'Email': 'john.doe@example.com',
      'Phone': '123-456-7890',
      'Address': '123 Main St, City, State, Zip',
      'Is Family': 'Yes',
      'Relationship': 'Brother of Groom',
      'RSVP Status': 'pending',
      'Plus One Allowed': 'Yes',
      'Plus One Name': 'Jane Doe',
      'Number of Children': '2',
      'Children Names': 'Emma, Jack',
      'Dietary Restrictions': 'Gluten Free',
      'Table Assignment': 'Table 1',
      'Gift Tracking': '',
      'Notes': 'Allergic to nuts'
    }
  ];
  
  exportToExcel(templateData, filename, "Guest Template");
}
