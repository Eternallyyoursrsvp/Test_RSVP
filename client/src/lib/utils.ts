import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDate as formatDateUtil, formatDateForDisplay, formatDateTimeForDisplay } from "@/lib/date-utils";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Deprecated: Use formatDateForDisplay from date-utils.ts instead
export function formatDate(date: string | Date | null | undefined): string {
  return formatDateForDisplay(date);
}

// Deprecated: Use formatDateTimeForDisplay from date-utils.ts instead
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDateTimeForDisplay(date);
}

export function getRsvpStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "text-green-700 bg-green-100 border-green-400";
    case "declined":
      return "text-red-700 bg-red-100 border-red-400";
    case "pending":
      return "text-yellow-700 bg-yellow-100 border-yellow-400";
    default:
      return "text-gray-700 bg-gray-100 border-gray-400";
  }
}

export function getInitials(name: string): string {
  if (!name) return "?";
  
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function capitalizeFirstLetter(string: string): string {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// RSVP Status Utilities - Consolidated Functions

/**
 * Calculate the overall RSVP response rate (percentage of guests who have responded)
 */
export function calculateRsvpProgress(confirmed: number, declined: number, pending: number): number {
  const total = confirmed + declined + pending;
  if (total === 0) return 0;
  
  return Math.round(((confirmed + declined) / total) * 100);
}

/**
 * Calculate Stage 1 progress (basic RSVP response)
 * @param guest Guest object with RSVP status
 * @returns Percentage of Stage 1 completion (0-100)
 */
export function calculateStage1Progress(guest: any): number {
  if (!guest) return 0;
  if (guest.rsvpStatus === "pending") return 0;
  return 100; // Confirmed or declined means stage 1 is complete
}

/**
 * Calculate Stage 2 progress (travel and accommodation details)
 * @param guest Guest object with travel/accommodation details
 * @returns Percentage of Stage 2 completion (0-100)
 */
export function calculateStage2Progress(guest: any): number {
  if (!guest) return 0;
  if (guest.rsvpStatus !== "confirmed") return 0;
  if (guest.isLocalGuest) return 100; // Local guests don't need to complete stage 2
  
  // Calculate based on completion of travel/accommodation details
  let fieldsCompleted = 0;
  let totalFields = 0;
  
  // Check accommodation details
  if (guest.needsAccommodation !== undefined) {
    fieldsCompleted += 1;
    if (guest.needsAccommodation && guest.accommodationPreference) {
      fieldsCompleted += 1;
    }
  }
  totalFields += 2;
  
  // Check transportation details
  if (guest.needsTransportation !== undefined) {
    fieldsCompleted += 1;
    if (guest.needsTransportation && guest.transportationType) {
      fieldsCompleted += 1;
    }
  }
  totalFields += 2;
  
  // Travel dates
  if (guest.arrivalDate) fieldsCompleted += 1;
  if (guest.departureDate) fieldsCompleted += 1;
  totalFields += 2;
  
  // Calculate percentage
  return Math.round((fieldsCompleted / totalFields) * 100);
}

/**
 * Calculate overall RSVP completion percentage for a guest
 * @param guest Guest object with RSVP data
 * @returns Overall completion percentage (0-100)
 */
export function calculateOverallRsvpProgress(guest: any): number {
  const stage1 = calculateStage1Progress(guest);
  const stage2 = calculateStage2Progress(guest);
  return Math.round((stage1 + stage2) / 2);
}

/**
 * Get color class based on progress percentage
 * @param progress Progress percentage (0-100)
 * @returns Tailwind CSS class for coloring
 */
export function getProgressColor(progress: number): string {
  if (progress === 0) return "bg-gray-200";
  if (progress < 50) return "bg-amber-500";
  if (progress < 100) return "bg-blue-500";
  return "bg-green-500";
}

/**
 * Get the display status label for a guest's RSVP
 * @param guest Guest object with RSVP status
 * @returns String representation of status
 */
export function getRsvpStatusLabel(guest: any): string {
  if (!guest) return "Unknown";
  
  if (guest.rsvpStatus === "pending") {
    return "Not Responded";
  } else if (guest.rsvpStatus === "declined") {
    return "Declined";
  } else if (guest.rsvpStatus === "confirmed") {
    const stage2Progress = calculateStage2Progress(guest);
    if (stage2Progress === 100) {
      return "Fully Confirmed";
    } else if (stage2Progress > 0) {
      return "Partially Complete";
    } else {
      return "Basic Confirmation";
    }
  }
  
  return "Unknown";
}

export function getDaysDifference(date: Date | string | null | undefined): number {
  if (!date) return 0;
  
  try {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  } catch (e) {
    return 0;
  }
}
