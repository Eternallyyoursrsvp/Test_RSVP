import React, { useState, useEffect } from "react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { post } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { FlightDetailsForm } from './flight-details-form';

interface MealOption {
  id: number;
  name: string;
  description?: string;
  eventId: number;
  ceremonyId?: number;
}

interface RsvpStage2FormProps {
  eventId: number;
  guestId: number;
  defaultValues?: Partial<FormValues>;
  mealOptions: MealOption[];
  onSuccess?: (data: FormValues) => void;
  onBack?: () => void;
}

const formSchema = z.object({
  guestId: z.number(),
  eventId: z.number(),
  // Accommodation details
  needsAccommodation: z.boolean().optional(),
  accommodationPreference: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  accommodationNotes: z.string().optional(),
  // Transportation details
  needsTransportation: z.boolean().optional(),
  transportationType: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  transportationNotes: z.string().optional(),
  // Travel details
  travelMode: z.enum(['air', 'train', 'bus', 'car']).optional(),
  // Enhanced flight details for coordination
  flightDetails: z.object({
    // Arrival flight
    arrivalFlightNumber: z.string().optional(),
    arrivalAirline: z.string().optional(),
    departureAirport: z.string().optional(),
    arrivalAirport: z.string().optional(),
    scheduledDeparture: z.string().optional(),
    scheduledArrival: z.string().optional(),
    arrivalSeat: z.string().optional(),
    arrivalAssistanceRequired: z.boolean().default(false),
    arrivalSpecialRequirements: z.array(z.string()).default([]),
    
    // Departure flight (if different)
    hasDepartureFlight: z.boolean().default(false),
    departureFlightNumber: z.string().optional(),
    departureAirline: z.string().optional(),
    departureScheduledDeparture: z.string().optional(),
    departureScheduledArrival: z.string().optional(),
    departureSeat: z.string().optional(),
    departureAssistanceRequired: z.boolean().default(false),
    departureSpecialRequirements: z.array(z.string()).default([]),
  }).optional(),
  // Children details as structured data
  childrenDetails: z.array(z.object({
    name: z.string(),
    age: z.preprocess(
      (val) => (val === "" ? undefined : Number(val)),
      z.number().min(0).max(18).optional()
    ),
    gender: z.string().optional(),
    dietaryRestrictions: z.string().optional()
  })).optional(),
  // Meal selections with more detailed structure
  mealSelections: z.array(z.object({
    ceremonyId: z.number(),
    mealOptionId: z.number(),
    notes: z.string().optional()
  })).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function RsvpStage2Form({ 
  eventId, 
  guestId, 
  defaultValues, 
  mealOptions, 
  onSuccess,
  onBack
}: RsvpStage2FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("accommodation");
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestId,
      eventId,
      needsAccommodation: defaultValues?.needsAccommodation || false,
      accommodationPreference: defaultValues?.accommodationPreference || 'provided',
      accommodationNotes: defaultValues?.accommodationNotes || "",
      needsTransportation: defaultValues?.needsTransportation || false,
      transportationType: defaultValues?.transportationType || 'provided',
      transportationNotes: defaultValues?.transportationNotes || "",
      travelMode: defaultValues?.travelMode || 'air',
      flightDetails: defaultValues?.flightDetails || {
        arrivalFlightNumber: "",
        arrivalAirline: "",
        departureAirport: "",
        arrivalAirport: "",
        scheduledDeparture: "",
        scheduledArrival: "",
        arrivalSeat: "",
        arrivalAssistanceRequired: false,
        arrivalSpecialRequirements: [],
        hasDepartureFlight: false,
        departureFlightNumber: "",
        departureAirline: "",
        departureScheduledDeparture: "",
        departureScheduledArrival: "",
        departureSeat: "",
        departureAssistanceRequired: false,
        departureSpecialRequirements: [],
      },
      childrenDetails: defaultValues?.childrenDetails || [],
      mealSelections: defaultValues?.mealSelections || [],
    },
  });

  // Enhanced form pre-population for deployment stability (critical for pre-filling Stage 2 RSVP data)
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const formData = {
        guestId,
        eventId,
        needsAccommodation: defaultValues.needsAccommodation || false,
        accommodationPreference: defaultValues.accommodationPreference || 'provided',
        accommodationNotes: defaultValues.accommodationNotes || "",
        needsTransportation: defaultValues.needsTransportation || false,
        transportationType: defaultValues.transportationType || 'provided',
        transportationNotes: defaultValues.transportationNotes || "",
        travelMode: defaultValues.travelMode || 'air',
        flightDetails: defaultValues.flightDetails || {
          arrivalFlightNumber: "",
          arrivalAirline: "",
          departureAirport: "",
          arrivalAirport: "",
          scheduledDeparture: "",
          scheduledArrival: "",
          arrivalSeat: "",
          arrivalAssistanceRequired: false,
          arrivalSpecialRequirements: [],
          hasDepartureFlight: false,
          departureFlightNumber: "",
          departureAirline: "",
          departureScheduledDeparture: "",
          departureScheduledArrival: "",
          departureSeat: "",
          departureAssistanceRequired: false,
          departureSpecialRequirements: [],
        },
        childrenDetails: defaultValues.childrenDetails || [],
        mealSelections: defaultValues.mealSelections || [],
      };
      
      // IMMEDIATE form reset - no setTimeout needed
      form.reset(formData);
    }
  }, [defaultValues, form, guestId, eventId]);
  
  const { fields: childrenFields, append: appendChild, remove: removeChild } = useFieldArray({
    control: form.control,
    name: "childrenDetails"
  });
  
  const needsAccommodation = form.watch("needsAccommodation");
  const needsTransportation = form.watch("needsTransportation");
  const travelMode = form.watch("travelMode");
  
  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Submit RSVP Stage 2
      const rsvpResponse = await post("/api/rsvp/stage2", values);
      
      const data = rsvpResponse.data;
      
      if (!data.success) {
        throw new Error(data.message || "Failed to submit travel details");
      }
      
      toast({
        title: "Travel Details Submitted",
        description: "Thank you for providing your travel information!",
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      // Silent error handling
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "An error occurred while submitting your travel details.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleChildAdd = () => {
    appendChild({ name: "", age: undefined, gender: "", dietaryRestrictions: "" });
  };
  
  // Group meal options by ceremony
  const mealOptionsByCeremony = mealOptions.reduce<Record<number, any[]>>((acc, option) => {
    const ceremonyId = option.ceremonyId || 0;
    if (!acc[ceremonyId]) {
      acc[ceremonyId] = [];
    }
    acc[ceremonyId].push(option);
    return acc;
  }, {});
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
            <TabsTrigger value="transportation">Transportation</TabsTrigger>
            <TabsTrigger value="children">Children</TabsTrigger>
            <TabsTrigger value="meals">Meal Selection</TabsTrigger>
          </TabsList>
          
          <TabsContent value="accommodation" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4 font-playfair">Accommodation Details</h3>
                
                <FormField
                  control={form.control}
                  name="needsAccommodation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          I need accommodation for the wedding
                        </FormLabel>
                        <FormDescription>
                          Let us know if you need us to arrange your stay
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {needsAccommodation && (
                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="accommodationPreference"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Accommodation Preference</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="provided" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  I'll stay at the provided wedding venue/hotel
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="self_managed" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  I'll arrange my own accommodation
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="special_arrangement" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  I need special arrangements (explain below)
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="accommodationNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any special requirements or details about your accommodation needs..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                Back to Basic Details
              </Button>
              
              <Button type="button" onClick={() => setActiveTab("transportation")}>
                Next: Transportation
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="transportation" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4 font-playfair">Transportation Details</h3>
                
                <FormField
                  control={form.control}
                  name="needsTransportation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          I need transportation assistance
                        </FormLabel>
                        <FormDescription>
                          Let us know if you need help with transportation during your stay
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {needsTransportation && (
                  <div className="mt-4 space-y-4">
                    <FormField
                      control={form.control}
                      name="transportationType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Transportation Preference</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="provided" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  I'll use the provided wedding transportation
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="self_managed" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  I'll arrange my own transportation
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="special_arrangement" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  I need special transportation arrangements
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="travelMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How are you traveling to the wedding?</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select travel mode" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="air">By Air</SelectItem>
                              <SelectItem value="train">By Train</SelectItem>
                              <SelectItem value="bus">By Bus</SelectItem>
                              <SelectItem value="car">By Car</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {travelMode === 'air' && (
                      <FlightDetailsForm 
                        form={form}
                        baseFieldName="flightDetails"
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="transportationNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Transportation Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any special requirements or details we should know about your travel..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setActiveTab("accommodation")}>
                Back to Accommodation
              </Button>
              
              <Button type="button" onClick={() => setActiveTab("children")}>
                Next: Children Details
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="children" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4 font-playfair">Children Details</h3>
                
                {childrenFields.length === 0 ? (
                  <div className="text-center p-4 border rounded-md">
                    <p className="text-muted-foreground mb-4">No children added yet</p>
                    <Button type="button" variant="outline" onClick={handleChildAdd}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add a Child
                    </Button>
                  </div>
                ) : (
                  <>
                    {childrenFields.map((field, index) => (
                      <div key={field.id} className="border rounded-md p-4 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">Child {index + 1}</h4>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeChild(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <FormField
                            control={form.control}
                            name={`childrenDetails.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`childrenDetails.${index}.age`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Age</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min={0} 
                                    max={18} 
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber || undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <FormField
                            control={form.control}
                            name={`childrenDetails.${index}.gender`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Gender (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select gender (optional)" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`childrenDetails.${index}.dietaryRestrictions`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dietary Restrictions</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Any food allergies or dietary needs..."
                                    className="resize-none"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <Button type="button" variant="outline" onClick={handleChildAdd} className="mt-2">
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Another Child
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setActiveTab("transportation")}>
                Back to Transportation
              </Button>
              
              <Button type="button" onClick={() => setActiveTab("meals")}>
                Next: Meal Selection
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="meals" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4 font-playfair">Meal Preferences</h3>
                
                {Object.entries(mealOptionsByCeremony).length === 0 ? (
                  <p className="text-muted-foreground text-center p-4">
                    No meal selection required for this event
                  </p>
                ) : (
                  Object.entries(mealOptionsByCeremony).map(([ceremonyId, options], index) => (
                    <div key={ceremonyId} className="mb-6">
                      <h4 className="font-medium mb-2">
                        {options[0]?.ceremonyName || `Event ${Number(ceremonyId)}`}
                      </h4>
                      
                      <FormField
                        control={form.control}
                        name={`mealSelections.${index}.mealOptionId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select your meal preference</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a meal option" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {options.map((option) => (
                                  <SelectItem key={option.id} value={option.id.toString()}>
                                    {option.name}
                                    {option.isVegetarian && " (Vegetarian)"}
                                    {option.isVegan && " (Vegan)"}
                                    {option.isGlutenFree && " (Gluten Free)"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <input 
                        type="hidden" 
                        {...form.register(`mealSelections.${index}.ceremonyId` as const, {
                          valueAsNumber: true
                        })}
                        value={ceremonyId} 
                      />
                      
                      <FormField
                        control={form.control}
                        name={`mealSelections.${index}.notes`}
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormLabel>Special Instructions</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Any special requests for this meal..."
                                className="resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setActiveTab("children")}>
                Back to Children Details
              </Button>
              
              <Button 
                type="submit" 
                className="gold-gradient text-white py-3"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    Submitting...
                  </>
                ) : (
                  "Submit Travel Details"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}