import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { post } from "@/lib/api-utils"; // Using the new consolidated API utilities

interface TwoStageRsvpFormProps {
  eventId: number;
  ceremonies: any[];
  mealOptions: any[];
  onSuccess?: (data: any) => void;
}

// Basic attendance form (Stage 1)
const stage1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  rsvpStatus: z.enum(["confirmed", "declined"]),
  plusOneName: z.string().optional(),
  message: z.string().optional(),
  ceremonies: z.record(z.string(), z.boolean()).optional(),
});

// Detailed travel and accommodation form (Stage 2)
const stage2Schema = z.object({
  numberOfChildren: z.preprocess(
    (val) => (val === "" ? 0 : Number(val)),
    z.number().min(0).max(10)
  ),
  childrenNames: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  mealSelections: z.record(z.string(), z.string()).optional(),
  
  // Travel details
  needsAccommodation: z.boolean().optional(),
  accommodationPreference: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  accommodationNotes: z.string().optional(),
  
  // Transportation details
  needsTransportation: z.boolean().optional(),
  transportationType: z.enum(['provided', 'self_managed', 'special_arrangement']).optional(),
  transportationNotes: z.string().optional(),
  
  // Travel mode
  travelMode: z.enum(['air', 'train', 'bus', 'car', 'other']).optional(),
  
  // Arrival/departure
  arrivalDate: z.string().optional(),
  arrivalTime: z.string().optional(),
  departureDate: z.string().optional(),
  departureTime: z.string().optional(),
  
  // Additional details
  specialRequests: z.string().optional(),
});

type Stage1Values = z.infer<typeof stage1Schema>;
type Stage2Values = z.infer<typeof stage2Schema>;

