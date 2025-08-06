import React, { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { CORE_PERMISSIONS } from "@/hooks/use-permissions";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { post, get, put } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { 
  Settings2, 
  Mail, 
  MessageSquare, 
  Users, 
  Calendar,
  Shield,
  Globe,
  Database,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Palette,
  Server,
  Key,
  Eye,
  EyeOff
} from "lucide-react";

// Validation schemas
const eventSettingsSchema = z.object({
  rsvpDeadline: z.string().optional(),
  allowPlusOnes: z.boolean(),
  allowChildrenDetails: z.boolean(),
  customRsvpUrl: z.string().optional(),
  rsvpWelcomeTitle: z.string().optional(),
  rsvpWelcomeMessage: z.string().optional(),
  rsvpCustomBranding: z.string().optional(),
  rsvpShowSelectAll: z.boolean(),
  accommodationMode: z.enum(['none', 'all', 'selected', 'special_deal']),
  transportMode: z.enum(['none', 'all', 'selected']).optional(),
});

const emailSettingsSchema = z.object({
  emailProvider: z.enum(['resend', 'sendgrid', 'smtp', 'gmail']),
  emailFromAddress: z.string().email(),
  emailApiKey: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUsername: z.string().optional(),
  smtpPassword: z.string().optional(),
});

const communicationSettingsSchema = z.object({
  whatsappBusinessPhoneId: z.string().optional(),
  whatsappBusinessNumber: z.string().optional(),
  whatsappAccessToken: z.string().optional(),
});

type EventSettingsForm = z.infer<typeof eventSettingsSchema>;
type EmailSettingsForm = z.infer<typeof emailSettingsSchema>;
type CommunicationSettingsForm = z.infer<typeof communicationSettingsSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("event");
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEventId } = useCurrentEvent();

  // Get current event ID
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });
  
  const eventId = currentEventId || events?.[0]?.id || 1;

  // Fetch event settings
  const { data: eventSettings, isLoading: isLoadingEventSettings } = useQuery<any>({
    queryKey: [`/api/events/${eventId}/settings`],
    enabled: !!eventId,
  });

  // Fetch system info
  const { data: systemInfo } = useQuery<any>({
    queryKey: ['/api/system/info'],
  });

  // Fetch system health
  const { data: systemHealth } = useQuery<any>({
    queryKey: ['/api/system/health'],
  });

  // Forms
  const eventForm = useForm<EventSettingsForm>({
    resolver: zodResolver(eventSettingsSchema),
    defaultValues: {
      allowPlusOnes: true,
      allowChildrenDetails: true,
      rsvpShowSelectAll: true,
      accommodationMode: 'none',
      transportMode: 'none',
    },
  });

  const emailForm = useForm<EmailSettingsForm>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      emailProvider: 'resend',
      emailFromAddress: '',
    },
  });

  const communicationForm = useForm<CommunicationSettingsForm>({
    resolver: zodResolver(communicationSettingsSchema),
    defaultValues: {},
  });

  // Update forms when data loads
  React.useEffect(() => {
    if (eventSettings) {
      eventForm.reset({
        rsvpDeadline: eventSettings.rsvpDeadline || '',
        allowPlusOnes: eventSettings.allowPlusOnes ?? true,
        allowChildrenDetails: eventSettings.allowChildrenDetails ?? true,
        customRsvpUrl: eventSettings.customRsvpUrl || '',
        rsvpWelcomeTitle: eventSettings.rsvpWelcomeTitle || '',
        rsvpWelcomeMessage: eventSettings.rsvpWelcomeMessage || '',
        rsvpCustomBranding: eventSettings.rsvpCustomBranding || '',
        rsvpShowSelectAll: eventSettings.rsvpShowSelectAll ?? true,
        accommodationMode: eventSettings.accommodationMode || 'none',
        transportMode: eventSettings.transportMode || 'none',
      });
    }
  }, [eventSettings, eventForm]);

  // Mutations
  const updateEventSettingsMutation = useMutation({
    mutationFn: async (data: EventSettingsForm) => {
      return await put(`/api/events/${eventId}/settings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Event settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/settings`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event settings.",
        variant: "destructive",
      });
    },
  });

  const updateEmailSettingsMutation = useMutation({
    mutationFn: async (data: EmailSettingsForm) => {
      return await put(`/api/events/${eventId}/email-settings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Email Settings Updated",
        description: "Email configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/settings`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email settings.",
        variant: "destructive",
      });
    },
  });

  const updateCommunicationSettingsMutation = useMutation({
    mutationFn: async (data: CommunicationSettingsForm) => {
      return await put(`/api/events/${eventId}/communication-settings`, data);
    },
    onSuccess: () => {
      toast({
        title: "Communication Settings Updated",
        description: "WhatsApp configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/settings`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update communication settings.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleEventSettingsSubmit = (data: EventSettingsForm) => {
    updateEventSettingsMutation.mutate(data);
  };

  const handleEmailSettingsSubmit = (data: EmailSettingsForm) => {
    updateEmailSettingsMutation.mutate(data);
  };

  const handleCommunicationSettingsSubmit = (data: CommunicationSettingsForm) => {
    updateCommunicationSettingsMutation.mutate(data);
  };

  const testEmailConnection = async () => {
    try {
      await post(`/api/events/${eventId}/test-email`, {});
      toast({
        title: "Email Test Successful",
        description: "Email configuration is working correctly.",
      });
    } catch (error: any) {
      toast({
        title: "Email Test Failed",
        description: error.message || "Failed to send test email.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingEventSettings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredPermission={[CORE_PERMISSIONS.EVENT_UPDATE, CORE_PERMISSIONS.EVENT_MANAGE]}>
      <DashboardLayout>
        <div className="mb-6">
          <h2 className="text-3xl font-playfair font-bold text-neutral">Settings</h2>
          <p className="text-sm text-gray-500">
            Manage application settings and preferences
          </p>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-4xl">
          <TabsTrigger value="event">
            <Calendar className="mr-2 h-4 w-4" /> Event
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="communication">
            <MessageSquare className="mr-2 h-4 w-4" /> Communication
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server className="mr-2 h-4 w-4" /> System
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="event">
          <Card>
            <CardHeader>
              <CardTitle>Event Settings</CardTitle>
              <CardDescription>Configure RSVP and event-specific settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...eventForm}>
                <form onSubmit={eventForm.handleSubmit(handleEventSettingsSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* RSVP Settings */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium font-playfair">RSVP Configuration</h3>
                      
                      <FormField
                        control={eventForm.control}
                        name="rsvpDeadline"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RSVP Deadline</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormDescription>
                              Last date guests can submit their RSVP
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={eventForm.control}
                        name="allowPlusOnes"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Allow Plus Ones</FormLabel>
                              <FormDescription>
                                Allow guests to bring a plus one
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
                        control={eventForm.control}
                        name="allowChildrenDetails"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Children Details</FormLabel>
                              <FormDescription>
                                Collect details about children attending
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
                        control={eventForm.control}
                        name="rsvpShowSelectAll"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Show "Select All" Button</FormLabel>
                              <FormDescription>
                                Show select all ceremonies button in RSVP
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

                    {/* Branding & Customization */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium font-playfair">Branding & Customization</h3>
                      
                      <FormField
                        control={eventForm.control}
                        name="rsvpWelcomeTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RSVP Welcome Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Welcome to our wedding!" {...field} />
                            </FormControl>
                            <FormDescription>
                              Custom title shown on RSVP page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={eventForm.control}
                        name="rsvpWelcomeMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RSVP Welcome Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="We're excited to celebrate with you..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Custom message shown on RSVP page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={eventForm.control}
                        name="customRsvpUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom RSVP URL</FormLabel>
                            <FormControl>
                              <Input placeholder="our-wedding-2024" {...field} />
                            </FormControl>
                            <FormDescription>
                              Custom URL slug for your RSVP page
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={eventForm.control}
                        name="accommodationMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Accommodation Mode</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select accommodation mode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">No Accommodation</SelectItem>
                                <SelectItem value="all">All Guests</SelectItem>
                                <SelectItem value="selected">Selected Guests</SelectItem>
                                <SelectItem value="special_deal">Special Deal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              How accommodation requests are handled
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateEventSettingsMutation.isPending}
                    className="gold-gradient"
                  >
                    {updateEventSettingsMutation.isPending ? "Saving..." : "Save Event Settings"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Email Configuration</span>
                <div className="flex items-center space-x-2">
                  {eventSettings?.emailConfigured ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription>Configure email provider and settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(handleEmailSettingsSubmit)} className="space-y-6">
                  <FormField
                    control={emailForm.control}
                    name="emailProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Provider</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select email provider" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="resend">Resend</SelectItem>
                            <SelectItem value="sendgrid">SendGrid</SelectItem>
                            <SelectItem value="smtp">SMTP</SelectItem>
                            <SelectItem value="gmail">Gmail</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={emailForm.control}
                    name="emailFromAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="noreply@yourwedding.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Email address that invitations will be sent from
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {emailForm.watch("emailProvider") === "sendgrid" && (
                    <FormField
                      control={emailForm.control}
                      name="emailApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SendGrid API Key</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showEmailPassword ? "text" : "password"}
                                placeholder="SG...." 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowEmailPassword(!showEmailPassword)}
                              >
                                {showEmailPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {emailForm.watch("emailProvider") === "smtp" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={emailForm.control}
                        name="smtpHost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Host</FormLabel>
                            <FormControl>
                              <Input placeholder="smtp.gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={emailForm.control}
                        name="smtpPort"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Port</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="587" 
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={emailForm.control}
                        name="smtpUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Username</FormLabel>
                            <FormControl>
                              <Input placeholder="your-email@gmail.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={emailForm.control}
                        name="smtpPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SMTP Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showEmailPassword ? "text" : "password"}
                                  placeholder="app-password" 
                                  {...field} 
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                                >
                                  {showEmailPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button 
                      type="submit" 
                      disabled={updateEmailSettingsMutation.isPending}
                      className="gold-gradient"
                    >
                      {updateEmailSettingsMutation.isPending ? "Saving..." : "Save Email Settings"}
                    </Button>
                    
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={testEmailConnection}
                    >
                      Test Email
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>WhatsApp Configuration</span>
                <div className="flex items-center space-x-2">
                  {eventSettings?.whatsappConfigured ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription>Configure WhatsApp Business API integration</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...communicationForm}>
                <form onSubmit={communicationForm.handleSubmit(handleCommunicationSettingsSubmit)} className="space-y-6">
                  <FormField
                    control={communicationForm.control}
                    name="whatsappBusinessPhoneId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Business Phone ID</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789012345" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your WhatsApp Business phone number ID from Meta
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communicationForm.control}
                    name="whatsappBusinessNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Business Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormDescription>
                          Your WhatsApp Business phone number with country code
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={communicationForm.control}
                    name="whatsappAccessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Access Token</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type={showWhatsAppToken ? "text" : "password"}
                              placeholder="EAAG..." 
                              {...field} 
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                            >
                              {showWhatsAppToken ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Access token from Meta for WhatsApp Business API
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={updateCommunicationSettingsMutation.isPending}
                    className="gold-gradient"
                  >
                    {updateCommunicationSettingsMutation.isPending ? "Saving..." : "Save WhatsApp Settings"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5" />
                  System Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemInfo && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Version</Label>
                        <p className="text-sm text-muted-foreground">{systemInfo.version}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Environment</Label>
                        <p className="text-sm text-muted-foreground">{systemInfo.environment}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Total Users</Label>
                        <p className="text-sm text-muted-foreground">{systemInfo.users?.length || 0}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Total Events</Label>
                        <p className="text-sm text-muted-foreground">{systemInfo.events?.length || 0}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemHealth && (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className={`h-3 w-3 rounded-full ${
                        systemHealth.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">{systemHealth.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Uptime</Label>
                        <p className="text-sm text-muted-foreground">
                          {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Memory Usage</Label>
                        <p className="text-sm text-muted-foreground">
                          {Math.round(systemHealth.memory?.used / 1024 / 1024)}MB
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Manage security and access control settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Authentication Status</h3>
                  {systemInfo?.authentication?.isAuthenticated ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Authenticated as {systemInfo.authentication.user?.username}</span>
                      <Badge variant="secondary">{systemInfo.authentication.user?.role}</Badge>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Not authenticated</span>
                    </div>
                  )}
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Security Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">CSRF Protection</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">JWT Authentication</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Role-Based Access Control</span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Enabled
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-center py-6 border rounded-lg bg-muted/50">
                  <Key className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">Advanced Security Settings</h3>
                  <p className="text-muted-foreground mb-4">
                    Advanced security configuration available for administrators
                  </p>
                  <Button variant="outline" disabled>
                    Contact Administrator
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </DashboardLayout>
    </ProtectedRoute>
  );
}