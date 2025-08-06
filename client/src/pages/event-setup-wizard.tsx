import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Steps } from "@/components/ui/steps";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, Check, Wand2 } from "lucide-react";
import BasicInfoStep from "@/components/wizard/basic-info-step";
import VenuesStep from "@/components/wizard/venues-step";
import RsvpConfigStep from "@/components/wizard/rsvp-config-step";
import HotelsStep from "@/components/wizard/hotels-step";
import TransportSetupStep from "@/components/wizard/transport-setup-step";
import CommunicationStep from "@/components/wizard/communication-step";
import AiAssistantStep from "@/components/wizard/ai-assistant-step";
import EventCardSelector from "@/components/wizard/event-card-selector";
import { WIZARD_STEPS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { put } from "@/lib/api-utils";
import { Spinner } from "@/components/ui/spinner";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { EventManagerRoute } from "@/components/auth/protected-route";
import { useWizardData } from "@/hooks/use-wizard-data";
import { DeploymentErrorBoundary } from "@/components/deployment-error-boundary";
import { WizardLoadingState } from "@/components/deployment-loading-state";

// Define the wizard steps
const steps = [
  { id: WIZARD_STEPS.BASIC_INFO, label: "Basic Info" },
  { id: WIZARD_STEPS.VENUES, label: "Venues" },
  { id: WIZARD_STEPS.RSVP_CONFIG, label: "RSVP Configuration" },
  { id: WIZARD_STEPS.HOTELS, label: "Hotels & Accommodations" },
  { id: WIZARD_STEPS.TRANSPORT, label: "Transport" },
  { id: WIZARD_STEPS.COMMUNICATION, label: "Communication" },
  { id: WIZARD_STEPS.AI_ASSISTANT, label: "AI Assistant" },
];

interface EventSetupWizardProps {
  initialStep?: string;
}

export default function EventSetupWizard({ initialStep }: EventSetupWizardProps = {}) {
  const [activeStep, setActiveStep] = useState(WIZARD_STEPS.BASIC_INFO);
  const [currentStep, setCurrentStep] = useState<string | null>(WIZARD_STEPS.BASIC_INFO);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [stepData, setStepData] = useState<Record<string, any>>({});
  const [location, setLocation] = useLocation();
  const params = useParams();
  const eventId = params.eventId || '';
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Check if this is a direct access without an event ID or a new event creation
  const isDirectAccess = !eventId;
  const isNewEventCreation = eventId === 'new';

  // Define the type for setup progress
  interface WizardProgress {
    currentStep: string;
    steps: Record<string, {
      isCompleted: boolean;
      stepData: any;
    }>;
  }

  // Use wizard data hook
  const { 
    data: wizardData,
    isLoading 
  } = useWizardData(eventId);
  
  // Extract data from wizard response
  const currentEvent = wizardData?.basicInfo;
  const ceremonies = wizardData?.ceremonies || [];
  const accommodations = wizardData?.accommodationConfig;
  const setupProgress = wizardData?.progress;

  // Create new event mutation
  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await post(`/api/events`, eventData);
      return response.data;
    },
    onSuccess: (data) => {
      // Redirect to the wizard with the newly created event ID
      setLocation(`/event-setup-wizard/${data.id}`);
      toast({
        title: "Event created successfully",
        description: "Your new event has been created. You can now configure all its settings.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to create event:", error);
      toast({
        title: "Failed to create event",
        description: "There was an error creating your event. Please try again.",
        variant: "destructive",
      });
    }
  });



  // Handle step from URL parameters (both props and search params)
  useEffect(() => {
    // Check URL search params for ?step=4
    const urlParams = new URLSearchParams(window.location.search);
    const stepParam = urlParams.get('step');
    
    let targetStep = initialStep;
    
    // Map step numbers to step constants
    if (stepParam) {
      const stepNumberMap: Record<string, string> = {
        '1': WIZARD_STEPS.BASIC_INFO,
        '2': WIZARD_STEPS.VENUES,
        '3': WIZARD_STEPS.RSVP_CONFIG,
        '4': WIZARD_STEPS.HOTELS,
        '5': WIZARD_STEPS.TRANSPORT,
        '6': WIZARD_STEPS.COMMUNICATION,
        '7': WIZARD_STEPS.AI_ASSISTANT,
      };
      targetStep = stepNumberMap[stepParam];
    }
    
    if (targetStep || initialStep) {
      // Map URL step names to step constants
      const stepMap: Record<string, string> = {
        'communication': WIZARD_STEPS.COMMUNICATION,
        'basic-info': WIZARD_STEPS.BASIC_INFO,
        'venues': WIZARD_STEPS.VENUES,
        'rsvp-config': WIZARD_STEPS.RSVP_CONFIG,
        'hotels': WIZARD_STEPS.HOTELS,
        'transport': WIZARD_STEPS.TRANSPORT,
        'ai-assistant': WIZARD_STEPS.AI_ASSISTANT,
      };
      
      const mappedStep = targetStep || stepMap[initialStep] || WIZARD_STEPS.BASIC_INFO;
      setActiveStep(mappedStep);
      setCurrentStep(mappedStep);
    }
  }, [initialStep]);

  // Initialize completed steps and step data from fetched progress
  useEffect(() => {
    if (setupProgress) {
      const completed: Record<string, boolean> = {};
      const data: Record<string, any> = {};
      
      // Handle progress data with type safety
      if (setupProgress.steps && typeof setupProgress.steps === 'object') {
        // New format: setupProgress.steps is an object with step IDs as keys
        Object.entries(setupProgress.steps).forEach(([stepId, stepInfo]) => {
          completed[stepId] = stepInfo.isCompleted;
          if (stepInfo.stepData) {
            data[stepId] = stepInfo.stepData;
          }
        });
      }
      
      setCompletedSteps(completed);
      setStepData(data);
      
      // Set current step if available (only if not overridden by initialStep)
      if (setupProgress.currentStep && (!currentStep || currentStep === WIZARD_STEPS.BASIC_INFO) && !initialStep) {
        setCurrentStep(setupProgress.currentStep);
        setActiveStep(setupProgress.currentStep);
      }
    }
  }, [setupProgress, currentStep, setCurrentStep, setActiveStep, initialStep]);

  // Save current step mutation
  const saveCurrentStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const response = await put(`/api/events/${eventId}`, { 
        currentStep: stepId 
      });
      return response.data;
    },
    onError: (error: Error) => {
      console.error("Failed to save current step:", error);
    }
  });

  // Save step data mutation
  const saveStepMutation = useMutation({
    mutationFn: async ({ stepId, stepData }: { stepId: string, stepData: any }) => {
      const response = await put(`/api/events/${eventId}`, stepData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/wizard-data', eventId] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId] });
    },
    onError: (error: Error) => {
      console.error("Failed to save step data:", error);
      toast({
        title: "Save failed",
        description: "There was an error saving your data. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle step change
  const navigateToStep = (stepId: string) => {
    setActiveStep(stepId);
    // Save the current step to the server if we have an event ID
    if (eventId) {
      saveCurrentStepMutation.mutate(stepId);
    }
  };

  // Handle step completion
  const handleStepComplete = (stepId: string, data: any) => {
    console.log(`Completing step ${stepId} with data:`, data);
    
    // Update local state
    setStepData((prev) => ({ ...prev, [stepId]: data }));
    setCompletedSteps((prev) => ({ ...prev, [stepId]: true }));
    
    // Save to server
    saveStepMutation.mutate({ stepId, stepData: data });

    // Show success message
    toast({
      title: "Step saved successfully",
      description: `${steps.find(s => s.id === stepId)?.label} settings have been saved.`,
      variant: "default",
    });
    
    // Automatically navigate to the next step if this isn't the last step
    const currentIndex = steps.findIndex(step => step.id === stepId);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      // Use setTimeout to give the user a moment to see the success toast
      setTimeout(() => navigateToStep(nextStep.id), 800);
    }
  };

  // Navigate to next/previous step
  const goToNextStep = () => {
    const currentIndex = steps.findIndex(step => step.id === activeStep);
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      navigateToStep(nextStep.id);
    }
  };

  const goToPreviousStep = () => {
    const currentIndex = steps.findIndex(step => step.id === activeStep);
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      navigateToStep(prevStep.id);
    }
  };

  // Finish wizard
  const finishWizard = () => {
    toast({
      title: "Setup Wizard Completed",
      description: "All settings have been saved. You can now manage your event.",
      variant: "default",
    });
    
    // For both new and existing events, redirect to the events list
    setLocation('/events');
  };

  // If loading and not creating a new event, show deployment-aware loading state
  if (isLoading && !isNewEventCreation) {
    return (
      <DashboardLayout>
        <WizardLoadingState step="event configuration" />
      </DashboardLayout>
    );
  }

  // Determine if the current step is completed
  const isCurrentStepCompleted = completedSteps[activeStep] || false;

  // Render the appropriate step component
  const renderStepContent = () => {
    switch (activeStep) {
      case WIZARD_STEPS.BASIC_INFO:
        return (
          <BasicInfoStep
            eventId={eventId}
            currentEvent={isNewEventCreation ? undefined : wizardData?.basicInfo}
            onComplete={(data) => {
              if (isNewEventCreation) {
                // For new events, we create the event first
                createEventMutation.mutate(data);
              } else {
                // For existing events, we update it
                handleStepComplete(WIZARD_STEPS.BASIC_INFO, data);
              }
            }}
            isCompleted={isNewEventCreation ? false : isCurrentStepCompleted}
          />
        );
      case WIZARD_STEPS.VENUES:
        return (
          <VenuesStep
            eventId={eventId}
            currentEvent={isNewEventCreation ? undefined : (currentEvent as any)}
            onComplete={(data) => {
              if (isNewEventCreation) {
                // Skip until event is created in the first step
                setCompletedSteps((prev) => ({ ...prev, [WIZARD_STEPS.VENUES]: true }));
                setStepData((prev) => ({ ...prev, [WIZARD_STEPS.VENUES]: data }));
                goToNextStep();
              } else {
                handleStepComplete(WIZARD_STEPS.VENUES, data);
              }
            }}
            isCompleted={isNewEventCreation ? false : isCurrentStepCompleted}
          />
        );
      case WIZARD_STEPS.RSVP_CONFIG:
        return (
          <RsvpConfigStep
            eventId={eventId}
            currentEvent={isNewEventCreation ? undefined : (currentEvent as any)}
            onComplete={(data) => {
              if (isNewEventCreation) {
                // Skip until event is created in the first step
                setCompletedSteps((prev) => ({ ...prev, [WIZARD_STEPS.RSVP_CONFIG]: true }));
                setStepData((prev) => ({ ...prev, [WIZARD_STEPS.RSVP_CONFIG]: data }));
                goToNextStep();
              } else {
                handleStepComplete(WIZARD_STEPS.RSVP_CONFIG, data);
              }
            }}
            isCompleted={isNewEventCreation ? false : isCurrentStepCompleted}
          />
        );
      case WIZARD_STEPS.HOTELS:
        return (
          <HotelsStep
            eventId={eventId}
            currentEvent={isNewEventCreation ? undefined : (currentEvent as any)}
            onComplete={(data) => {
              if (isNewEventCreation) {
                // Skip until event is created in the first step
                setCompletedSteps((prev) => ({ ...prev, [WIZARD_STEPS.HOTELS]: true }));
                setStepData((prev) => ({ ...prev, [WIZARD_STEPS.HOTELS]: data }));
                goToNextStep();
              } else {
                handleStepComplete(WIZARD_STEPS.HOTELS, data);
              }
            }}
            isCompleted={isNewEventCreation ? false : isCurrentStepCompleted}
          />
        );
      case WIZARD_STEPS.TRANSPORT:
        return (
          <TransportSetupStep
            eventId={eventId}
            onComplete={(data) => {
              if (isNewEventCreation) {
                // Skip until event is created in the first step
                setCompletedSteps((prev) => ({ ...prev, [WIZARD_STEPS.TRANSPORT]: true }));
                setStepData((prev) => ({ ...prev, [WIZARD_STEPS.TRANSPORT]: data }));
                goToNextStep();
              } else {
                handleStepComplete(WIZARD_STEPS.TRANSPORT, data);
              }
            }}
            onBack={goToPreviousStep}
            isCompleted={isNewEventCreation ? false : isCurrentStepCompleted}
          />
        );

      case WIZARD_STEPS.COMMUNICATION:
        return (
          <CommunicationStep
            eventId={eventId}
            currentEvent={isNewEventCreation ? undefined : (currentEvent as any)}
            onComplete={(data) => {
              if (isNewEventCreation) {
                // Skip until event is created in the first step
                setCompletedSteps((prev) => ({ ...prev, [WIZARD_STEPS.COMMUNICATION]: true }));
                setStepData((prev) => ({ ...prev, [WIZARD_STEPS.COMMUNICATION]: data }));
                goToNextStep();
              } else {
                handleStepComplete(WIZARD_STEPS.COMMUNICATION, data);
              }
            }}
            isCompleted={isNewEventCreation ? false : isCurrentStepCompleted}
          />
        );

      case WIZARD_STEPS.AI_ASSISTANT:
        return (
          <AiAssistantStep
            eventId={eventId}
            currentEvent={isNewEventCreation ? undefined : (currentEvent as any)}
            onComplete={(data) => {
              if (isNewEventCreation) {
                // Skip until event is created in the first step
                setCompletedSteps((prev) => ({ ...prev, [WIZARD_STEPS.AI_ASSISTANT]: true }));
                setStepData((prev) => ({ ...prev, [WIZARD_STEPS.AI_ASSISTANT]: data }));
                finishWizard();
              } else {
                handleStepComplete(WIZARD_STEPS.AI_ASSISTANT, data);
              }
            }}
            isCompleted={isNewEventCreation ? false : isCurrentStepCompleted}
          />
        );
      default:
        return <div>Unknown step</div>;
    }
  };

  // Check if all steps are completed
  const areAllStepsCompleted = steps.every(step => completedSteps[step.id]);

  return (
    <EventManagerRoute>
      <DashboardLayout>
        <DeploymentErrorBoundary>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-playfair font-bold text-neutral">
                Event Setup Wizard
              </h2>
            <p className="text-sm text-gray-500">
              {isNewEventCreation 
                ? "Create your event and configure all settings in one place" 
                : `Configure all aspects of ${currentEvent?.title || "your event"} in one place`}
            </p>
          </div>
        </div>
      
      {/* Show Event Selector when accessed directly without an event ID */}
      {isDirectAccess && !isNewEventCreation ? (
        <EventCardSelector onSelectEvent={(selectedEventId) => {
          // Set a loading state
          toast({
            title: "Loading event...",
            description: "Preparing the setup wizard for your event.",
            variant: "default",
          });
          
          // First go to the events page, then navigate to the event
          setTimeout(() => {
            setLocation(`/event-setup-wizard/${selectedEventId}`);
          }, 500);
        }} />
      ) : (
        /* Show wizard interface when accessed with an event ID */
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left sidebar with steps - always show steps list regardless of new or existing event */}
            <div className="md:col-span-1 space-y-6">
              {/* Always show steps sidebar for consistency */}
              <Steps
                steps={steps.map(step => ({
                  id: step.id,
                  label: step.label,
                  isCompleted: isNewEventCreation ? (step.id === WIZARD_STEPS.BASIC_INFO && activeStep === WIZARD_STEPS.BASIC_INFO) : completedSteps[step.id] || false,
                  isActive: activeStep === step.id
                }))}
                onStepClick={(stepId) => {
                  // For new events, only the basic info step is active
                  if (isNewEventCreation) {
                    if (stepId === WIZARD_STEPS.BASIC_INFO) {
                      navigateToStep(stepId);
                    }
                  } else {
                    navigateToStep(stepId);
                  }
                }}
                orientation="vertical"
              />
              
              <div className="space-y-2 pt-6">
                {areAllStepsCompleted && (
                  <Button 
                    className="w-full flex items-center gap-2"
                    onClick={finishWizard}
                  >
                    <Check className="h-4 w-4" />
                    Finish Setup
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setLocation(`/dashboard`)}
                >
                  {isNewEventCreation ? "Cancel Creation" : "Back to Dashboard"}
                </Button>
                
                {!isNewEventCreation && (
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    onClick={() => setLocation(`/events/${eventId}/settings`)}
                  >
                    Close Wizard
                  </Button>
                )}
              </div>
            </div>
            
            {/* Right content area */}
            <div className="md:col-span-3">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">
                    {steps.find(step => step.id === activeStep)?.label}
                  </h2>
                  <Separator />
                </div>
                
                {/* Step content */}
                <div className="min-h-[50vh]">
                  {renderStepContent()}
                </div>
                
                {/* Navigation buttons */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={goToPreviousStep}
                    disabled={activeStep === steps[0].id}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <Button
                    onClick={goToNextStep}
                    disabled={activeStep === steps[steps.length - 1].id}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
        </DeploymentErrorBoundary>
      </DashboardLayout>
    </EventManagerRoute>
  );
}