import { SessionData } from 'express-session';

// Extend the Session interface to include our custom fields
declare module 'express-session' {
  interface SessionData {
    // User authentication data
    userId?: number;
    userRole?: string;
    
    // Current event data
    currentEvent?: {
      id: number;
      title: string;
      startDate: string;
      endDate: string;
      coupleNames: string;
      brideName: string;
      groomName: string;
      location: string;
      description: string | null;
      date: string | null;
      primaryColor: string | null;
      secondaryColor: string | null;
      whatsappFrom: string | null;
      whatsappAccessToken: string | null;
      createdBy: number;
      [key: string]: any;
    };
  }
}

// Export any other custom types here