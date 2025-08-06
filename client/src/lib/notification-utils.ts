/**
 * Notification Utilities
 * 
 * This file provides standardized notification functions to ensure consistent
 * user feedback throughout the application.
 */
import { useToast, type Toast } from "@/hooks/use-toast";

// Common notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Configuration for standard notifications
interface NotificationConfig {
  title?: string;
  description?: string;
  duration?: number;
}

// Enhanced notification options with defaults
export interface NotificationOptions extends NotificationConfig {
  variant?: 'default' | 'destructive';
  action?: React.ReactNode;
}

/**
 * Hook that provides standardized notification functions
 */
export function useNotification() {
  const { toast } = useToast();

  /**
   * Display a success notification
   */
  const success = (config: NotificationConfig) => {
    toast({
      variant: "default",
      title: config.title || "Success",
      description: config.description,
      duration: config.duration || 3000,
    });
  };

  /**
   * Display an error notification
   */
  const error = (config: NotificationConfig) => {
    toast({
      variant: "destructive",
      title: config.title || "Error",
      description: config.description || "An error occurred. Please try again.",
      duration: config.duration || 5000,
    });
  };

  /**
   * Display a warning notification
   */
  const warning = (config: NotificationConfig) => {
    toast({
      variant: "default",
      title: config.title || "Warning",
      description: config.description,
      duration: config.duration || 4000,
      className: "bg-amber-50 border-amber-300 text-amber-900",
    });
  };

  /**
   * Display an info notification
   */
  const info = (config: NotificationConfig) => {
    toast({
      variant: "default",
      title: config.title || "Information",
      description: config.description,
      duration: config.duration || 3000,
      className: "bg-blue-50 border-blue-300 text-blue-900",
    });
  };

  /**
   * Display a custom notification
   */
  const notify = (options: NotificationOptions) => {
    toast({
      variant: options.variant || "default",
      title: options.title,
      description: options.description,
      duration: options.duration || 3000,
      action: options.action,
    });
  };

  /**
   * Display a notification for API operation based on status
   */
  const apiResponse = (operation: string, success: boolean, message?: string) => {
    if (success) {
      toast({
        variant: "default",
        title: `${operation} Successful`,
        description: message || `The ${operation.toLowerCase()} operation completed successfully.`,
        duration: 3000,
      });
    } else {
      toast({
        variant: "destructive",
        title: `${operation} Failed`,
        description: message || `The ${operation.toLowerCase()} operation failed. Please try again.`,
        duration: 5000,
      });
    }
  };

  /**
   * Display a notification for form submission status
   */
  const formSubmission = (success: boolean, message?: string) => {
    apiResponse("Form Submission", success, message);
  };

  /**
   * Display a notification for data saving status
   */
  const dataSaved = (success: boolean, message?: string) => {
    apiResponse("Save", success, message);
  };

  /**
   * Display a notification for deletion status
   */
  const deleteOperation = (success: boolean, message?: string) => {
    apiResponse("Delete", success, message);
  };

  /**
   * Display a notification for update status
   */
  const updateOperation = (success: boolean, message?: string) => {
    apiResponse("Update", success, message);
  };

  /**
   * Display a notification for creation status
   */
  const createOperation = (success: boolean, message?: string) => {
    apiResponse("Create", success, message);
  };

  return {
    success,
    error,
    warning,
    info,
    notify,
    apiResponse,
    formSubmission,
    dataSaved,
    deleteOperation,
    updateOperation,
    createOperation,
  };
}

/**
 * Constants for standard notification messages
 */
export const NotificationMessages = {
  GENERIC_ERROR: "An unexpected error occurred. Please try again later.",
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  VALIDATION_ERROR: "Please check the form for errors and try again.",
  REQUIRED_FIELDS: "Please fill in all required fields.",
  SAVED_SUCCESS: "Your changes have been saved successfully.",
  CREATED_SUCCESS: "Item created successfully.",
  UPDATED_SUCCESS: "Item updated successfully.",
  DELETED_SUCCESS: "Item deleted successfully.",
  INVITATION_SENT: "Invitation sent successfully.",
  RSVP_RECORDED: "RSVP recorded successfully.",
};