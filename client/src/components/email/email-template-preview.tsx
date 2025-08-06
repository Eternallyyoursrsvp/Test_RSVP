import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Globe, Send, Mail } from 'lucide-react';
import { post, get } from '@/lib/api-utils'; // Using the consolidated API utilities
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  bodyHtml?: string;
  bodyText?: string;
}

interface EmailStyle {
  id: string;
  name: string;
  css: string;
  isDefault?: boolean;
  headerLogo?: string;
  footerText?: string;
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
}

interface TemplateData {
  template: EmailTemplate;
}

interface StylesData {
  styles: EmailStyle[];
}

interface EmailTemplatePreviewProps {
  eventId: number;
  templateId: number;
  onClose: () => void;
}

export default function EmailTemplatePreview({ eventId, templateId, onClose }: EmailTemplatePreviewProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('desktop');
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewText, setPreviewText] = useState<string>('');

  // Fetch template details
  const { data: templateData, isLoading: templateLoading } = useQuery<TemplateData>({
    queryKey: [`/api/events/${eventId}/email-templates/${templateId}`],
    // The queryFn is now automatically provided by our API utils configuration
  });

  // Fetch available styles
  const { data: stylesData, isLoading: stylesLoading } = useQuery<StylesData>({
    queryKey: [`/api/events/${eventId}/email-styles`],
    // The queryFn is now automatically provided by our API utils configuration
  });

  // Set default style when data is loaded
  useEffect(() => {
    if (stylesData?.styles && stylesData.styles.length > 0) {
      // Find default style or use the first one
      const defaultStyle = stylesData.styles.find((style) => style.isDefault) || stylesData.styles[0];
      setSelectedStyle(defaultStyle.id);
    }
  }, [stylesData]);

  // Generate preview when template and style are selected
  useEffect(() => {
    if (templateData?.template && selectedStyle && stylesData?.styles) {
      const template = templateData.template;
      const style = stylesData.styles.find((s) => s.id === selectedStyle);
      
      if (!style) return;
      
      // Replace variables with sample data
      const sampleData = {
        eventName: 'Rocky Weds Rani',
        guestName: 'John Smith',
        coupleName: 'Priya & Raj',
        eventDate: 'June 15, 2025',
        eventLocation: 'Taj Palace, Delhi',
        rsvpLink: 'https://example.com/rsvp/sample',
        rsvpDeadline: 'May 15, 2025',
        headerLogo: style.headerLogo || 'https://via.placeholder.com/200x50?text=Wedding+Logo',
        rsvpStatus: 'Attending',
        ceremoniesList: 'Sangeet, Mehendi, Wedding Ceremony, Reception',
        footerText: style.footerText?.replace('{{eventYear}}', '2025').replace('{{eventName}}', 'Rocky Weds Rani') || 
          '© 2025 Rocky Weds Rani. All rights reserved.'
      };

      // Apply style to HTML content
      let styledHtml = template.bodyHtml || template.content || '';
      
      // Replace variables
      Object.entries(sampleData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        styledHtml = styledHtml.replace(regex, value as string);
      });
      
      // Wrap in styling
      const wrappedHtml = `
        <div style="
          font-family: ${style.fontFamily || 'Arial, sans-serif'};
          font-size: ${style.fontSize || '16px'};
          color: ${style.textColor || '#000000'};
          line-height: 1.5;
          max-width: 600px;
          margin: 0 auto;
        ">
          ${styledHtml}
          ${style.css ? `<style>${style.css}</style>` : ''}
        </div>
      `;
      
      setPreviewHtml(wrappedHtml);
      
      // Also prepare text version
      let textContent = template.bodyText || '';
      Object.entries(sampleData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        textContent = textContent.replace(regex, value as string);
      });
      
      setPreviewText(textContent);
    }
  }, [templateData, selectedStyle, stylesData]);

  // Send test email using the consolidated API utilities
  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter a recipient email address',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSending(true);
    try {
      const response = await post(`/api/events/${eventId}/test-email`, {
        templateId,
        styleId: selectedStyle,
        toEmail: testEmail
      });
      
      toast({
        title: 'Test email sent',
        description: 'The test email has been sent successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to send test email: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {templateLoading ? 'Loading Email Template...' : `Preview: ${templateData?.template?.name}`}
          </DialogTitle>
        </DialogHeader>

        {(templateLoading || stylesLoading) ? (
          <div className="flex justify-center items-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="md:w-1/4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="style-select">Email Style</Label>
                    <Select
                      value={selectedStyle || ''}
                      onValueChange={(value) => setSelectedStyle(value)}
                    >
                      <SelectTrigger id="style-select">
                        <SelectValue placeholder="Select a style" />
                      </SelectTrigger>
                      <SelectContent>
                        {stylesData?.styles?.map((style: any) => (
                          <SelectItem 
                            key={style.id} 
                            value={style.id.toString()}
                          >
                            {style.name}{style.isDefault ? ' (Default)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Label htmlFor="test-email">Send Test Email</Label>
                    <div className="flex gap-2">
                      <Input
                        id="test-email"
                        type="email"
                        placeholder="recipient@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                      <Button
                        onClick={sendTestEmail}
                        disabled={isSending}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:w-3/4 border rounded-md flex flex-col overflow-hidden">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="bg-gray-100 border-b px-2 py-1">
                    <TabsList className="grid grid-cols-3">
                      <TabsTrigger value="desktop" className="text-xs">
                        <Globe className="h-3 w-3 mr-2" /> Desktop
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="text-xs">
                        <div className="h-3 w-3 mr-2">📱</div> Mobile
                      </TabsTrigger>
                      <TabsTrigger value="text" className="text-xs">
                        <Mail className="h-3 w-3 mr-2" /> Text Only
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent 
                    value="desktop" 
                    className="m-0 overflow-auto"
                    style={{ height: '500px' }}
                  >
                    <div className="p-4 bg-gray-50 h-full">
                      <iframe
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${previewHtml}</body></html>`}
                        className="w-full h-full border bg-white"
                        title="Email preview"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent 
                    value="mobile" 
                    className="m-0 overflow-auto"
                    style={{ height: '500px' }}
                  >
                    <div className="p-4 bg-gray-50 h-full flex justify-center">
                      <div 
                        className="border bg-white rounded-xl overflow-hidden shadow-lg"
                        style={{ width: '375px', height: '667px' }}
                      >
                        <div className="bg-black text-white text-xs text-center py-1">
                          Mobile Preview
                        </div>
                        <iframe
                          srcDoc={`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${previewHtml}</body></html>`}
                          className="w-full h-full"
                          title="Mobile email preview"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent 
                    value="text" 
                    className="m-0 overflow-auto"
                    style={{ height: '500px' }}
                  >
                    <div className="p-4 bg-gray-50 h-full">
                      <div className="bg-white p-4 border rounded h-full font-mono text-sm whitespace-pre-wrap overflow-auto">
                        {previewText}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={onClose}>
                Close Preview
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}