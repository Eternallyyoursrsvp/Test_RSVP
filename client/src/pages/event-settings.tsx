import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { useQuery } from "@tanstack/react-query";
import OAuthConfiguration from "@/components/settings/oauth-configuration";
import RsvpSettings from "@/components/settings/rsvp-settings";
import TravelAccommodationSettings from "@/components/settings/travel-accommodation-settings";
import { 
  Loader2,
  AlertCircle,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EventSettings() {
  const [activeTab, setActiveTab] = useState("oauth");
  const { currentEvent, isLoading: isLoadingEvent } = useCurrentEvent();
  const [_, setLocation] = useLocation();
  
  // Fetch event settings from the unified API endpoint
  const { 
    data: eventSettings, 
    isLoading: isLoadingSettings,
    error: settingsError 
  } = useQuery({
    queryKey: [`/api/event-settings/${currentEvent?.id}/settings`],
    enabled: !!currentEvent?.id,
  });

  // Handle loading state
  if (isLoadingEvent || isLoadingSettings) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading event settings...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Handle error state
  if (settingsError) {
    return (
      <DashboardLayout>
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load event settings. Please try again later.
          </AlertDescription>
        </Alert>
        <div className="flex justify-center mt-6">
          <button 
            onClick={() => setLocation("/dashboard")}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Return to Dashboard
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-playfair font-bold text-neutral">Event Settings</h2>
          <p className="text-sm text-gray-500">
            Manage settings for {currentEvent?.title || "your event"}
          </p>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 p-6 rounded-lg shadow-sm">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="p-3 bg-amber-100 rounded-full">
              <Wand2 className="h-8 w-8 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">Event Setup Wizard Now Available!</h3>
              <p className="text-muted-foreground mb-4">
                We've moved all event settings to our new comprehensive Setup Wizard for a more guided experience.
                Use the wizard to configure all aspects of your event including email settings, RSVP options,
                travel arrangements, and more.
              </p>
            </div>
            <Button 
              onClick={() => setLocation(`/event-setup-wizard/${currentEvent?.id}`)}
              className="flex-shrink-0 flex items-center gap-2"
              size="lg"
            >
              <Wand2 className="h-4 w-4" />
              Go to Setup Wizard
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-2">Email & Communication</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure email settings, OAuth integration, and communication preferences in the wizard.
            </p>
            <Button
              variant="outline"
              onClick={() => setLocation(`/event-setup-wizard/${currentEvent?.id}?step=6`)}
              className="w-full"
            >
              Configure Communication
            </Button>
          </div>
          
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-2">RSVP Settings</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Customize your RSVP form, deadline settings, and guest preferences in the wizard.
            </p>
            <Button
              variant="outline"
              onClick={() => setLocation(`/event-setup-wizard/${currentEvent?.id}?step=3`)}
              className="w-full"
            >
              Configure RSVP Settings
            </Button>
          </div>
          
          <div className="border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-2">Travel & Accommodation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set up travel arrangements, accommodation options, and transport groups in the wizard.
            </p>
            <Button
              variant="outline"
              onClick={() => setLocation(`/event-setup-wizard/${currentEvent?.id}?step=4`)}
              className="w-full"
            >
              Configure Hotels & Accommodations
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}