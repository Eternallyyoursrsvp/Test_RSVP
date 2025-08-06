import React, { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQueryParams } from "../hooks/use-query-params";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TwoStageRsvpForm from "@/components/rsvp/two-stage-rsvp-form";
import { get, post } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { extractRsvpToken } from "@/lib/rsvp-token-handler";

enum RSVPStage {
  LOADING = "loading",
  INVALID = "invalid",
  FORM = "form",
  SUCCESS = "success",
}

export default function RsvpPage({ params }: { params?: { token?: string } }) {
  const [matched, routeParams] = useRoute<{token: string}>("/guest-rsvp/:token");
  
  // This gets the token from all possible sources (URL parameter, path, window object, etc.)
  // in a reliable, consistent way that handles all the edge cases
  const extractedToken = extractRsvpToken();
  
  // Get token with fallbacks for maximum compatibility
  const token = params?.token || routeParams?.token || extractedToken || '';
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stage, setStage] = useState<RSVPStage>(RSVPStage.LOADING);
  const [tokenData, setTokenData] = useState<any>(null);
  const [stageData, setStageData] = useState<any>(null);
  
  // Verify token on page load
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setStage(RSVPStage.INVALID);
        return;
      }
      
      try {
        // Use the token to verify, regardless of how it was passed
        const response = await get(`/api/rsvp/verify?token=${token}`);
        const data = response.data;
        
        if (!data.success) {
          throw new Error(data.message || "Invalid or expired token");
        }
        
        setTokenData(data);
        setStage(RSVPStage.FORM);
      } catch (error) {
        console.error("Token verification error:", error);
        setStage(RSVPStage.INVALID);
        toast({
          variant: "destructive",
          title: "Invalid Invitation Link",
          description: error instanceof Error ? error.message : "The invitation link is invalid or has expired.",
        });
      }
    };
    
    verifyToken();
  }, [token, toast]);
  
  // Handle successful submission from TwoStageRsvpForm
  const handleRsvpSuccess = (data: any) => {
    setStageData(data);
    setStage(RSVPStage.SUCCESS);
  };
  
  // Handle returning to home page
  const handleReturnHome = () => {
    setLocation('/');
  };
  
  if (stage === RSVPStage.LOADING) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>Verifying Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">
              Please wait while we verify your invitation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (stage === RSVPStage.INVALID) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation Link</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-6">
            <p className="text-muted-foreground mb-6">
              The invitation link appears to be invalid or has expired. Please contact the couple for assistance.
            </p>
            <Button onClick={handleReturnHome}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (stage === RSVPStage.SUCCESS) {
    // Determine if the guest is attending based on the RSVP status
    // Check both possible data structures based on the form submission flow
    const isAttending = 
      (stageData?.guest?.rsvpStatus === "confirmed") || 
      (stageData?.rsvpStatus === "confirmed");
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle>RSVP Successfully Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-6">
            <div className="mb-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto text-green-500 mb-4"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h3 className="text-xl font-medium mb-2">
                {isAttending 
                  ? "We're looking forward to celebrating with you!" 
                  : "Thank you for letting us know you can't make it."}
              </h3>
              <p className="text-muted-foreground">
                {isAttending
                  ? "Your RSVP has been confirmed. We're excited to see you at our wedding!"
                  : "We appreciate you taking the time to respond. You'll be missed!"}
              </p>
            </div>
            
            {/* Show RSVP details if attending */}
            {isAttending && stageData && (
              <div className="mb-8 text-left border-t pt-6">
                <h4 className="font-medium mb-4">Your RSVP Details:</h4>
                <dl className="space-y-3">
                  {/* Name information */}
                  <div className="grid grid-cols-3">
                    <dt className="font-medium text-muted-foreground">Name:</dt>
                    <dd className="col-span-2">
                      {stageData.guest?.firstName || stageData.firstName} {stageData.guest?.lastName || stageData.lastName}
                    </dd>
                  </div>
                  
                  {/* Plus One */}
                  {(stageData.guest?.plusOneName || stageData.plusOneName) && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-muted-foreground">Plus One:</dt>
                      <dd className="col-span-2">{stageData.guest?.plusOneName || stageData.plusOneName}</dd>
                    </div>
                  )}
                  
                  {/* Children information */}
                  {(stageData.guest?.numberOfChildren > 0 || stageData.numberOfChildren > 0) && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-muted-foreground">Children:</dt>
                      <dd className="col-span-2">
                        {stageData.guest?.numberOfChildren || stageData.numberOfChildren} {(stageData.guest?.numberOfChildren || stageData.numberOfChildren) === 1 ? 'child' : 'children'}
                        {(stageData.guest?.childrenNames || stageData.childrenNames) && ` (${stageData.guest?.childrenNames || stageData.childrenNames})`}
                      </dd>
                    </div>
                  )}
                  
                  {/* Dietary Restrictions */}
                  {(stageData.guest?.dietaryRestrictions || stageData.dietaryRestrictions) && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-muted-foreground">Dietary Needs:</dt>
                      <dd className="col-span-2">{stageData.guest?.dietaryRestrictions || stageData.dietaryRestrictions}</dd>
                    </div>
                  )}
                  
                  {/* Accommodation */}
                  {(stageData.guest?.needsAccommodation || stageData.needsAccommodation) && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-muted-foreground">Accommodation:</dt>
                      <dd className="col-span-2">
                        {getAccommodationText(stageData.guest?.accommodationPreference || stageData.accommodationPreference)}
                      </dd>
                    </div>
                  )}
                  
                  {/* Transportation */}
                  {(stageData.guest?.needsTransportation || stageData.needsTransportation) && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-muted-foreground">Transportation:</dt>
                      <dd className="col-span-2">
                        {getTransportationText(stageData.guest?.transportationType || stageData.transportationType)}
                      </dd>
                    </div>
                  )}
                  
                  {/* Travel Details */}
                  {(stageData.guest?.travelMode || stageData.travelMode) && (
                    <div className="grid grid-cols-3">
                      <dt className="font-medium text-muted-foreground">Travel Mode:</dt>
                      <dd className="col-span-2 capitalize">{stageData.guest?.travelMode || stageData.travelMode}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
            
            <Button onClick={handleReturnHome} className="gold-gradient text-white">Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Helper function to get human-readable accommodation text
  function getAccommodationText(preference: string): string {
    switch(preference) {
      case 'provided': return 'Will use provided accommodation';
      case 'self_managed': return 'Self-arranging accommodation';
      case 'special_arrangement': return 'Special arrangement requested';
      default: return 'Accommodation needed';
    }
  }
  
  // Helper function to get human-readable transportation text
  function getTransportationText(preference: string): string {
    switch(preference) {
      case 'provided': return 'Will use provided transportation';
      case 'self_managed': return 'Self-arranging transportation';
      case 'special_arrangement': return 'Special arrangement requested';
      default: return 'Transportation needed';
    }
  }
  
  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2 font-playfair">Wedding RSVP</h1>
        <p className="text-muted-foreground">
          {tokenData?.event?.coupleNames || "The Couple"} 
          {" • "}
          {tokenData?.event?.startDate 
            ? new Date(tokenData.event.startDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) 
            : ""
          }
        </p>
      </div>
      
      {stage === RSVPStage.FORM && tokenData && (
        <div className="mb-10">
          <TwoStageRsvpForm
            eventId={tokenData.event.id}
            ceremonies={tokenData.ceremonies}
            mealOptions={tokenData.ceremonies.flatMap((c: any) => c.mealOptions || [])}
            onSuccess={handleRsvpSuccess}
          />
        </div>
      )}
    </div>
  );
}