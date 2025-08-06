import React, { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { post } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Heart, Users, MessageSquare, CheckCircle } from "lucide-react";
import AppleFormCard from "./apple-form-card";

interface Ceremony {
  id: number;
  name: string;
  date: string;
  time: string;
  venue: string;
  eventId: number;
  startTime?: string;
  endTime?: string;
  location?: string;
}

interface RsvpStage1FormProps {
  eventId: number;
  guestId: number;
  defaultValues?: Partial<FormValues>;
  ceremonies: Ceremony[];
  onSuccess?: (data: FormValues) => void;
  onProceedToStage2?: (data: FormValues) => void;
}

const formSchema = z.object({
  guestId: z.number(),
  eventId: z.number(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  rsvpStatus: z.enum(["confirmed", "declined"], {
    required_error: "Please select whether you'll attend",
  }),
  isLocalGuest: z.boolean().optional().default(false),
  plusOneAttending: z.boolean().optional(),
  plusOneName: z.string().optional(),
  dietaryRestrictions: z.string().optional(),
  allergies: z.string().optional(),
  ceremonies: z.array(z.object({
    ceremonyId: z.number(),
    attending: z.boolean(),
  })).optional(),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function RsvpStage1Form({ 
  eventId, 
  guestId, 
  defaultValues, 
  ceremonies, 
  onSuccess, 
  onProceedToStage2 
}: RsvpStage1FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guestId,
      eventId,
      firstName: defaultValues?.firstName || "",
      lastName: defaultValues?.lastName || "",
      email: defaultValues?.email || "",
      phone: defaultValues?.phone || "",
      rsvpStatus: defaultValues?.rsvpStatus || "confirmed",
      isLocalGuest: defaultValues?.isLocalGuest || false,
      plusOneAttending: defaultValues?.plusOneAttending || false,
      plusOneName: defaultValues?.plusOneName || "",
      dietaryRestrictions: defaultValues?.dietaryRestrictions || "",
      allergies: defaultValues?.allergies || "",
      ceremonies: defaultValues?.ceremonies || [],
      message: defaultValues?.message || "",
    },
  });

  // RELIABLE form pre-population - fixed setTimeout anti-pattern
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      const formData = {
        guestId,
        eventId,
        firstName: defaultValues.firstName || "",
        lastName: defaultValues.lastName || "",
        email: defaultValues.email || "",
        phone: defaultValues.phone || "",
        rsvpStatus: defaultValues.rsvpStatus || "confirmed",
        isLocalGuest: defaultValues.isLocalGuest || false,
        plusOneAttending: defaultValues.plusOneAttending || false,
        plusOneName: defaultValues.plusOneName || "",
        dietaryRestrictions: defaultValues.dietaryRestrictions || "",
        allergies: defaultValues.allergies || "",
        ceremonies: defaultValues.ceremonies || [],
        message: defaultValues.message || "",
      };
      
      // IMMEDIATE form reset - no setTimeout needed
      form.reset(formData);
    }
  }, [defaultValues, form, guestId, eventId]);
  
  const rsvpStatus = form.watch("rsvpStatus");
  const plusOneAttending = form.watch("plusOneAttending");
  const isLocalGuest = form.watch("isLocalGuest");
  
  const handleSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // Submit RSVP Stage 1
      const rsvpResponse = await post("/api/rsvp/stage1", values);
      
      const data = rsvpResponse.data;
      
      if (!data.success) {
        throw new Error(data.message || "Failed to submit RSVP");
      }
      
      toast({
        title: "RSVP Submitted",
        description: data.requiresStage2 
          ? "Thank you! We'll now need some travel details from you." 
          : "Thank you for your response!",
      });
      
      // If Stage 2 is required and callback is provided, trigger it
      if (data.requiresStage2 && onProceedToStage2) {
        onProceedToStage2(data);
        return;
      }
      
      // Otherwise call the success callback if provided
      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      // Silent error handling
      toast({
        variant: "destructive",
        title: "RSVP Submission Failed",
        description: error instanceof Error ? error.message : "An error occurred while submitting your RSVP.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create a formatted array of ceremony objects for the form
  const ceremonyFields = ceremonies.map(ceremony => {
    const existingSelection = form.getValues().ceremonies?.find(
      c => c.ceremonyId === ceremony.id
    );
    
    return {
      ceremonyId: ceremony.id,
      attending: existingSelection?.attending || false,
      name: ceremony.name,
      date: ceremony.date,
      startTime: ceremony.startTime,
      endTime: ceremony.endTime,
      location: ceremony.location
    };
  });
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <AppleFormCard 
          title="Your Information" 
          subtitle="Please provide your contact details"
          icon={<User className="w-4 h-4 text-primary" />}
          variant="elegant"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="your.email@example.com" 
                        {...field} 
                        className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                      />
                    </FormControl>
                    <FormDescription>
                      Please enter the email address your invitation was sent to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">Phone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+1 (555) 123-4567" 
                        {...field} 
                        className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional, for WhatsApp updates
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">First Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John" 
                          {...field} 
                          className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Last Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Doe" 
                          {...field} 
                          className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
        </AppleFormCard>
        
        <AppleFormCard 
          title="RSVP Response" 
          subtitle="Will you be joining us for our special day?"
          icon={<Heart className="w-4 h-4 text-primary" />}
          variant="elegant"
        >
          <FormField
            control={form.control}
            name="rsvpStatus"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-base font-medium text-foreground">Will you be attending?</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0 bg-background/30 border border-border/50 rounded-xl p-4 hover:bg-background/50 transition-all duration-200 hover:border-primary/50">
                      <FormControl>
                        <RadioGroupItem value="confirmed" className="border-2" />
                      </FormControl>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <FormLabel className="font-medium cursor-pointer">Yes, I will attend</FormLabel>
                      </div>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0 bg-background/30 border border-border/50 rounded-xl p-4 hover:bg-background/50 transition-all duration-200 hover:border-primary/50">
                      <FormControl>
                        <RadioGroupItem value="declined" className="border-2" />
                      </FormControl>
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-muted-foreground" />
                        <FormLabel className="font-medium cursor-pointer">No, I cannot attend</FormLabel>
                      </div>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </AppleFormCard>
        
        {rsvpStatus === "confirmed" && (
          <AppleFormCard 
            title="Additional Details" 
            subtitle="Help us plan better for your attendance"
            icon={<Users className="w-4 h-4 text-primary" />}
            variant="minimal"
          >
            <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="isLocalGuest"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-background/30 border border-border/50 rounded-xl p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-medium">
                          I live locally (within 50km of the venue)
                        </FormLabel>
                        <FormDescription>
                          This helps us plan transportation and accommodation
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="plusOneAttending"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-background/30 border border-border/50 rounded-xl p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-medium">
                          I'm bringing a plus one/partner
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                
                {plusOneAttending && (
                  <FormField
                    control={form.control}
                    name="plusOneName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-foreground">Plus One Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Name of your plus one" 
                            {...field} 
                            className="h-11 bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                          />
                        </FormControl>
                        <FormDescription>
                          Who will be accompanying you?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h4 className="text-base font-medium text-foreground">Which events will you attend?</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allSelected = ceremonyFields.every((_, index) => 
                          form.getValues(`ceremonies.${index}.attending`)
                        );
                        
                        ceremonyFields.forEach((_, index) => {
                          form.setValue(`ceremonies.${index}.attending`, !allSelected);
                        });
                      }}
                      className="text-xs px-3 py-1 h-auto bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 whitespace-nowrap"
                    >
                      {ceremonyFields.every((_, index) => form.watch(`ceremonies.${index}.attending`)) ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {ceremonyFields.map((ceremony, index) => (
                      <div key={ceremony.ceremonyId} className="group">
                        <FormField
                          control={form.control}
                          name={`ceremonies.${index}.attending`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-4 space-y-0 bg-gradient-to-r from-background/40 to-background/30 border border-border/50 rounded-xl p-5 hover:bg-gradient-to-r hover:from-background/60 hover:to-background/50 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                              </FormControl>
                              <div className="space-y-2 leading-none flex-1">
                                <FormLabel className="text-base font-semibold text-foreground cursor-pointer group-hover:text-primary transition-colors duration-200">
                                  {ceremony.name}
                                </FormLabel>
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-muted-foreground">
                                    📅 {new Date(ceremony.date).toLocaleDateString('en-US', { 
                                      weekday: 'long', 
                                      year: 'numeric', 
                                      month: 'long', 
                                      day: 'numeric' 
                                    })}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    🕐 {ceremony.startTime} - {ceremony.endTime}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    📍 {ceremony.location}
                                  </p>
                                </div>
                              </div>
                            </FormItem>
                          )}
                        />
                        <input 
                          type="hidden" 
                          {...form.register(`ceremonies.${index}.ceremonyId` as const, {
                            valueAsNumber: true
                          })}
                          value={ceremony.ceremonyId} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
                
                <FormField
                  control={form.control}
                  name="dietaryRestrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-foreground">Dietary Restrictions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please list any dietary restrictions or allergies..."
                          className="min-h-[80px] bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
          </AppleFormCard>
        )}
        
        <AppleFormCard 
          title="Message for the Couple" 
          subtitle="Share your wishes and congratulations (optional)"
          icon={<MessageSquare className="w-4 h-4 text-primary" />}
          variant="minimal"
        >
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">Your Message (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Send your wishes and congratulations to the couple..."
                    className="min-h-[100px] bg-background/50 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </AppleFormCard>
        
        <div className="flex justify-center pt-4">
          <Button 
            type="submit" 
            className="w-full max-w-md h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
            disabled={isSubmitting}
          >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              Submitting...
            </>
          ) : rsvpStatus === "confirmed" && !isLocalGuest ? (
            "Next: Travel Details"
          ) : (
            "Submit RSVP"
          )}
          </Button>
        </div>
      </form>
    </Form>
  );
}