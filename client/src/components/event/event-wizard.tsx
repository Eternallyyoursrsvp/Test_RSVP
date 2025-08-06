import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post, put } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronRight,
  Hotel,
  Plane,
  Car,
  Calendar,
  UsersRound,
  User,
  Mail,
  Building,
} from "lucide-react";

// Define the provision modes as constants
const PROVISION_MODES = {
  NONE: "none",
  ALL: "all",
  SPECIAL_DEAL: "special_deal",
  SELECTED: "selected"
};

// Define the schema for each step
const basicInfoSchema = z.object({
  title: z.string().min(3, { message: "Event title is required" }),
  coupleNames: z.string().min(3, { message: "Couple names are required" }),
  brideName: z.string().min(1, { message: "Bride's name is required" }),
  groomName: z.string().min(1, { message: "Groom's name is required" }),
  startDate: z.string().min(1, { message: "Start date is required" }),
  endDate: z.string().min(1, { message: "End date is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  description: z.string().optional(),
});

const eventStructureSchema = z.object({
  includeSangeet: z.boolean().default(true),
  includeHaldi: z.boolean().default(true),
  includeMehndi: z.boolean().default(true),
  includeWedding: z.boolean().default(true),
  includeReception: z.boolean().default(true),
  customCeremonies: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      location: z.string(),
      description: z.string().optional(),
      attireCode: z.string().optional(),
    })
  ).default([]),
});

const guestManagementSchema = z.object({
  allowPlusOnes: z.boolean().default(true),
  allowChildrenDetails: z.boolean().default(true),
  trackRelationship: z.boolean().default(true),
  trackSide: z.boolean().default(true),
  rsvpDeadline: z.string().nullable().optional(),
});

const travelAccommodationSchema = z.object({
  // Accommodation Settings
  accommodationMode: z.string().default(PROVISION_MODES.NONE),
  accommodationSpecialDeals: z.string().nullable().optional(),
  accommodationInstructions: z.string().nullable().optional(),
  accommodationHotelName: z.string().nullable().optional(),
  accommodationHotelAddress: z.string().nullable().optional(),
  accommodationHotelPhone: z.string().nullable().optional(),
  accommodationHotelWebsite: z.string().nullable().optional(),
  accommodationSpecialRates: z.string().nullable().optional(),
  
  // Transport Settings
  transportMode: z.string().default(PROVISION_MODES.NONE),
  transportSpecialDeals: z.string().nullable().optional(),
  transportInstructions: z.string().nullable().optional(),
  transportProviderName: z.string().nullable().optional(),
  transportProviderContact: z.string().nullable().optional(),
  transportProviderWebsite: z.string().nullable().optional(),
  defaultArrivalLocation: z.string().nullable().optional(),
  defaultDepartureLocation: z.string().nullable().optional(),
  
  // Flight Settings
  flightMode: z.string().default(PROVISION_MODES.NONE),
  flightSpecialDeals: z.string().nullable().optional(),
  flightInstructions: z.string().nullable().optional(),
  recommendedAirlines: z.string().nullable().optional(),
  airlineDiscountCodes: z.string().nullable().optional(),
});

const communicationSchema = z.object({
  emailFrom: z.string().email().optional(),
  emailReplyTo: z.string().email().optional(),
  sendRsvpReminders: z.boolean().default(true),
  sendRsvpConfirmations: z.boolean().default(true),
  sendTravelUpdates: z.boolean().default(true),
  enableWhatsapp: z.boolean().default(false),
  whatsappBusinessNumber: z.string().optional(),
});

// Combine schemas for final submission
const combinedSchema = z.object({
  basicInfo: basicInfoSchema,
  eventStructure: eventStructureSchema,
  guestManagement: guestManagementSchema,
  travelAccommodation: travelAccommodationSchema,
  communication: communicationSchema,
});

// Define types for each form section
type BasicInfoData = z.infer<typeof basicInfoSchema>;
type EventStructureData = z.infer<typeof eventStructureSchema>;
type GuestManagementData = z.infer<typeof guestManagementSchema>;
type TravelAccommodationData = z.infer<typeof travelAccommodationSchema>;
type CommunicationData = z.infer<typeof communicationSchema>;

// Combined form data type
type EventWizardFormData = z.infer<typeof combinedSchema>;