export default function TwoStageRsvpForm({ eventId, ceremonies, mealOptions, onSuccess }: TwoStageRsvpFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStage, setCurrentStage] = useState<"stage1" | "stage2">("stage1");
  const [guestData, setGuestData] = useState<any>(null);
  const { toast } = useToast();
  
  // Create separate form for each stage
  const stage1Form = useForm<Stage1Values>({
    resolver: zodResolver(stage1Schema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      rsvpStatus: "confirmed",
      plusOneName: "",
      message: "",
      ceremonies: {},
    },
  });
  
  const stage2Form = useForm<Stage2Values>({
    resolver: zodResolver(stage2Schema),
    defaultValues: {
      numberOfChildren: 0,
      childrenNames: "",
      dietaryRestrictions: "",
      mealSelections: {},
      needsAccommodation: false,
      needsTransportation: false,
      travelMode: "car",
      specialRequests: "",
    },
  });
  
  // Get values for conditional rendering
  const rsvpStatus = stage1Form.watch("rsvpStatus");
  const numberOfChildren = stage2Form.watch("numberOfChildren");
  const needsAccommodation = stage2Form.watch("needsAccommodation");
  const needsTransportation = stage2Form.watch("needsTransportation");
  
  // Handle Stage 1 submission (basic attendance)
  const handleStage1Submit = async (values: Stage1Values) => {
    setIsSubmitting(true);
    
    try {
      // Submit basic RSVP information
      const rsvpResponse = await post("/api/rsvp/stage1", {
        eventId,
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        rsvpStatus: values.rsvpStatus,
        plusOneName: values.plusOneName,
        message: values.message,
      });
      
      setGuestData(rsvpResponse.data.guest);
      
      // If declined, we're done
      if (values.rsvpStatus === "declined") {
        toast({
          title: "RSVP Submitted",
          description: "We're sorry you can't make it. Thank you for letting us know.",
        });
        
        if (onSuccess) onSuccess(rsvpResponse.data);
        return;
      }
      
      // Otherwise, handle ceremony attendance
      const guestId = rsvpResponse.data.guest.id;
      
      // Submit ceremony attendance
      if (values.ceremonies) {
        const attendancePromises = Object.entries(values.ceremonies)
          .filter(([_, isAttending]) => isAttending)
          .map(([ceremonyId]) => 
            post(`/api/guests/${guestId}/attendance`, {
              ceremonyId: parseInt(ceremonyId),
              attending: true,
            })
          );
        
        await Promise.all(attendancePromises);
      }
      
      // Show success message for Stage 1
      toast({
        title: "Basic RSVP Submitted",
        description: "Thank you for confirming your attendance. Please complete the additional details.",
      });
      
      // Move to Stage 2 for detailed travel and accommodation information
      setCurrentStage("stage2");
      
    } catch (error) {
      // RSVP Stage 1 submission error - handled silently
      toast({
        variant: "destructive",
        title: "RSVP Submission Failed",
        description: error instanceof Error ? error.message : "An error occurred while submitting your basic RSVP information.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle Stage 2 submission (travel and accommodation details)
  const handleStage2Submit = async (values: Stage2Values) => {
    if (!guestData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing guest information. Please try again.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit detailed information
      const detailsResponse = await post("/api/rsvp/stage2", {
        guestId: guestData.id,
        eventId: eventId,
        
        // Children information
        numberOfChildren: values.numberOfChildren,
        childrenNames: values.childrenNames,
        dietaryRestrictions: values.dietaryRestrictions,
        
        // Accommodation and transportation details
        needsAccommodation: values.needsAccommodation,
        accommodationPreference: values.accommodationPreference,
        accommodationNotes: values.accommodationNotes,
        needsTransportation: values.needsTransportation,
        transportationType: values.transportationType,
        transportationNotes: values.transportationNotes,
        
        // Travel details
        travelMode: values.travelMode,
        arrivalDate: values.arrivalDate,
        arrivalTime: values.arrivalTime,
        departureDate: values.departureDate,
        departureTime: values.departureTime,
        specialRequests: values.specialRequests,
      });
      
      // Submit meal selections if any
      if (values.mealSelections && Object.keys(values.mealSelections).length > 0) {
        const mealPromises = Object.entries(values.mealSelections)
          .filter(([_, mealId]) => mealId)
          .map(([ceremonyId, mealOptionId]) => 
            post(`/api/guests/${guestData.id}/meal-selections`, {
              ceremonyId: parseInt(ceremonyId),
              mealOptionId: parseInt(mealOptionId as string),
            })
          );
        
        await Promise.all(mealPromises);
      }
      
      // Show success message
      toast({
        title: "RSVP Complete",
        description: "Thank you for providing all your details. We look forward to celebrating with you!",
      });
      
      // Call the success callback with the combined data
      if (onSuccess) {
        const combinedData = {
          guest: guestData,
          details: detailsResponse.data,
        };
        onSuccess(combinedData);
      }
    } catch (error) {
      // RSVP Stage 2 submission error - handled silently
      toast({
        variant: "destructive",
        title: "Details Submission Failed",
        description: error instanceof Error ? error.message : "An error occurred while submitting your travel and accommodation details.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render Stage 1 Form
  if (currentStage === "stage1") {
    return (
      <Form {...stage1Form}>
        <form onSubmit={stage1Form.handleSubmit(handleStage1Submit)} className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4 font-playfair">Your Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={stage1Form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Please enter the email address your invitation was sent to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={stage1Form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={stage1Form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4 font-playfair">RSVP Response</h3>
              
              <FormField
                control={stage1Form.control}
                name="rsvpStatus"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Will you be attending?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="confirmed" />
                          </FormControl>
                          <FormLabel className="font-normal">Yes, I will attend</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="declined" />
                          </FormControl>
                          <FormLabel className="font-normal">No, I cannot attend</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {rsvpStatus === "confirmed" && (
                <>
                  <div className="mt-6">
                    <FormField
                      control={stage1Form.control}
                      name="plusOneName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plus One Name (if applicable)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Jane Doe" {...field} />
                          </FormControl>
                          <FormDescription>
                            Leave blank if you're coming alone
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Ceremonies Selection */}
          {rsvpStatus === "confirmed" && ceremonies && ceremonies.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4 font-playfair">Ceremony Attendance</h3>
                <p className="text-muted-foreground mb-4">Please select which ceremonies you plan to attend:</p>
                
                <div className="space-y-4">
                  {ceremonies.map((ceremony: any) => (
                    <FormField
                      key={ceremony.id}
                      control={stage1Form.control}
                      name={`ceremonies.${ceremony.id}`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              {ceremony.name} - {new Date(ceremony.date).toLocaleDateString()}
                            </FormLabel>
                            <FormDescription>
                              {ceremony.location} - {ceremony.description}
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Message */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4 font-playfair">Message for the Couple</h3>
              
              <FormField
                control={stage1Form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write a message for the couple..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : rsvpStatus === "confirmed" ? "Continue to Travel & Accommodation" : "Submit RSVP"}
          </Button>
        </form>
      </Form>
    );
  } else {
    // Stage 2 Form
    return (
      <Form {...stage2Form}>
        <form onSubmit={stage2Form.handleSubmit(handleStage2Submit)} className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4 font-playfair">Children Information</h3>
              
              <FormField
                control={stage2Form.control}
                name="numberOfChildren"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Children</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {numberOfChildren > 0 && (
                <div className="mt-4">
                  <FormField
                    control={stage2Form.control}
                    name="childrenNames"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Children's Names</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. John, Jane" {...field} />
                        </FormControl>
                        <FormDescription>
                          Please provide names of all children attending
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
              
              <div className="mt-4">
                <FormField
                  control={stage2Form.control}
                  name="dietaryRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dietary Restrictions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please specify any dietary restrictions or food allergies..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Meal Selections */}
          {mealOptions && mealOptions.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4 font-playfair">Meal Preferences</h3>
                
                <div className="space-y-4">
                  {ceremonies.map((ceremony: any) => (
                    <FormField
                      key={ceremony.id}
                      control={stage2Form.control}
                      name={`mealSelections.${ceremony.id}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{ceremony.name} Meal Preference</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a meal option" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mealOptions.map((option: any) => (
                                <SelectItem key={option.id} value={String(option.id)}>
                                  {option.name} - {option.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Accommodation */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4 font-playfair">Accommodation</h3>
              
              <FormField
                control={stage2Form.control}
                name="needsAccommodation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>I need accommodation arrangements</FormLabel>
                      <FormDescription>
                        Check this if you need help with accommodation
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {needsAccommodation && (
                <>
                  <div className="mt-4">
                    <FormField
                      control={stage2Form.control}
                      name="accommodationPreference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accommodation Preference</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your preference" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="provided">Event-provided accommodation</SelectItem>
                              <SelectItem value="self_managed">I'll arrange my own</SelectItem>
                              <SelectItem value="special_arrangement">Need special arrangements</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <FormField
                      control={stage2Form.control}
                      name="accommodationNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accommodation Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any specific requirements for accommodation..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Transportation */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4 font-playfair">Transportation</h3>
              
              <FormField
                control={stage2Form.control}
                name="needsTransportation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>I need transportation assistance</FormLabel>
                      <FormDescription>
                        Check this if you need help with transportation
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {needsTransportation && (
                <>
                  <div className="mt-4">
                    <FormField
                      control={stage2Form.control}
                      name="transportationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transportation Preference</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your preference" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="provided">Event-provided transportation</SelectItem>
                              <SelectItem value="self_managed">I'll arrange my own</SelectItem>
                              <SelectItem value="special_arrangement">Need special arrangements</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="mt-4">
                    <FormField
                      control={stage2Form.control}
                      name="transportationNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transportation Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Any specific requirements for transportation..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              
              <div className="mt-4">
                <FormField
                  control={stage2Form.control}
                  name="travelMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Mode</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your travel mode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="air">Air</SelectItem>
                          <SelectItem value="train">Train</SelectItem>
                          <SelectItem value="bus">Bus</SelectItem>
                          <SelectItem value="car">Car</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={stage2Form.control}
                  name="arrivalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={stage2Form.control}
                  name="arrivalTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Arrival Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={stage2Form.control}
                  name="departureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={stage2Form.control}
                  name="departureTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departure Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Special Requests */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-medium mb-4 font-playfair">Additional Information</h3>
              
              <FormField
                control={stage2Form.control}
                name="specialRequests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Requests or Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional information or special requests..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex space-x-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStage("stage1")}
              disabled={isSubmitting}
            >
              Back to Basic Information
            </Button>
            
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Complete RSVP"}
            </Button>
          </div>
        </form>
      </Form>
    );
  }
}