import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Users, Plane, Hotel, Camera } from "lucide-react";
import RsvpStage1Form from "@/components/rsvp/rsvp-stage1-form";
import RsvpStage2Form from "@/components/rsvp/rsvp-stage2-form";
import BrandedRsvpLayout from "@/components/rsvp/branded-rsvp-layout";

// Sample event data for demonstration
const sampleEventData = {
  id: 11,
  title: "Raj Weds Riya",
  coupleNames: "Raj & Riya",
  brideName: "Riya",
  groomName: "Raj",
  weddingDate: "2025-12-15",
  rsvpWelcomeTitle: "You're Invited to Our Dream Wedding",
  rsvpWelcomeMessage: "Join us for a magical celebration of love, tradition, and new beginnings as we unite our hearts and families",
  rsvpInstructions: "Please respond by November 15th, 2025. We can't wait to celebrate with you!",
  enableCeremonySelectAll: true,
  mobileOptimized: true,
  venues: [
    {
      name: "Grand Palace Hotel",
      address: "123 Wedding Lane, Mumbai, Maharashtra",
      type: "reception"
    }
  ]
};

const sampleCeremonies = [
  {
    id: 1,
    name: "Mehendi Ceremony",
    date: "2025-12-13",
    startTime: "16:00",
    endTime: "20:00",
    location: "Grand Palace Hotel - Garden Pavilion",
    description: "Traditional henna ceremony with music and dancing"
  },
  {
    id: 2,
    name: "Sangam Ceremony",
    date: "2025-12-14",
    startTime: "18:00", 
    endTime: "22:00",
    location: "Grand Palace Hotel - Main Hall",
    description: "Musical celebration with family and friends"
  },
  {
    id: 3,
    name: "Wedding Ceremony",
    date: "2025-12-15",
    startTime: "10:00",
    endTime: "14:00",
    location: "Grand Palace Hotel - Main Hall",
    description: "Traditional wedding ceremony and lunch"
  },
  {
    id: 4,
    name: "Reception",
    date: "2025-12-15",
    startTime: "19:00",
    endTime: "23:00",
    location: "Grand Palace Hotel - Ballroom",
    description: "Evening reception with dinner and celebration"
  }
];

const sampleMealOptions = [
  {
    id: 1,
    ceremonyId: 1,
    name: "Vegetarian Thali",
    description: "Traditional vegetarian meal"
  },
  {
    id: 2,
    ceremonyId: 1,
    name: "Non-Vegetarian Thali", 
    description: "Traditional non-vegetarian meal"
  },
  {
    id: 3,
    ceremonyId: 3,
    name: "Jain Vegetarian",
    description: "Jain-friendly vegetarian meal"
  }
];

export default function RsvpDemo() {
  const [currentDemo, setCurrentDemo] = useState<"stage1" | "stage2">("stage1");
  const [stage1Complete, setStage1Complete] = useState(false);

  const handleStage1Success = (data: any) => {
    console.log("Stage 1 completed:", data);
    setStage1Complete(true);
    // In real scenario, would check if Stage 2 is required
  };

  const handleProceedToStage2 = (data: any) => {
    console.log("Proceeding to Stage 2:", data);
    setCurrentDemo("stage2");
    setStage1Complete(true);
  };

  const handleStage2Success = (data: any) => {
    console.log("Stage 2 completed:", data);
  };

  return (
    <BrandedRsvpLayout 
      eventId={sampleEventData.id}
      eventData={sampleEventData}
      ceremonies={sampleCeremonies}
    >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-playfair text-primary mb-2">
            RSVP System Demo
          </h1>
          <p className="text-lg text-muted-foreground mb-4">
            Guest Experience for {sampleEventData.coupleNames}
          </p>
          <div className="flex justify-center gap-4 mb-6">
            <Badge variant="outline" className="text-sm">
              <Calendar className="w-4 h-4 mr-1" />
              December 15, 2025
            </Badge>
            <Badge variant="outline" className="text-sm">
              <MapPin className="w-4 h-4 mr-1" />
              Mumbai, Maharashtra
            </Badge>
          </div>
        </div>

        {/* Demo Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Demo Controls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Button 
                variant={currentDemo === "stage1" ? "default" : "outline"}
                onClick={() => setCurrentDemo("stage1")}
                className="flex-1"
              >
                Phase 1: Basic RSVP
              </Button>
              <Button 
                variant={currentDemo === "stage2" ? "default" : "outline"}
                onClick={() => setCurrentDemo("stage2")}
                className="flex-1"
                disabled={!stage1Complete && currentDemo !== "stage2"}
              >
                Phase 2: Travel & Details
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentDemo === "stage1" 
                ? "This is what guests see when they first click their RSVP link. They confirm attendance and select ceremonies."
                : "After confirming attendance, guests provide travel details, accommodation needs, and meal preferences."
              }
            </p>
          </CardContent>
        </Card>

        {/* Event Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center font-playfair">
              You're Invited to {sampleEventData.coupleNames}' Wedding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sampleCeremonies.map((ceremony, index) => (
                <div key={ceremony.id} className="space-y-2">
                  <h4 className="font-medium text-primary">{ceremony.name}</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(ceremony.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {ceremony.startTime} - {ceremony.endTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {ceremony.location}
                    </div>
                  </div>
                  <p className="text-sm">{ceremony.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {/* RSVP Forms Demo */}
        <div className="space-y-8">
          {currentDemo === "stage1" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Phase 1: Attendance Confirmation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RsvpStage1Form
                  eventId={sampleEventData.id}
                  guestId={14} // Sample guest ID
                  ceremonies={sampleCeremonies}
                  defaultValues={{
                    firstName: "John",
                    lastName: "Smith", 
                    email: "john@example.com",
                    phone: "+1234567890"
                  }}
                  onSuccess={handleStage1Success}
                  onProceedToStage2={handleProceedToStage2}
                />
              </CardContent>
            </Card>
          )}

          {currentDemo === "stage2" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="flex gap-2">
                    <Plane className="w-5 h-5" />
                    <Hotel className="w-5 h-5" />
                  </div>
                  Phase 2: Travel & Accommodation Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RsvpStage2Form
                  eventId={sampleEventData.id}
                  guestId={14} // Sample guest ID
                  mealOptions={sampleMealOptions}
                  onSuccess={handleStage2Success}
                  onBack={() => setCurrentDemo("stage1")}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Information Box */}
        <Card className="mt-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Two-Stage RSVP System
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    <strong>Phase 1:</strong> Guests confirm basic attendance and select which ceremonies they'll attend. 
                    This allows couples to get early headcounts for planning.
                  </p>
                  <p>
                    <strong>Phase 2:</strong> For guests who confirmed attendance, detailed travel and accommodation 
                    information is collected to help with logistics planning.
                  </p>
                  <p>
                    <strong>Smart Logic:</strong> Phase 2 is only shown to guests who need accommodation or transportation 
                    based on the event settings configured in the Event Setup Wizard.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </BrandedRsvpLayout>
  );
}