// ExistingEvent type definition
interface ExistingEvent {
  id?: number;
  title: string;
  coupleNames: string;
  brideName: string;
  groomName: string;
  startDate: string;
  endDate: string;
  location: string;
  description?: string | null;
  date?: string | null;
  
  // Guest management
  allowPlusOnes?: boolean | null;
  allowChildrenDetails?: boolean | null;
  rsvpDeadline?: string | null;
  
  // Travel & Accommodation
  accommodationMode?: string | null;
  accommodationSpecialDeals?: string | null;
  accommodationInstructions?: string | null;
  accommodationHotelName?: string | null;
  accommodationHotelAddress?: string | null;
  accommodationHotelPhone?: string | null;
  accommodationHotelWebsite?: string | null;
  accommodationSpecialRates?: string | null;
  
  transportMode?: string | null;
  transportSpecialDeals?: string | null;
  transportInstructions?: string | null;
  transportProviderName?: string | null;
  transportProviderContact?: string | null;
  transportProviderWebsite?: string | null;
  defaultArrivalLocation?: string | null;
  defaultDepartureLocation?: string | null;
  
  flightMode?: string | null;
  flightSpecialDeals?: string | null;
  flightInstructions?: string | null;
  recommendedAirlines?: string | null;
  airlineDiscountCodes?: string | null;
  
  // Communication
  emailFrom?: string | null;
  emailReplyTo?: string | null;
  sendRsvpReminders?: boolean;
  sendRsvpConfirmations?: boolean;
  sendTravelUpdates?: boolean;
  whatsappBusinessNumber?: string | null;
}

interface EventWizardProps {
  isOpen: boolean;
  onClose: () => void;
  existingEvent?: ExistingEvent;
}

