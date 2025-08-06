/**
 * Timezone-safe Date Utilities
 * Centralized date handling to prevent timezone mismatches between frontend and backend
 */

/**
 * Formats a date string/object for display in user's timezone
 * Ensures consistent date formatting across the application
 */
export function formatDateForDisplay(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided to formatDateForDisplay:', dateInput);
      return '';
    }
    
    // Format in user's local timezone for display
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Error formatting date for display:', error);
    return '';
  }
}

/**
 * Formats a date for API submission (ISO string)
 * Ensures consistent date format for backend storage
 */
export function formatDateForAPI(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided to formatDateForAPI:', dateInput);
      return null;
    }
    
    // Return ISO string for consistent API storage
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (error) {
    console.warn('Error formatting date for API:', error);
    return null;
  }
}

/**
 * Parses a date string/object safely
 * Returns null for invalid dates to prevent crashes
 */
export function safeParseDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.warn('Error parsing date:', error);
    return null;
  }
}

/**
 * Checks if a date is in the future
 */
export function isFutureDate(dateInput: string | Date | null | undefined): boolean {
  const date = safeParseDate(dateInput);
  if (!date) return false;
  
  const now = new Date();
  return date > now;
}

/**
 * Calculates days between two dates
 */
export function daysBetween(startDate: string | Date | null | undefined, endDate: string | Date | null | undefined): number {
  const start = safeParseDate(startDate);
  const end = safeParseDate(endDate);
  
  if (!start || !end) return 0;
  
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

/**
 * Formats a date with time for display
 * Includes both date and time in user's timezone
 */
export function formatDateTimeForDisplay(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided to formatDateTimeForDisplay:', dateInput);
      return '';
    }
    
    // Format in user's local timezone with time
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Error formatting datetime for display:', error);
    return '';
  }
}

/**
 * Formats a date for HTML input elements (YYYY-MM-DD)
 * Required format for HTML date inputs
 */
export function formatForDateInput(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date provided to formatForDateInput:', dateInput);
      return '';
    }
    
    // Return YYYY-MM-DD format for HTML inputs
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error formatting date for input:', error);
    return '';
  }
}