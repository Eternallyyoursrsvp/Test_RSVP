import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { WeddingEvent } from "@shared/schema";
import { Check, Mail, Plus, MessageSquare } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RsvpConfigStepProps {
  eventId: string;
  currentEvent: WeddingEvent | undefined;
  onComplete: (data: any) => void;
  isCompleted: boolean;
}

export default function RsvpConfigStep({
  eventId,
  currentEvent,
  onComplete,
  isCompleted
}: RsvpConfigStepProps) {
  const [isEditing, setIsEditing] = useState(!isCompleted);

  // Load existing RSVP configuration from database
  const { data: existingRsvpConfig, isLoading: rsvpLoading } = useQuery({
    queryKey: [`/api/events/${eventId}`],
    enabled: !!eventId,
  });
  
  // RSVP settings with correct accommodation modes and transport option
  const [rsvpSettings, setRsvpSettings] = useState({
    enablePlusOne: true,
    enableMealSelection: true,
    enableCustomMessages: true,
    rsvpDeadlineDays: 30,
    autoReminderDays: [14, 7, 3],
    requiredFields: ["email", "phone", "dietaryRestrictions"],
    rsvpStatuses: ["Attending", "Not Attending", "Maybe"],
    accommodationMode: "all", // all, out-of-town, few, none
    transportMode: "draft", // Only one mode - draft
  });

  // Populate form with existing data when available
  useEffect(() => {
    if (existingRsvpConfig && !rsvpLoading) {
      console.log('Loading existing RSVP config:', existingRsvpConfig);
      setRsvpSettings({
        enablePlusOne: existingRsvpConfig.allowPlusOne ?? true,
        enableMealSelection: existingRsvpConfig.enableMealSelection ?? true,
        enableCustomMessages: existingRsvpConfig.enableCustomMessages ?? true,
        rsvpDeadlineDays: existingRsvpConfig.rsvpDeadlineDays ?? 30,
        autoReminderDays: existingRsvpConfig.autoReminderDays ?? [14, 7, 3],
        requiredFields: existingRsvpConfig.requiredFields ?? ["email", "phone", "dietaryRestrictions"],
        rsvpStatuses: existingRsvpConfig.rsvpStatuses ?? ["Attending", "Not Attending", "Maybe"],
        accommodationMode: existingRsvpConfig.accommodationMode ?? "all",
        transportMode: existingRsvpConfig.transportMode ?? "draft",
      });
    }
  }, [existingRsvpConfig, rsvpLoading]);

  // Handle changes to RSVP settings
  const handleSettingChange = (setting: string, value: any) => {
    setRsvpSettings({
      ...rsvpSettings,
      [setting]: value
    });
  };

  // Save RSVP settings
  const handleComplete = () => {
    // Save RSVP settings without logging
    onComplete(rsvpSettings);
    setIsEditing(false);
  };

  // If step is completed and not editing, show summary view
  if (isCompleted && !isEditing) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Plus One:</h3>
              <p className="col-span-3">{rsvpSettings.enablePlusOne ? "Enabled" : "Disabled"}</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Meal Selection:</h3>
              <p className="col-span-3">{rsvpSettings.enableMealSelection ? "Enabled" : "Disabled"}</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Accommodation Mode:</h3>
              <p className="col-span-3">
                {rsvpSettings.accommodationMode === "all" && "All Guests"}
                {rsvpSettings.accommodationMode === "out-of-town" && "Out-of-town Guests Only"}
                {rsvpSettings.accommodationMode === "few" && "Only a Few Guests Hosted"}
                {rsvpSettings.accommodationMode === "none" && "None"}
              </p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Transport Mode:</h3>
              <p className="col-span-3">Create Transport Draft</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Custom Messages:</h3>
              <p className="col-span-3">{rsvpSettings.enableCustomMessages ? "Enabled" : "Disabled"}</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">RSVP Deadline:</h3>
              <p className="col-span-3">{rsvpSettings.rsvpDeadlineDays} days before event</p>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <h3 className="font-medium text-sm">Auto Reminders:</h3>
              <div className="col-span-3">
                {rsvpSettings.autoReminderDays.map((days, i) => (
                  <span key={i} className="inline-block bg-muted rounded-full px-3 py-1 text-xs mr-2 mb-2">
                    {days} days before
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <h3 className="font-medium text-sm">Required Fields:</h3>
              <div className="col-span-3">
                {rsvpSettings.requiredFields.map((field, i) => (
                  <span key={i} className="inline-block bg-muted rounded-full px-3 py-1 text-xs mr-2 mb-2 capitalize">
                    {field.replace(/([A-Z])/g, ' $1')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <Button type="button" onClick={() => setIsEditing(true)}>
          Edit RSVP Settings
        </Button>
      </div>
    );
  }

  // Editing interface
  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic RSVP Settings</CardTitle>
              <CardDescription>Configure the core RSVP options for your guests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="plus-one">Enable Plus One</Label>
                  <p className="text-xs text-muted-foreground">Allow guests to bring a companion</p>
                </div>
                <Switch 
                  id="plus-one" 
                  checked={rsvpSettings.enablePlusOne}
                  onCheckedChange={(checked) => handleSettingChange('enablePlusOne', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="meals">Enable Meal Selection</Label>
                  <p className="text-xs text-muted-foreground">Allow guests to select meal preferences</p>
                </div>
                <Switch 
                  id="meals" 
                  checked={rsvpSettings.enableMealSelection}
                  onCheckedChange={(checked) => handleSettingChange('enableMealSelection', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="messages">Enable Custom Messages</Label>
                  <p className="text-xs text-muted-foreground">Allow guests to send personal messages</p>
                </div>
                <Switch 
                  id="messages" 
                  checked={rsvpSettings.enableCustomMessages}
                  onCheckedChange={(checked) => handleSettingChange('enableCustomMessages', checked)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deadline">RSVP Deadline (days before event)</Label>
                <Input 
                  id="deadline" 
                  type="number" 
                  value={rsvpSettings.rsvpDeadlineDays}
                  onChange={(e) => handleSettingChange('rsvpDeadlineDays', parseInt(e.target.value))}
                  min={1}
                  max={180}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="accommodation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accommodation Settings</CardTitle>
              <CardDescription>Define how accommodation will be handled for your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="accommodation-mode">Accommodation Mode</Label>
                <Select 
                  value={rsvpSettings.accommodationMode}
                  onValueChange={(value) => handleSettingChange('accommodationMode', value)}
                >
                  <SelectTrigger id="accommodation-mode">
                    <SelectValue placeholder="Select accommodation mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Guests</SelectItem>
                    <SelectItem value="out-of-town">Out-of-town Guests Only</SelectItem>
                    <SelectItem value="few">Only a Few Guests Hosted</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  {rsvpSettings.accommodationMode === "all" && 
                    "Accommodation will be provided for all attending guests"}
                  {rsvpSettings.accommodationMode === "out-of-town" && 
                    "Accommodation will be provided only for guests traveling from other cities"}
                  {rsvpSettings.accommodationMode === "few" && 
                    "Accommodation will be provided for just a select few guests"}
                  {rsvpSettings.accommodationMode === "none" && 
                    "No accommodation will be provided or managed by the event organizers"}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transport" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transport Settings</CardTitle>
              <CardDescription>Define if transportation will be provided for your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="transport-enabled">Enable Transport Management</Label>
                  <p className="text-xs text-muted-foreground">Provide transport options for guests (detailed configuration in Transport step)</p>
                </div>
                <Switch 
                  id="transport-enabled" 
                  checked={rsvpSettings.transportMode === "draft"}
                  onCheckedChange={(checked) => handleSettingChange('transportMode', checked ? "draft" : "none")}
                />
              </div>
              
              {rsvpSettings.transportMode === "draft" && (
                <div className="bg-muted/50 p-3 rounded-md mt-4">
                  <p className="text-xs text-muted-foreground">
                    You'll be able to configure detailed transport settings in the dedicated Transport step.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>



      <div className="flex justify-end mt-8">
        <Button onClick={handleComplete} className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          Save RSVP Settings
        </Button>
      </div>
    </div>
  );
}