export default function EventWizard({ 
  isOpen, 
  onClose, 
  existingEvent 
}: EventWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [wizardData, setWizardData] = useState<Partial<EventWizardFormData>>({});
  
  // Initialize wizard data when existingEvent changes
  useEffect(() => {
    if (existingEvent) {
      setWizardData({
        basicInfo: {
          title: existingEvent.title,
          coupleNames: existingEvent.coupleNames,
          brideName: existingEvent.brideName,
          groomName: existingEvent.groomName,
          startDate: existingEvent.startDate,
          endDate: existingEvent.endDate,
          location: existingEvent.location,
          description: existingEvent.description || undefined,
        },
        eventStructure: {
          includeSangeet: true,
          includeHaldi: true,
          includeMehndi: true,
          includeWedding: true,
          includeReception: true,
          customCeremonies: [],
        },
        guestManagement: {
          allowPlusOnes: existingEvent.allowPlusOnes === null ? true : !!existingEvent.allowPlusOnes,
          allowChildrenDetails: existingEvent.allowChildrenDetails === null ? true : !!existingEvent.allowChildrenDetails,
          trackRelationship: true,
          trackSide: true,
          rsvpDeadline: existingEvent.rsvpDeadline,
        },
        travelAccommodation: {
          accommodationMode: existingEvent.accommodationMode || PROVISION_MODES.NONE,
          accommodationSpecialDeals: existingEvent.accommodationSpecialDeals,
          accommodationInstructions: existingEvent.accommodationInstructions,
          accommodationHotelName: existingEvent.accommodationHotelName,
          accommodationHotelAddress: existingEvent.accommodationHotelAddress,
          accommodationHotelPhone: existingEvent.accommodationHotelPhone,
          accommodationHotelWebsite: existingEvent.accommodationHotelWebsite,
          accommodationSpecialRates: existingEvent.accommodationSpecialRates,
          transportMode: existingEvent.transportMode || PROVISION_MODES.NONE,
          transportSpecialDeals: existingEvent.transportSpecialDeals,
          transportInstructions: existingEvent.transportInstructions,
          transportProviderName: existingEvent.transportProviderName,
          transportProviderContact: existingEvent.transportProviderContact,
          transportProviderWebsite: existingEvent.transportProviderWebsite,
          defaultArrivalLocation: existingEvent.defaultArrivalLocation,
          defaultDepartureLocation: existingEvent.defaultDepartureLocation,
          flightMode: existingEvent.flightMode || PROVISION_MODES.NONE,
          flightSpecialDeals: existingEvent.flightSpecialDeals,
          flightInstructions: existingEvent.flightInstructions,
          recommendedAirlines: existingEvent.recommendedAirlines,
          airlineDiscountCodes: existingEvent.airlineDiscountCodes,
        },
        communication: {
          emailFrom: existingEvent.emailFrom || undefined,
          emailReplyTo: existingEvent.emailReplyTo || undefined,
          sendRsvpReminders: existingEvent.sendRsvpReminders !== undefined ? existingEvent.sendRsvpReminders : true,
          sendRsvpConfirmations: existingEvent.sendRsvpConfirmations !== undefined ? existingEvent.sendRsvpConfirmations : true,
          sendTravelUpdates: existingEvent.sendTravelUpdates !== undefined ? existingEvent.sendTravelUpdates : true,
          enableWhatsapp: !!existingEvent.whatsappBusinessNumber,
          whatsappBusinessNumber: existingEvent.whatsappBusinessNumber || undefined,
        },
      });
    }
  }, [existingEvent?.id]); // Only depend on event ID to prevent infinite loops
  
  // Define the step titles and schemas
  const steps = [
    { title: "Basic Event Details", schema: basicInfoSchema, icon: Calendar },
    { title: "Event Structure", schema: eventStructureSchema, icon: Building },
    { title: "Guest Management", schema: guestManagementSchema, icon: UsersRound },
    { title: "Travel & Accommodation", schema: travelAccommodationSchema, icon: Hotel },
    { title: "Communication Settings", schema: communicationSchema, icon: Mail },
  ];

  // Define type for the API request data
  type EventApiData = {
    title: string;
    coupleNames: string;
    brideName: string;
    groomName: string;
    startDate: string;
    endDate: string;
    location: string;
    description: string | null;
    date: string | null;
    
    // Guest management
    allowPlusOnes: boolean;
    allowChildrenDetails: boolean;
    rsvpDeadline: string | null;
    
    // Travel & Accommodation
    accommodationMode: string;
    accommodationSpecialDeals: string | null;
    accommodationInstructions: string | null;
    accommodationHotelName: string | null;
    accommodationHotelAddress: string | null;
    accommodationHotelPhone: string | null;
    accommodationHotelWebsite: string | null;
    accommodationSpecialRates: string | null;
    
    transportMode: string;
    transportSpecialDeals: string | null;
    transportInstructions: string | null;
    transportProviderName: string | null;
    transportProviderContact: string | null;
    transportProviderWebsite: string | null;
    defaultArrivalLocation: string | null;
    defaultDepartureLocation: string | null;
    
    flightMode: string;
    flightSpecialDeals: string | null;
    flightInstructions: string | null;
    recommendedAirlines: string | null;
    airlineDiscountCodes: string | null;
    
    // Communication
    emailFrom: string | null;
    emailReplyTo: string | null;
    sendRsvpReminders: boolean;
    sendRsvpConfirmations: boolean;
    sendTravelUpdates: boolean;
    whatsappBusinessNumber: string | null;
  };
  
  // Set up create/update event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventApiData) => {
      const endpoint = existingEvent 
        ? `/api/events/${existingEvent.id}` 
        : '/api/events';
      const method = existingEvent ? 'PUT' : 'POST';
      
      const response = method === 'POST' ? await post(endpoint, data) : await put(endpoint, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({
        title: existingEvent ? "Event Updated" : "Event Created",
        description: existingEvent 
          ? "The event has been updated successfully." 
          : "Your new event has been created successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${existingEvent ? 'update' : 'create'} event: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Initialize the form for the current step
  const currentSchema = steps[currentStep].schema;
  
  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: getStepData(currentStep) as any,
  });
  
  // Initialize form with either existing event data or default values
  useEffect(() => {
    if (existingEvent) {
      const updatedWizardData = {
        basicInfo: {
          title: existingEvent.title,
          coupleNames: existingEvent.coupleNames,
          brideName: existingEvent.brideName,
          groomName: existingEvent.groomName,
          startDate: existingEvent.startDate,
          endDate: existingEvent.endDate,
          location: existingEvent.location,
          description: existingEvent.description || undefined,
        },
        eventStructure: {
          includeSangeet: true,
          includeHaldi: true,
          includeMehndi: true,
          includeWedding: true,
          includeReception: true,
          customCeremonies: [],
        },
        guestManagement: {
          allowPlusOnes: existingEvent.allowPlusOnes === null ? true : !!existingEvent.allowPlusOnes,
          allowChildrenDetails: existingEvent.allowChildrenDetails === null ? true : !!existingEvent.allowChildrenDetails,
          trackRelationship: true,
          trackSide: true,
          rsvpDeadline: existingEvent.rsvpDeadline,
        },
        travelAccommodation: {
          accommodationMode: existingEvent.accommodationMode || PROVISION_MODES.NONE,
          accommodationSpecialDeals: existingEvent.accommodationSpecialDeals,
          accommodationInstructions: existingEvent.accommodationInstructions,
          accommodationHotelName: existingEvent.accommodationHotelName,
          accommodationHotelAddress: existingEvent.accommodationHotelAddress,
          accommodationHotelPhone: existingEvent.accommodationHotelPhone,
          accommodationHotelWebsite: existingEvent.accommodationHotelWebsite,
          accommodationSpecialRates: existingEvent.accommodationSpecialRates,
          transportMode: existingEvent.transportMode || PROVISION_MODES.NONE,
          transportSpecialDeals: existingEvent.transportSpecialDeals,
          transportInstructions: existingEvent.transportInstructions,
          transportProviderName: existingEvent.transportProviderName,
          transportProviderContact: existingEvent.transportProviderContact,
          transportProviderWebsite: existingEvent.transportProviderWebsite,
          defaultArrivalLocation: existingEvent.defaultArrivalLocation,
          defaultDepartureLocation: existingEvent.defaultDepartureLocation,
          flightMode: existingEvent.flightMode || PROVISION_MODES.NONE,
          flightSpecialDeals: existingEvent.flightSpecialDeals,
          flightInstructions: existingEvent.flightInstructions,
          recommendedAirlines: existingEvent.recommendedAirlines,
          airlineDiscountCodes: existingEvent.airlineDiscountCodes,
        },
        communication: {
          emailFrom: existingEvent.emailFrom,
          emailReplyTo: existingEvent.emailReplyTo,
          sendRsvpReminders: existingEvent.sendRsvpReminders !== undefined ? existingEvent.sendRsvpReminders : true,
          sendRsvpConfirmations: existingEvent.sendRsvpConfirmations !== undefined ? existingEvent.sendRsvpConfirmations : true,
          sendTravelUpdates: existingEvent.sendTravelUpdates !== undefined ? existingEvent.sendTravelUpdates : true,
          enableWhatsapp: !!existingEvent.whatsappBusinessNumber,
          whatsappBusinessNumber: existingEvent.whatsappBusinessNumber,
        },
      };
      
      setWizardData(updatedWizardData as any);
      
      // Immediately reset the form with the current step data from the updated wizard data
      const stepKey = steps[currentStep].title.toLowerCase().replace(/[&\\s]+/g, '');
      let currentStepData;
      
      switch(stepKey) {
        case 'basiceventdetails':
          currentStepData = updatedWizardData.basicInfo;
          break;
        case 'eventstructure':
          currentStepData = updatedWizardData.eventStructure;
          break;
        case 'guestmanagement':
          currentStepData = updatedWizardData.guestManagement;
          break;
        case 'travel&accommodation':
          currentStepData = updatedWizardData.travelAccommodation;
          break;
        case 'communicationsettings':
          currentStepData = updatedWizardData.communication;
          break;
        default:
          currentStepData = {};
      }
      
      if (currentStepData && Object.keys(currentStepData).length > 0) {
        form.reset(currentStepData);
      }
    }
  }, [existingEvent, currentStep, steps]);
  
  // When step changes after the initial load, reset the form with the current values
  useEffect(() => {
    // Skip the initial load since that's handled by the effect above
    if (!existingEvent) {
      const currentValues = getStepData(currentStep);
      if (currentValues && Object.keys(currentValues).length > 0) {
        form.reset(currentValues);
      }
    }
  }, [currentStep, wizardData, existingEvent]);
  
  // Helper function to get data for the current step with proper type casting
  function getStepData(stepIndex: number): Record<string, any> {
    const stepKey = steps[stepIndex].title.toLowerCase().replace(/[&\\s]+/g, '');
    
    // Handle each step with appropriate typing
    switch(stepKey) {
      case 'basiceventdetails':
        return (wizardData.basicInfo || {}) as BasicInfoData;
      case 'eventstructure':
        return (wizardData.eventStructure || {}) as EventStructureData;
      case 'guestmanagement':
        return (wizardData.guestManagement || {}) as GuestManagementData;
      case 'travel&accommodation':
        return (wizardData.travelAccommodation || {}) as TravelAccommodationData;
      case 'communicationsettings':
        return (wizardData.communication || {}) as CommunicationData;
      default:
        return {};
    }
  }

  // Navigation functions
  const nextStep = (data: any) => {
    // Save data from current step based on the current step index
    const stepKey = steps[currentStep].title.toLowerCase().replace(/[&\\s]+/g, '');
    let updatedData = { ...wizardData };
    
    // Map the stepKey to the correct property in the wizardData object
    switch(stepKey) {
      case 'basiceventdetails':
        updatedData.basicInfo = data;
        break;
      case 'eventstructure':
        updatedData.eventStructure = data;
        break;
      case 'guestmanagement':
        updatedData.guestManagement = data;
        break;
      case 'travel&accommodation':
        updatedData.travelAccommodation = data;
        break;
      case 'communicationsettings':
        updatedData.communication = data;
        break;
    }
    
    setWizardData(updatedData as any);
    
    // Move to next step
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Submit the complete form on the last step
      submitForm();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  const submitForm = () => {
    // Process the collected form data from all wizard steps
    // Prepare data for submission
    const formData: EventApiData = {
      // Basic info fields - required fields
      title: wizardData.basicInfo?.title || "",
      coupleNames: wizardData.basicInfo?.coupleNames || "",
      brideName: wizardData.basicInfo?.brideName || "",
      groomName: wizardData.basicInfo?.groomName || "",
      startDate: wizardData.basicInfo?.startDate || new Date().toISOString().split('T')[0],
      endDate: wizardData.basicInfo?.endDate || new Date().toISOString().split('T')[0],
      location: wizardData.basicInfo?.location || "",
      description: wizardData.basicInfo?.description || null,
      
      // Optional for backward compatibility
      date: wizardData.basicInfo?.startDate || null,
      
      // Guest management settings
      allowPlusOnes: wizardData.guestManagement?.allowPlusOnes !== undefined ? wizardData.guestManagement.allowPlusOnes : true,
      allowChildrenDetails: wizardData.guestManagement?.allowChildrenDetails !== undefined ? wizardData.guestManagement.allowChildrenDetails : true,
      rsvpDeadline: wizardData.guestManagement?.rsvpDeadline || null,
      
      // Travel & accommodation settings
      accommodationMode: wizardData.travelAccommodation?.accommodationMode || PROVISION_MODES.NONE,
      accommodationSpecialDeals: wizardData.travelAccommodation?.accommodationSpecialDeals || null,
      accommodationInstructions: wizardData.travelAccommodation?.accommodationInstructions || null,
      accommodationHotelName: wizardData.travelAccommodation?.accommodationHotelName || null,
      accommodationHotelAddress: wizardData.travelAccommodation?.accommodationHotelAddress || null,
      accommodationHotelPhone: wizardData.travelAccommodation?.accommodationHotelPhone || null,
      accommodationHotelWebsite: wizardData.travelAccommodation?.accommodationHotelWebsite || null,
      accommodationSpecialRates: wizardData.travelAccommodation?.accommodationSpecialRates || null,
      
      transportMode: wizardData.travelAccommodation?.transportMode || PROVISION_MODES.NONE,
      transportSpecialDeals: wizardData.travelAccommodation?.transportSpecialDeals || null,
      transportInstructions: wizardData.travelAccommodation?.transportInstructions || null,
      transportProviderName: wizardData.travelAccommodation?.transportProviderName || null,
      transportProviderContact: wizardData.travelAccommodation?.transportProviderContact || null,
      transportProviderWebsite: wizardData.travelAccommodation?.transportProviderWebsite || null,
      defaultArrivalLocation: wizardData.travelAccommodation?.defaultArrivalLocation || null,
      defaultDepartureLocation: wizardData.travelAccommodation?.defaultDepartureLocation || null,
      
      flightMode: wizardData.travelAccommodation?.flightMode || PROVISION_MODES.NONE,
      flightSpecialDeals: wizardData.travelAccommodation?.flightSpecialDeals || null,
      flightInstructions: wizardData.travelAccommodation?.flightInstructions || null,
      recommendedAirlines: wizardData.travelAccommodation?.recommendedAirlines || null,
      airlineDiscountCodes: wizardData.travelAccommodation?.airlineDiscountCodes || null,
      
      // Communication settings
      emailFrom: wizardData.communication?.emailFrom || null,
      emailReplyTo: wizardData.communication?.emailReplyTo || null,
      sendRsvpReminders: wizardData.communication?.sendRsvpReminders !== undefined ? wizardData.communication.sendRsvpReminders : true,
      sendRsvpConfirmations: wizardData.communication?.sendRsvpConfirmations !== undefined ? wizardData.communication.sendRsvpConfirmations : true,
      sendTravelUpdates: wizardData.communication?.sendTravelUpdates !== undefined ? wizardData.communication.sendTravelUpdates : true,
      whatsappBusinessNumber: wizardData.communication?.whatsappBusinessNumber || null,
    };
    
    // Form data is ready for submission
    
    // Submit the form
    createEventMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair">
            {existingEvent ? "Edit Event" : "Create New Event"}
          </DialogTitle>
          <DialogDescription>
            {existingEvent
              ? "Update your event settings"
              : "Follow these steps to set up your wedding event"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex justify-between items-center mb-8 mt-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex flex-col items-center ${
                index <= currentStep
                  ? "text-primary"
                  : "text-gray-400"
              }`}
            >
              <div
                className={`rounded-full w-10 h-10 flex items-center justify-center mb-2 ${
                  index < currentStep
                    ? "bg-primary text-white"
                    : index === currentStep
                    ? "border-2 border-primary"
                    : "border-2 border-gray-300"
                }`}
                onClick={() => goToStep(index)}
                role="button"
                tabIndex={index < currentStep ? 0 : -1}
              >
                {index < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs text-center">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Wizard steps content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(nextStep)} className="space-y-6">
            {currentStep === 0 && (
              /* Basic Info Step */
              <>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sarah & Michael's Wedding" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="coupleNames"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Couple Names</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sarah & Michael" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="brideName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bride's Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Sarah" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="groomName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Groom's Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Michael" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Grand Palace Hotel, New York" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Add details about your wedding event..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {currentStep === 1 && (
              /* Event Structure Step */
              <>
                <div className="mb-6">
                  <h3 className="font-medium text-lg mb-2">Traditional Ceremonies</h3>
                  <p className="text-muted-foreground mb-4">
                    Select which traditional Indian wedding ceremonies will be included in your event
                  </p>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="includeSangeet"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <FormLabel className="text-base">Sangeet</FormLabel>
                            <FormDescription>Music and dance celebration</FormDescription>
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
                    
                    <FormField
                      control={form.control}
                      name="includeHaldi"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <FormLabel className="text-base">Haldi</FormLabel>
                            <FormDescription>Turmeric application ceremony</FormDescription>
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
                    
                    <FormField
                      control={form.control}
                      name="includeMehndi"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <FormLabel className="text-base">Mehndi</FormLabel>
                            <FormDescription>Henna application ceremony</FormDescription>
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
                    
                    <FormField
                      control={form.control}
                      name="includeWedding"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <FormLabel className="text-base">Wedding Ceremony</FormLabel>
                            <FormDescription>The main wedding ritual</FormDescription>
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
                    
                    <FormField
                      control={form.control}
                      name="includeReception"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <FormLabel className="text-base">Reception</FormLabel>
                            <FormDescription>Post-wedding celebration</FormDescription>
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
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-lg mb-2">Custom Ceremonies</h3>
                  <p className="text-muted-foreground mb-4">
                    You can add details for custom ceremonies after creating the event
                  </p>
                </div>
              </>
            )}

            {currentStep === 2 && (
              /* Guest Management Step */
              <>
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Guest Features</CardTitle>
                      <CardDescription>
                        Configure guest list management features
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="allowPlusOnes"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">Allow Plus-Ones</FormLabel>
                              <FormDescription>
                                Enable guests to bring additional guests
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
                      
                      <FormField
                        control={form.control}
                        name="allowChildrenDetails"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">Collect Children Details</FormLabel>
                              <FormDescription>
                                Track details about children attending
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
                      
                      <FormField
                        control={form.control}
                        name="trackRelationship"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">Track Relationships</FormLabel>
                              <FormDescription>
                                Record how guests are related to the couple
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
                      
                      <FormField
                        control={form.control}
                        name="trackSide"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">Track Bride/Groom Side</FormLabel>
                              <FormDescription>
                                Record which side of the family guests belong to
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
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">RSVP Settings</CardTitle>
                      <CardDescription>
                        Configure RSVP collection for your event
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="rsvpDeadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RSVP Deadline</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormDescription>
                              The date by which guests should respond
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {currentStep === 3 && (
              /* Travel & Accommodation Step */
              <>
                <Tabs defaultValue="accommodation" className="w-full">
                  <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="accommodation">
                      <Hotel className="h-4 w-4 mr-2" />
                      Accommodation
                    </TabsTrigger>
                    <TabsTrigger value="transport">
                      <Car className="h-4 w-4 mr-2" />
                      Transport
                    </TabsTrigger>
                    <TabsTrigger value="flights">
                      <Plane className="h-4 w-4 mr-2" />
                      Flights
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Accommodation Tab */}
                  <TabsContent value="accommodation" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Accommodation Strategy</CardTitle>
                        <CardDescription>
                          Define how accommodation will be handled for your guests
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <FormField
                          control={form.control}
                          name="accommodationMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accommodation Provision Mode</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={PROVISION_MODES.NONE}>
                                      No accommodation provided
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.ALL}>
                                      Provided for all guests
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.SPECIAL_DEAL}>
                                      Special hotel deals
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.SELECTED}>
                                      Only for selected guests
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormDescription>
                                How you'll handle guest accommodation
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("accommodationMode") !== PROVISION_MODES.NONE && (
                          <>
                            {form.watch("accommodationMode") === PROVISION_MODES.ALL && (
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="accommodationHotelName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Hotel Name</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g., Grand Hyatt" {...field} value={field.value || ''} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="accommodationHotelAddress"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Hotel Address</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Complete address" {...field} value={field.value || ''} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="accommodationHotelPhone"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Contact Number</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Phone number" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="accommodationHotelWebsite"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Hotel Website</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Website URL" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <FormField
                                  control={form.control}
                                  name="accommodationInstructions"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Instructions for Guests</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Instructions about check-in process, etc."
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            {form.watch("accommodationMode") === PROVISION_MODES.SPECIAL_DEAL && (
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="accommodationHotelName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Recommended Hotel</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g., Grand Hyatt" {...field} value={field.value || ''} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="accommodationSpecialRates"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Special Rates Information</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Details about special rates negotiated for guests"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="accommodationSpecialDeals"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Booking Codes/Links</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Promo codes or special booking links"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            {form.watch("accommodationMode") === PROVISION_MODES.SELECTED && (
                              <div className="rounded-lg border p-4 bg-muted/50">
                                <p className="text-sm">
                                  You'll be able to assign accommodation to specific guests after creating the event. 
                                  You can designate certain guests to receive accommodation on the guest management page.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Transport Tab */}
                  <TabsContent value="transport" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Local Transportation Strategy</CardTitle>
                        <CardDescription>
                          Define how local transportation will be handled for your guests
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <FormField
                          control={form.control}
                          name="transportMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Transportation Provision Mode</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={PROVISION_MODES.NONE}>
                                      No transportation provided
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.ALL}>
                                      Provided for all guests
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.SPECIAL_DEAL}>
                                      Transportation options/discounts
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.SELECTED}>
                                      Only for selected guests
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormDescription>
                                How you'll handle transportation for guests
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("transportMode") !== PROVISION_MODES.NONE && (
                          <>
                            {form.watch("transportMode") === PROVISION_MODES.ALL && (
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="transportProviderName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Transportation Provider</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g., Royal Limousine Services" {...field} value={field.value || ''} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="transportProviderContact"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Contact Information</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Phone or email" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name="transportProviderWebsite"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Website</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Website URL" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <FormField
                                  control={form.control}
                                  name="transportInstructions"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Transportation Instructions</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Details about pickup locations, schedules, etc."
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            {form.watch("transportMode") === PROVISION_MODES.SPECIAL_DEAL && (
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="transportSpecialDeals"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Transportation Options</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Details about transportation options, discounts, or arrangements"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="transportInstructions"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Instructions for Guests</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="How to book or arrange transportation"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            {form.watch("transportMode") === PROVISION_MODES.SELECTED && (
                              <div className="rounded-lg border p-4 bg-muted/50">
                                <p className="text-sm">
                                  You'll be able to assign transportation to specific guests after creating the event. 
                                  Select which guests need transportation on the guest management page.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                        
                        <div className="space-y-4 pt-4 border-t">
                          <h4 className="text-sm font-medium">Default Locations</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="defaultArrivalLocation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Arrival Location</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g., Airport, Train Station"
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="defaultDepartureLocation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Departure Location</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g., Venue, Hotel"
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  {/* Flights Tab */}
                  <TabsContent value="flights" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Flight Arrangements</CardTitle>
                        <CardDescription>
                          Define how flight bookings will be handled for your guests
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <FormField
                          control={form.control}
                          name="flightMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Flight Booking Strategy</FormLabel>
                              <FormControl>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={PROVISION_MODES.NONE}>
                                      No assistance with flights
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.ALL}>
                                      Booking flights for all guests
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.SPECIAL_DEAL}>
                                      Airline discounts/information
                                    </SelectItem>
                                    <SelectItem value={PROVISION_MODES.SELECTED}>
                                      Only for selected guests
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormDescription>
                                How you'll handle flight arrangements
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {form.watch("flightMode") !== PROVISION_MODES.NONE && (
                          <>
                            {form.watch("flightMode") === PROVISION_MODES.ALL && (
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="recommendedAirlines"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Airlines</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g., Air India, Emirates" {...field} value={field.value || ''} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="flightInstructions"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Flight Booking Instructions</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Instructions for guests about flight arrangements"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            {form.watch("flightMode") === PROVISION_MODES.SPECIAL_DEAL && (
                              <div className="space-y-4">
                                <FormField
                                  control={form.control}
                                  name="recommendedAirlines"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Recommended Airlines</FormLabel>
                                      <FormControl>
                                        <Input placeholder="e.g., Air India, Emirates" {...field} value={field.value || ''} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="airlineDiscountCodes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Airline Discount Codes</FormLabel>
                                      <FormControl>
                                        <Input
                                          placeholder="Any special codes for discounted rates"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <FormField
                                  control={form.control}
                                  name="flightSpecialDeals"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Special Flight Deals</FormLabel>
                                      <FormControl>
                                        <Textarea
                                          placeholder="Details about special flight deals"
                                          {...field}
                                          value={field.value || ''}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            )}
                            
                            {form.watch("flightMode") === PROVISION_MODES.SELECTED && (
                              <div className="rounded-lg border p-4 bg-muted/50">
                                <p className="text-sm">
                                  You'll be able to assign flight arrangements to specific guests after creating the event.
                                  Select which guests need flights on the guest management page.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </>
            )}

            {currentStep === 4 && (
              /* Communication Settings Step */
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Communication Settings</CardTitle>
                    <CardDescription>
                      Configure how you'll communicate with guests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="emailFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="e.g., couple@example.com"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Email address that will appear in the "From" field
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="emailReplyTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reply-To Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="e.g., couple@example.com"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Email address for guest responses
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-medium">Automated Communications</h4>
                      
                      <FormField
                        control={form.control}
                        name="sendRsvpReminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">RSVP Reminders</FormLabel>
                              <FormDescription>
                                Send automated reminders for pending RSVPs
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
                      
                      <FormField
                        control={form.control}
                        name="sendRsvpConfirmations"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">RSVP Confirmations</FormLabel>
                              <FormDescription>
                                Send confirmation emails when guests RSVP
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
                      
                      <FormField
                        control={form.control}
                        name="sendTravelUpdates"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">Travel Updates</FormLabel>
                              <FormDescription>
                                Send travel information to guests who need it
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
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-medium">WhatsApp Integration</h4>
                      
                      <FormField
                        control={form.control}
                        name="enableWhatsapp"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <FormLabel className="text-base">Enable WhatsApp</FormLabel>
                              <FormDescription>
                                Send communications via WhatsApp
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
                      
                      {form.watch("enableWhatsapp") && (
                        <FormField
                          control={form.control}
                          name="whatsappBusinessNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp Business Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., +919876543210"
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Full phone number with country code
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <div className="rounded-lg border p-4 bg-muted/50">
                        <p className="text-sm">
                          <strong>Note:</strong> To fully configure email and WhatsApp, 
                          you'll need to set up provider credentials in the settings after creating the event.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <DialogFooter className="flex justify-between items-center mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="dialog-back-btn"
              >
                Back
              </Button>
              
              <Button
                type="submit"
                className="bg-primary text-white hover:bg-primary/90"
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? "Saving..." : currentStep === steps.length - 1 ? "Create Event" : "Next"}
                {currentStep < steps.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}