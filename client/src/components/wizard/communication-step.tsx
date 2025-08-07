import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { WeddingEvent } from "@shared/schema";
import { 
  Check, 
  Mail, 
  MessageSquare, 
  Edit, 
  Plus, 
  Eye, 
  Clock, 
  AlertCircle, 
  CheckCircle,
  Trash,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Settings,
  FileText,
  Wifi,
  WifiOff,
  Upload,
  Image,
  Palette,
  Type,
  Layout,
  Smartphone,
  Monitor,
  Copy,
  Zap,
  Calendar,
  MapPin,
  Plane,
  Hotel,
  Users,
  MessageCircle,
  ThumbsUp,
  Bell,
  Heart,
  TestTube,
  Activity,
  Layers,
  TrendingUp,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { post } from "@/lib/api-utils";
import OAuthConfiguration from "@/components/settings/oauth-configuration";
import QRCode from 'react-qr-code';

interface CommunicationStepProps {
  eventId: string;
  currentEvent: WeddingEvent | undefined;
  onComplete: (data: any) => void;
  isCompleted: boolean;
}

// Enhanced screen navigation with inheritance view
type CommunicationScreen = 'overview' | 'providers' | 'templates' | 'assets' | 'testing' | 'signatures';

// Enhanced provider interfaces for unified system
interface UnifiedProviderStatus {
  id: string;
  providerType: 'email' | 'sms' | 'whatsapp';
  providerName: string;
  isActive: boolean;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  isTenantDefault: boolean;
  isEventOverride: boolean;
  lastHealthCheck?: string;
  testResults?: {
    success: boolean;
    latency?: number;
    errorMessage?: string;
  };
}

interface InheritanceInfo {
  tenantDefaults: UnifiedProviderStatus[];
  eventOverrides: UnifiedProviderStatus[];
  resolved: UnifiedProviderStatus[];
}

interface ProviderStatus {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp';
  icon: React.ReactNode;
  connected: boolean;
  description: string;
  color: string;
}

interface BrandAsset {
  id: string;
  name: string;
  type: string;
  url?: string;
}

interface Template {
  id: string;
  name: string;
  content?: string;
  subject?: string;
  type?: string;
  channel?: string;
  [key: string]: any;
}

interface TemplateInheritance {
  platformTemplates: any[];
  tenantTemplates: any[];
  eventTemplates: any[];
  resolved: any;
}

// Template category interface with RSVP flow sequencing
interface TemplateCategory {
  id: string;
  categoryId?: string;
  name: string;
  description?: string;
  sequence?: number;
  icon?: React.ReactNode;
  color?: string;
  templates: Template[];
}

interface TemplateVariant {
  id: string;
  channel: 'email' | 'sms' | 'whatsapp';
  subject?: string;
  content: string;
  enabled: boolean;
}

export default function CommunicationStep({
  eventId,
  currentEvent,
  onComplete,
  isCompleted
}: CommunicationStepProps) {
  const [currentScreen, setCurrentScreen] = useState<CommunicationScreen>('overview');
  const [isEditing, setIsEditing] = useState(!isCompleted);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['initial_invitations']);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [showInheritanceDetails, setShowInheritanceDetails] = useState(false);
  const { toast } = useToast();

  // Handle template preview
  const handleTemplatePreview = (template: any) => {
    setSelectedTemplate(template);
    setTemplateDialogOpen(true);
  };

  // Handle template editing (creates event-specific copy if global)
  const handleTemplateEdit = async (template: any) => {
    try {
      if (!template.eventId) {
        // This is a global template, create event-specific copy for editing
        const response = await fetch(`/api/events/${eventId}/communication-templates/customize/${template.id}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject: template.subject,
            content: template.content
          })
        });

        if (response.ok) {
          // Refresh templates to show the new event-specific version
          queryClient.invalidateQueries({ queryKey: ['communication-templates', eventId] });
          toast({
            title: "Template Customized",
            description: "Template is now customized for this event",
          });
        }
      } else {
        // This is already an event-specific template, can edit directly
        toast({
          title: "Edit Template",
          description: "Template editing interface coming soon",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to customize template",
        variant: "destructive",
      });
    }
  };

  // WhatsApp QR Code handler following official WhatsApp Web.js documentation
  const handleWhatsAppWebJSConnection = async () => {
    try {

      setQrDialogOpen(true);
      setQrCodeData(null);
      
      const response = await fetch(`/api/events/${eventId}/communication/whatsapp-webjs/qr`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();

      
      if (result.qrCode) {

        setQrCodeData(result.qrCode);
        toast({
          title: "QR Code Generated",
          description: "Scan with your WhatsApp app to connect",
        });
      } else if (result.connected) {
        toast({
          title: "Already Connected",
          description: "WhatsApp is already connected for this event",
        });
        setQrDialogOpen(false);
      } else if (result.error === 'timeout') {

        toast({
          title: "QR Code Timeout",
          description: "QR code generation took too long. Please try again.",
          variant: "destructive",
        });
        setQrDialogOpen(false);
      } else {

        toast({
          title: "Generating QR Code",
          description: result.message || "Please wait while QR code is generated",
        });
        
        // The backend now handles retries automatically, but we can still poll once more
        const timeoutId = setTimeout(async () => {
          try {
            const retryResponse = await fetch(`/api/events/${eventId}/communication/whatsapp-webjs/qr`, {
              method: 'GET',
              credentials: 'include'
            });
            const retryResult = await retryResponse.json();

            if (retryResult.qrCode) {
              setQrCodeData(retryResult.qrCode);
            } else {
              toast({
                title: "QR Code Not Available",
                description: "Please refresh and try again.",
                variant: "destructive",
              });
              setQrDialogOpen(false);
            }
          } catch (error) {
            setQrDialogOpen(false);
          }
        }, 2000);
        
        // Cleanup timeout on component unmount
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {

      toast({
        title: "QR Code Error",
        description: "Failed to generate QR code. Please try again.",
        variant: "destructive",
      });
      setQrDialogOpen(false);
    }
  }

  // Fetch legacy templates for backward compatibility
  const { data: legacyTemplatesData, isLoading: legacyTemplatesLoading, error: legacyTemplatesError } = useQuery({
    queryKey: ['legacy-communication-templates', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/communication-templates`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!eventId
  });

  // Fetch unified provider status with inheritance information
  const providersQuery = useQuery({
    queryKey: ['unified-communication-providers', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/communication/providers?eventId=${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch provider status');
      return response.json();
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  const { data: providersData, isLoading: providersLoading } = providersQuery;

  // Fetch unified template configuration with inheritance
  const templatesQuery = useQuery({
    queryKey: ['unified-communication-templates', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/v2/communication/templates?eventId=${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch template configuration');
      return response.json();
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const { data: unifiedTemplatesData, isLoading: unifiedTemplatesLoading } = templatesQuery;

  // Real-time provider testing with unified API
  const testProviderMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const response = await fetch(`/api/v2/communication/providers/${providerId}/test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Provider test failed');
      return response.json();
    },
    onMutate: (providerId) => {
      setTestingProvider(providerId);
    },
    onSuccess: (data, providerId) => {
      setTestingProvider(null);
      queryClient.invalidateQueries({ queryKey: ['unified-communication-providers', eventId] });
      toast({
        title: "Provider Test Complete",
        description: data.success 
          ? `Test successful! Latency: ${data.latency}ms`
          : `Test failed: ${data.errorMessage}`,
        variant: data.success ? "default" : "destructive"
      });
    },
    onError: (error, providerId) => {
      setTestingProvider(null);
      toast({
        title: "Provider Test Failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    }
  });

  // Handle provider testing
  const handleProviderTest = (providerId: string) => {
    testProviderMutation.mutate(providerId);
  };

  // Provider connection handlers (kept for backward compatibility)
  const handleProviderConnection = (providerId: string) => {

    switch (providerId) {
      case 'gmail':
        window.open(`/api/oauth/gmail/auth?eventId=${eventId}`, '_blank', 'width=500,height=600');
        break;
      case 'outlook':
        window.open(`/api/oauth/outlook/auth?eventId=${eventId}`, '_blank', 'width=500,height=600');
        break;
      case 'brevo':
        handleBrevoConnection();
        break;
      case 'twilio':
        handleTwilioConnection();
        break;
      case 'whatsapp_business':
        handleWhatsAppBusinessConnection();
        break;
      case 'whatsapp_webjs':

        handleWhatsAppWebJSConnection(); // Direct QR code generation
        break;
      default:
        toast({
          title: "Not Implemented",
          description: `${providerId} connection is not yet implemented`,
          variant: "destructive",
        });
    }
  };

  // Handler for Brevo connection
  const handleBrevoConnection = () => {
    const apiKey = prompt('Enter your Brevo API Key (or type "USE_ENV_KEY" to use demo key):');
    if (!apiKey) return;

    post(`/api/events/${eventId}/communication/brevo`, { apiKey })
      .then(() => {
        providersQuery.refetch();
        toast({
          title: "Brevo Connected",
          description: "Brevo email service connected successfully",
        });
      })
      .catch((error) => {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect Brevo",
          variant: "destructive",
        });
      });
  };

  // Handler for Twilio connection
  const handleTwilioConnection = () => {
    const accountSid = prompt('Enter your Twilio Account SID:');
    if (!accountSid) return;
    
    const authToken = prompt('Enter your Twilio Auth Token:');
    if (!authToken) return;
    
    const phoneNumber = prompt('Enter your Twilio Phone Number (e.g., +1234567890):');
    if (!phoneNumber) return;

    post(`/api/events/${eventId}/communication/twilio`, {
      accountSid,
      authToken,
      phoneNumber
    })
      .then(() => {
        providersQuery.refetch();
        toast({
          title: "Twilio Connected",
          description: "Twilio SMS service connected successfully",
        });
      })
      .catch((error) => {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect Twilio",
          variant: "destructive",
        });
      });
  };

  // Handler for WhatsApp Business API connection
  const handleWhatsAppBusinessConnection = () => {
    const accessToken = prompt('Enter your WhatsApp Business API Access Token:');
    if (!accessToken) return;
    
    const phoneNumberId = prompt('Enter your WhatsApp Phone Number ID:');
    if (!phoneNumberId) return;
    
    const businessAccountId = prompt('Enter your WhatsApp Business Account ID:');
    if (!businessAccountId) return;

    post(`/api/events/${eventId}/communication/whatsapp-business`, {
      accessToken,
      phoneNumberId,
      businessAccountId
    })
      .then(() => {
        providersQuery.refetch();
        toast({
          title: "WhatsApp Business Connected",
          description: "WhatsApp Business API connected successfully",
        });
      })
      .catch((error) => {
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to connect WhatsApp Business API",
          variant: "destructive",
        });
      });
  };



  // Handler for provider disconnection
  const handleProviderDisconnection = (providerId: string) => {
    const providerName = providers.find(p => p.id === providerId)?.name || providerId;
    
    if (confirm(`Are you sure you want to disconnect ${providerName}? You'll need to reconnect to use this service.`)) {
      post(`/api/events/${eventId}/communication/${providerId}/disconnect`, {})
        .then(() => {
          providersQuery.refetch();
          toast({
            title: "Provider Disconnected",
            description: `${providerName} has been disconnected successfully`,
          });
        })
        .catch((error) => {
          toast({
            title: "Disconnection Failed",
            description: error.message || `Failed to disconnect ${providerName}`,
            variant: "destructive",
          });
        });
    }
  };



  // Transform database templates into accordion format
  const formatTemplatesForAccordion = (rawTemplates: Record<string, any>) => {
    if (!rawTemplates) return [];

    const categoryMeta = {
      'initial_invitations': { 
        name: '01. Save the Date Announcements', 
        description: 'First touchpoint - announcing your wedding dates',
        sequence: 1,
        icon: <Calendar className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'formal_invitations': { 
        name: '02. Formal RSVP Invitations', 
        description: 'Official invitations with RSVP links for attendance confirmation',
        sequence: 2,
        icon: <Mail className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'rsvp_followups': { 
        name: '03. RSVP Follow-ups & Reminders', 
        description: 'Gentle reminders for guests who haven\'t responded yet',
        sequence: 3,
        icon: <Bell className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'stage2_collection': { 
        name: '04. Stage 2 Details Collection', 
        description: 'Collect accommodation, travel, and meal preferences',
        sequence: 4,
        icon: <Users className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'accommodation_information': { 
        name: '05. Accommodation Assignments', 
        description: 'Hotel booking instructions and room assignments',
        sequence: 5,
        icon: <Hotel className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'travel_transportation': { 
        name: '06. Travel Coordination', 
        description: 'Flight coordination and transport arrangements',
        sequence: 6,
        icon: <Plane className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'ceremony_information': { 
        name: '07. Ceremony Information', 
        description: 'Detailed schedules, venue information, and final preparations',
        sequence: 7,
        icon: <MapPin className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'confirmations_thankyou': { 
        name: '08. Confirmations & Thank You', 
        description: 'RSVP confirmations and booking thank you messages',
        sequence: 8,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'prewedding_updates': { 
        name: '09. Pre-Wedding Updates', 
        description: 'Final details, weather updates, and last-minute information',
        sequence: 9,
        icon: <Clock className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'postwedding_thankyou': { 
        name: '10. Post-Wedding Communications', 
        description: 'Thank you messages and photo sharing',
        sequence: 10,
        icon: <Heart className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      }
    };

    return Object.entries(rawTemplates)
      .map(([categoryId, templates]: [string, any]) => ({
        id: categoryId,
        ...(categoryMeta[categoryId as keyof typeof categoryMeta] || {
          name: categoryId.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); }),
          description: 'Template category',
          sequence: 99,
          icon: <FileText className="h-4 w-4" />,
          color: 'border-l-gray-500 hover:bg-card/80'
        }),
        templates: Array.isArray(templates) ? templates.map((template: Template) => ({
          id: template.id,
          channel: template.channel,
          subject: template.subject,
          content: template.content,
          enabled: template.enabled !== false
        })) : []
      }))
      .sort((a, b) => a.sequence - b.sequence);
  };

  // Provider configuration data with enhanced account information
  const providers: ProviderStatus[] = [
    {
      id: 'brevo',
      name: 'Brevo (Sendinblue)',
      type: 'email',
      icon: <Mail className="h-5 w-5" />,
      connected: (providersData?.brevo?.connected) || false,
      description: providersData?.brevo?.account ? 
        `Connected: ${providersData.brevo.account}${providersData.brevo.usingDemo ? ' (Demo)' : ''}` : 
        'Professional email delivery service',
      color: 'text-blue-500'
    },
    {
      id: 'gmail',
      name: 'Gmail',
      type: 'email',
      icon: <Mail className="h-5 w-5" />,
      connected: (providersData?.gmail?.connected) || false,
      description: providersData?.gmail?.account ? 
        `Connected: ${providersData.gmail.account}` : 
        'Google OAuth integration',
      color: 'text-red-500'
    },
    {
      id: 'outlook',
      name: 'Outlook',
      type: 'email',
      icon: <Mail className="h-5 w-5" />,
      connected: (providersData?.outlook?.connected) || false,
      description: providersData?.outlook?.account ? 
        `Connected: ${providersData.outlook.account}` : 
        'Microsoft Graph API',
      color: 'text-blue-600'
    },
    {
      id: 'twilio',
      name: 'Twilio SMS',
      type: 'sms',
      icon: <MessageSquare className="h-5 w-5" />,
      connected: (providersData?.twilio?.connected) || false,
      description: providersData?.twilio?.account ? 
        `Connected: ${providersData.twilio.account}` : 
        'SMS messaging service',
      color: 'text-purple-500'
    },
    {
      id: 'whatsapp_business',
      name: 'WhatsApp Business API',
      type: 'whatsapp',
      icon: <MessageSquare className="h-5 w-5" />,
      connected: (providersData?.whatsapp_business?.connected) || false,
      description: providersData?.whatsapp_business?.account ? 
        `Connected: ${providersData.whatsapp_business.account}` : 
        'Official WhatsApp Business API',
      color: 'text-green-600'
    },
    {
      id: 'whatsapp_webjs',
      name: 'WhatsApp Web.js',
      type: 'whatsapp',
      icon: <MessageSquare className="h-5 w-5" />,
      connected: (providersData?.whatsapp_webjs?.connected) || false,
      description: providersData?.whatsapp_webjs?.error ? 
        `Error: ${providersData.whatsapp_webjs.error}` : 
        (providersData?.whatsapp_webjs?.configured ? 
          'WhatsApp Web integration configured' : 
          'WhatsApp Web integration'),
      color: 'text-green-500'
    }
  ];

  // Process templates for accordion display with unified data
  const formattedTemplateCategories = formatTemplatesForAccordion(legacyTemplatesData);
  
  // Helper function to process unified templates data with inheritance information
  const processTemplatesData = (rawData: Record<string, any>) => {
    if (!rawData) return [];
    
    const categoryMeta = {
      'initial_invitations': { 
        name: '01. Save the Date Announcements', 
        description: 'First touchpoint - announcing your wedding dates',
        sequence: 1,
        icon: <Calendar className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'formal_invitations': { 
        name: '02. Formal RSVP Invitations', 
        description: 'Official invitations with RSVP links for attendance confirmation',
        sequence: 2,
        icon: <Mail className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'rsvp_followups': { 
        name: '03. RSVP Follow-ups & Reminders', 
        description: 'Gentle reminders for guests who haven\'t responded yet',
        sequence: 3,
        icon: <Bell className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'stage2_collection': { 
        name: '04. Stage 2 Details Collection', 
        description: 'Collect accommodation, travel, and meal preferences',
        sequence: 4,
        icon: <Users className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'accommodation_information': { 
        name: '05. Accommodation Assignments', 
        description: 'Hotel booking instructions and room assignments',
        sequence: 5,
        icon: <Hotel className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'travel_transportation': { 
        name: '06. Travel Coordination', 
        description: 'Flight coordination and transport arrangements',
        sequence: 6,
        icon: <Plane className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'ceremony_information': { 
        name: '07. Ceremony Information', 
        description: 'Detailed schedules, venue information, and final preparations',
        sequence: 7,
        icon: <MapPin className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'confirmations_thankyou': { 
        name: '08. Confirmations & Thank You', 
        description: 'RSVP confirmations and booking thank you messages',
        sequence: 8,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'prewedding_updates': { 
        name: '09. Pre-Wedding Updates', 
        description: 'Final details, weather updates, and last-minute information',
        sequence: 9,
        icon: <Clock className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      },
      'postwedding_thankyou': { 
        name: '10. Post-Wedding Communications', 
        description: 'Thank you messages and photo sharing',
        sequence: 10,
        icon: <Heart className="h-4 w-4" />,
        color: 'border-l-purple-500 hover:bg-card/80'
      }
    };

    return Object.entries(rawData)
      .map(([categoryId, templates]: [string, any]) => ({
        id: categoryId,
        ...(categoryMeta[categoryId as keyof typeof categoryMeta] || {
          name: categoryId.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); }),
          description: 'Template category',
          sequence: 99,
          icon: <FileText className="h-4 w-4" />,
          color: 'border-l-gray-500 hover:bg-card/80'
        }),
        templates: Array.isArray(templates) ? templates.map((template: Template) => ({
          id: template.id,
          channel: template.channel,
          subject: template.subject,
          content: template.content,
          enabled: template.enabled !== false,
          isInherited: template.eventId ? false : true,
          source: template.eventId ? 'Event Custom' : 'Platform/Tenant Default'
        })) : []
      }))
      .sort((a, b) => a.sequence - b.sequence);
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // All templates now loaded from database - no hardcoded content

  const handleComplete = async () => {
    try {
      const communicationData = {
        providersConfigured: providersData ? providersData.filter((p: any) => p.connected).length : 0,
        templatesEnabled: formattedTemplateCategories ? formattedTemplateCategories.reduce((count: number, cat: any) => 
          count + cat.templates.filter((t: any) => t.enabled).length, 0
        ) : 0
      };

      onComplete(communicationData);
      setIsEditing(false);
      
      toast({
        title: "Communication Settings Saved",
        description: "Your communication preferences have been configured successfully.",
      });
    } catch (error) {
      toast({
        title: "Error Saving Settings",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  // Show completed state
  if (!isEditing && isCompleted) {
    const connectedProviders = providersData ? providersData.filter((p: any) => p.connected) : [];
    const totalTemplates = formattedTemplateCategories ? formattedTemplateCategories.reduce((count: number, cat: any) => 
      count + cat.templates.filter((t: any) => t.enabled).length, 0
    ) : 0;

    return (
      <div className="space-y-6">
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-900">Communication Configured</h3>
              <p className="text-sm text-green-700">Ready to send messages to your guests</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">{connectedProviders.length}</div>
              <div className="text-sm text-green-700">Connected Providers</div>
            </div>
            <div className="bg-white/50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">{totalTemplates}</div>
              <div className="text-sm text-green-700">Active Templates</div>
            </div>
          </div>
        </div>
        
        <Button type="button" onClick={() => setIsEditing(true)} variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Edit Communication Settings
        </Button>
      </div>
    );
  }

  // Helper function to render providers screen
  const renderProvidersContent = () => {
    const emailProviders = providers.filter(p => p.type === 'email');
    const smsProviders = providers.filter(p => p.type === 'sms');
    const whatsappProviders = providers.filter(p => p.type === 'whatsapp');
    


    return (
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Communication Providers</h3>
            <p className="text-sm text-muted-foreground">Connect your messaging services</p>
          </div>
          <Button 
            onClick={() => setCurrentScreen('templates')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Manage Templates
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Email Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Email Providers
            </CardTitle>
            <CardDescription>
              Configure email services for sending invitations and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {emailProviders.map((provider: ProviderStatus) => (
              <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={provider.color}>
                    {provider.icon}
                  </div>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">{provider.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {provider.connected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                  {provider.connected ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderConnection(provider.id)}
                      >
                        Reconfigure
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderDisconnection(provider.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleProviderConnection(provider.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SMS Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              SMS Providers
            </CardTitle>
            <CardDescription>
              Set up SMS services for text notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {smsProviders.map((provider: ProviderStatus) => (
              <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={provider.color}>
                    {provider.icon}
                  </div>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">{provider.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {provider.connected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                  {provider.connected ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderConnection(provider.id)}
                      >
                        Reconfigure
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderDisconnection(provider.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleProviderConnection(provider.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* WhatsApp Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              WhatsApp Providers
            </CardTitle>
            <CardDescription>
              Connect WhatsApp for instant messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {whatsappProviders.map((provider: ProviderStatus) => (
              <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={provider.color}>
                    {provider.icon}
                  </div>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">{provider.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {provider.connected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                  {provider.connected ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderConnection(provider.id)}
                      >
                        Reconfigure
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderDisconnection(provider.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleProviderConnection(provider.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Bottom Action */}
        <div className="flex items-center justify-end pt-6 border-t">
          <Button onClick={handleComplete} className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Save Communication Settings
          </Button>
        </div>
      </div>
    );
  };

  // Main component return with QR dialog always accessible
  return (
    <>
      {/* Current screen content */}
      {currentScreen === 'providers' && renderProvidersContent()}
      {currentScreen === 'templates' && renderTemplatesScreen()}
      {currentScreen === 'assets' && renderAssetsScreen()}
      {currentScreen === 'signatures' && renderSignaturesScreen()}
      
      {/* WhatsApp QR Code Dialog - Always accessible */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md z-50 bg-white border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Web.js Connection
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your WhatsApp app to connect your phone
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeData ? (
              <>
                <div className="bg-white p-4 rounded-lg border shadow-lg">
                  <QRCode 
                    value={qrCodeData} 
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Open WhatsApp on your phone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Go to Settings → Linked Devices
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Tap "Link a Device" and scan this code
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                <p className="text-muted-foreground">Generating QR code...</p>
                <p className="text-xs text-gray-500 mt-2">Waiting for WhatsApp service...</p>
              </div>
            )}
            <Button 
              onClick={() => {
                setQrDialogOpen(false);
                setQrCodeData(null);
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  // Fetch brand assets
  const { data: brandAssetsData, isLoading: brandAssetsLoading } = useQuery({
    queryKey: ['brand-assets', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/brand-assets`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch brand assets: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!eventId && currentScreen === 'assets'
  });

  // Helper function to render assets screen
  function renderAssetsScreen() {
    return (
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => setCurrentScreen('templates')}
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Button>
          <div className="text-center">
            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Brand Assets & Design
            </h3>
            <p className="text-sm text-muted-foreground">Upload logos, banners, and customize your wedding brand</p>
          </div>
          <div className="w-24"></div>
        </div>

        {/* Brand Assets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Logo Upload */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Image className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Wedding Logo</CardTitle>
              <CardDescription>Upload your custom wedding logo or monogram</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </Button>
            </CardContent>
          </Card>

          {/* Email Banner */}
          <Card className="border-2 border-dashed border-blue-200 hover:border-blue-300 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <Layout className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Email Banner</CardTitle>
              <CardDescription>Header image for your email templates</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Banner
              </Button>
            </CardContent>
          </Card>

          {/* WhatsApp Profile */}
          <Card className="border-2 border-dashed border-green-200 hover:border-green-300 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <MessageSquare className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">WhatsApp Profile</CardTitle>
              <CardDescription>Profile picture for WhatsApp communications</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Profile
              </Button>
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card className="border-2 border-dashed border-purple-200 hover:border-purple-300 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                <Palette className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Color Palette</CardTitle>
              <CardDescription>Define your wedding color scheme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Primary:</Label>
                <div className="w-8 h-8 rounded border bg-primary"></div>
                <Input type="color" defaultValue="#7A51E1" className="w-16 h-8 p-0 border-0" />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Accent:</Label>
                <div className="w-8 h-8 rounded border bg-amber-500"></div>
                <Input type="color" defaultValue="#F59E0B" className="w-16 h-8 p-0 border-0" />
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                <Type className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-lg">Typography</CardTitle>
              <CardDescription>Choose fonts for your communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Heading Font</Label>
                <select className="w-full mt-1 p-2 border rounded text-sm">
                  <option>Cormorant Garamond</option>
                  <option>Great Vibes</option>
                  <option>Inter</option>
                </select>
              </div>
              <div>
                <Label className="text-sm">Body Font</Label>
                <select className="w-full mt-1 p-2 border rounded text-sm">
                  <option>Inter</option>
                  <option>Open Sans</option>
                  <option>Lato</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Kit */}
          <Card className="border-2 border-dashed border-pink-200 hover:border-pink-300 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center mb-2">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <CardTitle className="text-lg">Social Media Kit</CardTitle>
              <CardDescription>Images for social media sharing</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Upload Kit
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Template Preview Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                {selectedTemplate?.eventId ? 'Custom template for this event' : 'Global template (used across all events)'}
              </DialogDescription>
            </DialogHeader>
            {selectedTemplate && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <p className="text-sm bg-muted p-2 rounded">{selectedTemplate.subject || 'No subject'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Content</Label>
                  <div className="text-sm bg-muted p-4 rounded max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Badge variant={selectedTemplate.eventId ? "outline" : "secondary"}>
                    {selectedTemplate.eventId ? 'Custom' : 'Global'} Template
                  </Badge>
                  <div className="flex gap-2">
                    <Button onClick={() => setTemplateDialogOpen(false)} variant="outline">
                      Close
                    </Button>
                    <Button onClick={() => handleTemplateEdit(selectedTemplate)}>
                      {selectedTemplate.eventId ? 'Edit' : 'Customize for Event'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Current Assets */}
        {brandAssetsData && brandAssetsData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Assets</CardTitle>
              <CardDescription>Manage your uploaded brand assets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brandAssetsData.map((asset: BrandAsset) => (
                  <div key={asset.id} className="border rounded-lg p-4 text-center">
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-sm text-muted-foreground">{asset.type}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Helper function to render templates screen  
  function renderTemplatesScreen() {
    if (legacyTemplatesLoading) {
      return (
        <div className="space-y-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      );
    }

    if (legacyTemplatesError) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Templates</CardTitle>
              <CardDescription>{legacyTemplatesError.message}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    const categories = processTemplatesData(unifiedTemplatesData || {});

    return (
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => setCurrentScreen('providers')}
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Providers
          </Button>
          <div className="text-center">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Message Templates
            </h3>
            <p className="text-sm text-muted-foreground">Professional templates for every stage of your wedding</p>
          </div>
          <Button 
            onClick={() => setCurrentScreen('assets')}
            variant="outline"
            className="flex items-center gap-2"
          >
            Brand Assets
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Template Categories Accordion */}
        <div className="space-y-4">
          {categories.map((category) => (
            <Card key={category.id} className={`transition-all duration-200 ${category.color}`}>
              <Collapsible
                open={expandedCategories.includes(category.id)}
                onOpenChange={(open) => {
                  if (open) {
                    setExpandedCategories([...expandedCategories, category.id]);
                  } else {
                    setExpandedCategories(expandedCategories.filter(id => id !== category.id));
                  }
                }}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-card/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {category.icon}
                        <div>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                          <CardDescription>{category.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {category.templates.length} templates
                        </Badge>
                        {expandedCategories.includes(category.id) ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['email', 'whatsapp', 'sms'].map((channel) => {
                        const channelTemplates = category.templates.filter(t => t.channel === channel);
                        const channelConfig = {
                          email: { icon: <Mail className="h-4 w-4" />, color: 'border-blue-200', label: 'Email' },
                          whatsapp: { icon: <MessageSquare className="h-4 w-4" />, color: 'border-green-200', label: 'WhatsApp' },
                          sms: { icon: <Smartphone className="h-4 w-4" />, color: 'border-purple-200', label: 'SMS' }
                        }[channel];

                        return (
                          <Card key={channel} className={`${channelConfig?.color || ''} bg-card/30`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-center gap-2">
                                {channelConfig?.icon}
                                <CardTitle className="text-sm">{channelConfig?.label}</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-2">
                              {channelTemplates.length > 0 ? (
                                channelTemplates.map((template: Template) => (
                                  <div key={template.id} className="flex items-center justify-between p-2 rounded border bg-background/50">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {template.subject || 'Template'}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {template.content.substring(0, 50)}...
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleTemplatePreview(template)}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 w-6 p-0"
                                        onClick={() => handleTemplateEdit(template)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      {template.eventId ? (
                                        <Badge variant="outline" className="text-xs ml-1 px-1">
                                          Custom
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs ml-1 px-1">
                                          Global
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-xs text-muted-foreground italic text-center py-4">
                                  No {channelConfig.label.toLowerCase()} template available
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Helper function to render signatures screen
  function renderSignaturesScreen() {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Signatures</CardTitle>
            <CardDescription>Coming soon - Customize your email signatures</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Legacy Assets Screen (replaced above)
  if (currentScreen === 'assets') {
    return (
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={() => setCurrentScreen('templates')}
            variant="ghost"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Button>
          <div className="text-center">
            <h3 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Brand Assets & Design
            </h3>
            <p className="text-sm text-muted-foreground">Upload logos, banners, and customize your wedding brand</p>
          </div>
          <div className="w-24"></div>
        </div>

        {/* Professional Brand Assets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wedding Logo Upload */}
          <Card className="group border-2 border-dashed border-amber-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="h-20 w-20 mx-auto bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Image className="h-10 w-10 text-amber-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">Wedding Logo</CardTitle>
              <CardDescription className="text-sm text-gray-600">Upload your couple's logo or monogram for consistent branding</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <div className="text-sm font-medium text-amber-800 mb-2">Usage Areas</div>
                <div className="text-xs text-amber-700 space-y-1">
                  <div>✓ Email headers</div>
                  <div>✓ Digital invitations</div>
                  <div>✓ Social media posts</div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2 mx-auto hover:bg-amber-50 hover:border-amber-300">
                <Upload className="h-4 w-4" />
                Upload Logo Files
              </Button>
              <p className="text-xs text-muted-foreground">Formats: PNG, JPG, SVG • Recommended: 300x300px, transparent background</p>
            </CardContent>
          </Card>

          {/* Email Header Banner */}
          <Card className="group border-2 border-dashed border-blue-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="h-20 w-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Layout className="h-10 w-10 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">Email Header Banner</CardTitle>
              <CardDescription className="text-sm text-gray-600">Beautiful header image for professional email communications</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="text-sm font-medium text-blue-800 mb-2">Email Templates</div>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>✓ Formal invitations</div>
                  <div>✓ RSVP confirmations</div>
                  <div>✓ Travel details</div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2 mx-auto hover:bg-blue-50 hover:border-blue-300">
                <Upload className="h-4 w-4" />
                Upload Banner
              </Button>
              <p className="text-xs text-muted-foreground">Formats: JPG, PNG • Recommended: 600x200px, wedding theme colors</p>
            </CardContent>
          </Card>

          {/* WhatsApp Profile Picture */}
          <Card className="group border-2 border-dashed border-green-200 hover:border-green-400 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="h-20 w-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Smartphone className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">WhatsApp Profile</CardTitle>
              <CardDescription className="text-sm text-gray-600">Professional profile picture for WhatsApp Business communication</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="text-sm font-medium text-green-800 mb-2">WhatsApp Features</div>
                <div className="text-xs text-green-700 space-y-1">
                  <div>✓ Guest messaging</div>
                  <div>✓ Group coordination</div>
                  <div>✓ Quick updates</div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2 mx-auto hover:bg-green-50 hover:border-green-300">
                <Upload className="h-4 w-4" />
                Upload Profile Picture
              </Button>
              <p className="text-xs text-muted-foreground">Required: 640x640px square format, high resolution</p>
            </CardContent>
          </Card>

          {/* Social Media Kit */}
          <Card className="group border-2 border-dashed border-purple-200 hover:border-purple-400 hover:shadow-lg transition-all duration-300 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="h-20 w-20 mx-auto bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Monitor className="h-10 w-10 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-800">Social Media Kit</CardTitle>
              <CardDescription className="text-sm text-gray-600">Complete set of graphics for social media sharing and promotion</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="text-sm font-medium text-purple-800 mb-2">Platform Assets</div>
                <div className="text-xs text-purple-700 space-y-1">
                  <div>✓ Instagram stories</div>
                  <div>✓ Facebook posts</div>
                  <div>✓ Sharing graphics</div>
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2 mx-auto hover:bg-purple-50 hover:border-purple-300">
                <Upload className="h-4 w-4" />
                Upload Social Assets
              </Button>
              <p className="text-xs text-muted-foreground">Multiple formats: JPG, PNG, GIF • Various sizes supported</p>
            </CardContent>
          </Card>
        </div>

        {/* Color Palette & Typography */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-600" />
                Wedding Color Palette
              </CardTitle>
              <CardDescription>Define your wedding brand colors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full bg-amber-500 mx-auto mb-2 cursor-pointer hover:scale-105 transition-transform"></div>
                  <p className="text-xs font-medium">Primary</p>
                  <p className="text-xs text-muted-foreground">#F59E0B</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full bg-orange-600 mx-auto mb-2 cursor-pointer hover:scale-105 transition-transform"></div>
                  <p className="text-xs font-medium">Secondary</p>
                  <p className="text-xs text-muted-foreground">#EA580C</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 rounded-full bg-amber-100 mx-auto mb-2 cursor-pointer hover:scale-105 transition-transform"></div>
                  <p className="text-xs font-medium">Accent</p>
                  <p className="text-xs text-muted-foreground">#FEF3C7</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Palette className="h-4 w-4 mr-2" />
                Customize Colors
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5 text-slate-600" />
                Typography & Fonts
              </CardTitle>
              <CardDescription>Choose fonts for your wedding communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-lg border">
                  <p className="font-serif text-lg font-semibold">Elegant Serif</p>
                  <p className="text-sm text-muted-foreground">For headings and formal text</p>
                </div>
                <div className="p-3 bg-white rounded-lg border">
                  <p className="font-sans text-base">Clean Sans-Serif</p>
                  <p className="text-sm text-muted-foreground">For body text and details</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Type className="h-4 w-4 mr-2" />
                Browse Font Library
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Preview Brand Guidelines
          </Button>
          <Button onClick={handleComplete} className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Save Brand Assets
          </Button>
        </div>
      </div>
    );
  }

  // Professional Sequential Templates Screen
  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <Button 
          onClick={() => setCurrentScreen('providers')}
          variant="ghost"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Providers
        </Button>
        <div className="text-center">
          <h3 className="text-xl font-bold text-foreground">
            Customise Your Messages
          </h3>
          <p className="text-sm text-muted-foreground">Add Logos, Change colors, Signatures etc in Brand Assets</p>
        </div>
        <Button 
          onClick={() => setCurrentScreen('assets')}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Image className="h-4 w-4" />
          Brand Assets
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Channel Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h4 className="font-semibold text-blue-900">Email Templates</h4>
            <p className="text-sm text-blue-700 mb-3">Rich HTML with images & styling</p>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">4 Active</Badge>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-semibold text-green-900">WhatsApp Templates</h4>
            <p className="text-sm text-green-700 mb-3">Quick messages with media</p>
            <Badge variant="secondary" className="bg-green-100 text-green-800">2 Active</Badge>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h4 className="font-semibold text-purple-900">SMS Templates</h4>
            <p className="text-sm text-purple-700 mb-3">Concise text messages</p>
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">1 Active</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Sequential Template Accordion Categories */}
      <div className="space-y-4">
        {legacyTemplatesLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading templates...</p>
          </div>
        ) : legacyTemplatesError ? (
          <div className="text-center py-8">
            <p className="text-red-600">Error loading templates. Please try again.</p>
          </div>
        ) : (
          formatTemplatesForAccordion(legacyTemplatesData).map((category: TemplateCategory) => {
          const isExpanded = expandedCategories.includes(category.id);
          const toggleCategory = () => {
            setExpandedCategories(prev => 
              isExpanded 
                ? prev.filter(id => id !== category.id)
                : [...prev, category.id]
            );
          };
          
          return (
            <Collapsible key={category.id} open={isExpanded} onOpenChange={toggleCategory}>
              <Card className={`overflow-hidden border-l-4 transition-all duration-200 ${category.color} ${isExpanded ? 'shadow-md' : 'shadow-sm'} bg-card/60 backdrop-blur-sm border-border`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className={`cursor-pointer hover:bg-muted/50 transition-colors`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {category.icon}
                        </div>
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                            {category.name}
                            <Badge variant="outline" className="text-xs px-2 py-1 border-primary/30 text-primary">
                              {category.templates.filter(t => t.enabled).length} active
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">{category.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="hidden md:flex bg-primary/10 text-primary border-primary/30">
                          Step {category.sequence}
                        </Badge>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="p-0 border-t border-border">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-x divide-border">
                      {/* Email Template */}
                      <div className="p-6 hover:bg-muted/30 transition-colors bg-card/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">Email</Badge>
                          </div>
                          <Switch checked={category.templates.find(t => t.channel === 'email')?.enabled || false} />
                        </div>
                        <div className="space-y-3">
                          <div className="bg-card border border-border rounded-lg p-3">
                            <div className="text-sm font-medium mb-1 text-foreground">Subject Line</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {category.templates.find(t => t.channel === 'email')?.subject || 'Add email subject...'}
                            </div>
                          </div>
                          <div className="bg-card border border-border rounded-lg p-3 min-h-[80px]">
                            <div className="text-sm font-medium mb-1 text-foreground">Email Content</div>
                            <div className="text-xs text-muted-foreground line-clamp-3">
                              {category.templates.find(t => t.channel === 'email')?.content?.substring(0, 120) + '...' || 'Design your email template...'}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="ghost" size="sm" className="flex-1 text-primary hover:bg-primary/10">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1 text-primary hover:bg-primary/10">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>

                      {/* WhatsApp Template */}
                      <div className="p-6 hover:bg-muted/30 transition-colors bg-card/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">WhatsApp</Badge>
                          </div>
                          <Switch checked={category.templates.find(t => t.channel === 'whatsapp')?.enabled || false} />
                        </div>
                        <div className="space-y-3">
                          <div className="bg-card border border-border rounded-lg p-3 min-h-[120px]">
                            <div className="text-sm font-medium mb-2 text-foreground">WhatsApp Message</div>
                            <div className="text-xs text-muted-foreground">
                              {category.templates.find(t => t.channel === 'whatsapp')?.content?.substring(0, 100) + '...' || 'Create WhatsApp message...'}
                            </div>
                            <div className="mt-3 text-xs text-primary">
                              ✓ Media support • ✓ Emojis • ✓ Quick replies
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="ghost" size="sm" className="flex-1 text-primary hover:bg-primary/10">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1 text-primary hover:bg-primary/10">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>

                      {/* SMS Template */}
                      <div className="p-6 hover:bg-muted/30 transition-colors bg-card/30 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">SMS</Badge>
                          </div>
                          <Switch checked={category.templates.find(t => t.channel === 'sms')?.enabled || false} />
                        </div>
                        <div className="space-y-3">
                          <div className="bg-card border border-border rounded-lg p-3 min-h-[120px]">
                            <div className="text-sm font-medium mb-2 text-foreground">SMS Text</div>
                            <div className="text-xs text-muted-foreground">
                              {category.templates.find(t => t.channel === 'sms')?.content || 'Create concise SMS version...'}
                            </div>
                            <div className="mt-3 text-xs text-primary">
                              Character limit: 160 • No images
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button variant="ghost" size="sm" className="flex-1 text-primary hover:bg-primary/10">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="flex-1 text-primary hover:bg-primary/10">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
          })
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <div className="flex gap-3">
          <Button variant="outline">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate Templates
          </Button>
          <Button variant="outline" onClick={async () => {
            try {
              const result = await fetch('/api/test-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventId: eventId,
                  email: 'test@example.com'
                })
              });
              
              const response = await result.json();
              toast({
                title: response.success ? "Test Sent Successfully" : "Test Failed",
                description: response.message,
                variant: response.success ? "default" : "destructive",
              });
            } catch (error) {
              toast({
                title: "Test Failed",
                description: "Failed to send test message",
                variant: "destructive",
              });
            }
          }}>
            <Mail className="h-4 w-4 mr-2" />
            Send Test Messages
          </Button>
        </div>
        
        <Button onClick={handleComplete} className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          Save All Templates
        </Button>
      </div>
    </div>
  );

  // Main return statement with all screens and QR dialog
  return (
    <>
      {/* Current screen content */}
      {currentScreen === 'providers' && renderProvidersScreen()}
      {currentScreen === 'templates' && renderTemplatesScreen()}
      {currentScreen === 'assets' && renderAssetsScreen()}
      {currentScreen === 'signatures' && renderSignaturesScreen()}
      
      {/* WhatsApp QR Code Dialog - Debug Enhanced */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md z-50 bg-white border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              WhatsApp Web.js Connection
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your WhatsApp app to connect your phone
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {/* Debug Info */}
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              Dialog Open: {qrDialogOpen ? 'Yes' : 'No'} | QR Data: {qrCodeData ? 'Available' : 'None'}
            </div>
            
            {qrCodeData ? (
              <>
                <div className="bg-white p-4 rounded-lg border shadow-lg">
                  <QRCode 
                    value={qrCodeData} 
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    1. Open WhatsApp on your phone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2. Go to Settings → Linked Devices
                  </p>
                  <p className="text-sm text-muted-foreground">
                    3. Tap "Link a Device" and scan this code
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                <p className="text-muted-foreground">Generating QR code...</p>
                <p className="text-xs text-gray-500 mt-2">Waiting for WhatsApp service...</p>
              </div>
            )}
            <Button 
              onClick={() => {
                console.log('🔴 Closing QR Dialog');
                setQrDialogOpen(false);
                setQrCodeData(null);
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  // Helper functions for rendering different screens
  function renderProvidersScreen() {
    return (
      <div className="space-y-6">
        {/* Navigation Header */}
        <div className="flex items-center justify-between">
          <div></div>
          <div className="text-center">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Communication Providers
            </h3>
            <p className="text-sm text-muted-foreground">Connect your messaging services</p>
          </div>
          <Button 
            onClick={() => setCurrentScreen('templates')}
            className="flex items-center gap-2"
          >
            Manage Templates
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Email Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-500" />
              Email Providers
            </CardTitle>
            <CardDescription>
              Configure email services for sending invitations and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {emailProviders.map((provider: ProviderStatus) => (
              <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={provider.color}>
                    {provider.icon}
                  </div>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">{provider.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {provider.connected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                  {provider.connected ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderConnection(provider.id)}
                      >
                        Reconfigure
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderDisconnection(provider.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleProviderConnection(provider.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SMS Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-500" />
              SMS Providers
            </CardTitle>
            <CardDescription>
              Set up SMS services for text notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {smsProviders.map((provider: ProviderStatus) => (
              <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={provider.color}>
                    {provider.icon}
                  </div>
                  <div>
                    <div className="font-medium">{provider.name}</div>
                    <div className="text-sm text-muted-foreground">{provider.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {provider.connected ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      <Wifi className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500">
                      <WifiOff className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                  {provider.connected ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderConnection(provider.id)}
                      >
                        Reconfigure
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProviderDisconnection(provider.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleProviderConnection(provider.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>


        {/* Bottom Action */}
        <div className="flex items-center justify-end pt-6 border-t">
          <Button onClick={handleComplete} className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Save Communication Settings
          </Button>
        </div>
      </div>
    );
  }


}