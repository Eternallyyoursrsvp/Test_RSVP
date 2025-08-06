import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Wand2 } from "lucide-react";

interface TravelAccommodationSettingsProps {
  settings: any;
  eventId: number | undefined;
}

export default function TravelAccommodationSettings({ settings, eventId }: TravelAccommodationSettingsProps) {
  const [_, setLocation] = useLocation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Travel & Accommodation Settings</CardTitle>
        <CardDescription>
          Configure travel and accommodation options in the new Event Setup Wizard
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <Alert className="bg-amber-50 border-amber-200">
            <Wand2 className="h-4 w-4 text-amber-600" />
            <AlertTitle>Settings Moved to Setup Wizard</AlertTitle>
            <AlertDescription>
              For a more comprehensive setup experience, all travel and accommodation settings 
              have been moved to the Event Setup Wizard. Please use the wizard to configure these settings.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={() => setLocation(`/event-setup-wizard/${eventId}`)}
            className="w-full flex items-center justify-center gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Go to Setup Wizard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}