import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { WeddingEvent } from "@shared/schema";
import { Check, Bot, Info } from "lucide-react";
import { AI_MODELS } from "@/lib/constants";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define schema for AI assistant settings
const aiAssistantSchema = z.object({
  enableAiAssistant: z.boolean().default(true),
  chatbotName: z.string().min(2, {
    message: "Chatbot name must be at least 2 characters.",
  }).default("Wedding Assistant"),
  welcomeMessage: z.string().min(10, {
    message: "Welcome message must be at least 10 characters.",
  }).default("Hello! I'm your wedding assistant. How can I help you today?"),
  aiModel: z.string().default("claude-3-7-sonnet-20250219"),
  apiKey: z.string().optional(),
  apiProvider: z.enum(["anthropic", "openai", "google"]).default("anthropic"),
  knowledgeBase: z.array(z.string()).default([
    "Guest List",
    "Venue Information",
    "Accommodation Details",
    "Transport Schedule"
  ]),
  contextRestriction: z.enum(["strict", "moderate", "flexible"]).default("strict"),
  customInstructions: z.string().optional(),
  availableOnGuestWebsite: z.boolean().default(true),
  availableOnPlannerDashboard: z.boolean().default(false),
  availableOnWhatsapp: z.boolean().default(false)
});

// TypeScript type for the form data
type AiAssistantData = z.infer<typeof aiAssistantSchema>;

interface AiAssistantStepProps {
  eventId: string;
  currentEvent: WeddingEvent | undefined;
  onComplete: (data: AiAssistantData) => void;
  isCompleted: boolean;
}

export default function AiAssistantStep({
  eventId,
  currentEvent,
  onComplete,
  isCompleted
}: AiAssistantStepProps) {
  const [isEditing, setIsEditing] = useState(!isCompleted);
  
  // Set up form with default values
  const form = useForm<AiAssistantData>({
    resolver: zodResolver(aiAssistantSchema),
    defaultValues: {
      enableAiAssistant: true,
      chatbotName: "Wedding Assistant",
      welcomeMessage: "Hello! I'm your wedding assistant. How can I help you today?",
      aiModel: "claude-3-7-sonnet-20250219",
      apiKey: "",
      apiProvider: "anthropic",
      knowledgeBase: [
        "Guest List",
        "Venue Information",
        "Accommodation Details",
        "Transport Schedule"
      ],
      contextRestriction: "strict",
      customInstructions: "",
      availableOnGuestWebsite: true,
      availableOnPlannerDashboard: false,
      availableOnWhatsapp: false
    }
  });

  function onSubmit(data: AiAssistantData) {
    onComplete(data);
    setIsEditing(false);
  }

  // If step is completed and not editing, show summary view
  if (isCompleted && !isEditing) {
    const formData = form.getValues();
    
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">AI Assistant:</h3>
              <p className="col-span-3">{formData.enableAiAssistant ? "Enabled" : "Disabled"}</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Chatbot Name:</h3>
              <p className="col-span-3">{formData.chatbotName}</p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">AI Model:</h3>
              <p className="col-span-3">{formData.aiModel}</p>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <h3 className="font-medium text-sm">Welcome Message:</h3>
              <p className="col-span-3 text-sm">{formData.welcomeMessage}</p>
            </div>
            
            <div className="grid grid-cols-4 items-start gap-4">
              <h3 className="font-medium text-sm">Knowledge Base:</h3>
              <div className="col-span-3">
                {formData.knowledgeBase.map((item, i) => (
                  <span key={i} className="inline-block bg-muted rounded-full px-3 py-1 text-xs mr-2 mb-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Context Restriction:</h3>
              <p className="col-span-3">
                {formData.contextRestriction === "strict" && "Strict (Only answer questions about this specific event)"}
                {formData.contextRestriction === "moderate" && "Moderate (Answer event questions and general wedding advice)"}
                {formData.contextRestriction === "flexible" && "Flexible (Answer a wide range of questions)"}
              </p>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Available On:</h3>
              <p className="col-span-3">
                {[
                  formData.availableOnGuestWebsite && "Guest Wedding Website",
                  formData.availableOnPlannerDashboard && "Planner Dashboard",
                  formData.availableOnWhatsapp && "WhatsApp"
                ].filter(Boolean).join(", ") || "None"}
              </p>
            </div>
          </div>
        </div>
        
        <Button type="button" onClick={() => setIsEditing(true)}>
          Edit AI Assistant Settings
        </Button>
      </div>
    );
  }

  // Editing interface
  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-muted/30 p-6 rounded-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">AI Wedding Assistant</h3>
              </div>
              <FormField
                control={form.control}
                name="enableAiAssistant"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg space-y-0">
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Basic Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="chatbotName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chatbot Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Wedding Assistant" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="aiModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>AI Model</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Update the api provider based on the selected model
                              const model = AI_MODELS.find(m => m.id === value);
                              if (model) {
                                const provider = model.provider.toLowerCase();
                                form.setValue('apiProvider', provider === 'anthropic' ? 'anthropic' : 
                                                           provider === 'openai' ? 'openai' : 'google');
                              }
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an AI model" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AI_MODELS.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name} ({model.provider})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={`Enter your ${form.watch('apiProvider')} API key`}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className="text-xs">
                            {form.watch('apiProvider') === 'anthropic' && 'Your Anthropic API key (starts with "sk-ant-")'}
                            {form.watch('apiProvider') === 'openai' && 'Your OpenAI API key (starts with "sk-")'}
                            {form.watch('apiProvider') === 'google' && 'Your Google AI API key'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="welcomeMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Welcome Message</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Hello! I'm your wedding assistant. How can I help you today?" 
                              className="resize-none"
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
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Knowledge & Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted/50 p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">The AI assistant will have access to the selected information sources</p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="info-guests" className="rounded text-primary" defaultChecked />
                          <label htmlFor="info-guests" className="text-sm">Guest List</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="info-venues" className="rounded text-primary" defaultChecked />
                          <label htmlFor="info-venues" className="text-sm">Venue Information</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="info-accom" className="rounded text-primary" defaultChecked />
                          <label htmlFor="info-accom" className="text-sm">Accommodation Details</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input type="checkbox" id="info-transport" className="rounded text-primary" defaultChecked />
                          <label htmlFor="info-transport" className="text-sm">Transport Schedule</label>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="customInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Instructions (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Add any custom instructions for the AI assistant..." 
                              className="resize-none"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="contextRestriction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Response Restriction</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select context restriction" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="strict">Strict (Only this event's information)</SelectItem>
                              <SelectItem value="moderate">Moderate (Event + general wedding advice)</SelectItem>
                              <SelectItem value="flexible">Flexible (Wider range of topics)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            Controls how strictly the AI will stay on topic about this specific wedding
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                      
                    <div className="space-y-3 pt-4">
                      <FormField
                        control={form.control}
                        name="availableOnGuestWebsite"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Available on Guest Wedding Website</FormLabel>
                              <FormDescription className="text-xs">
                                Show the chatbot on the wedding website for guests
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
                        name="availableOnPlannerDashboard"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Available on Planner Dashboard</FormLabel>
                              <FormDescription className="text-xs">
                                Show the chatbot for wedding planners and organizers
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
                        name="availableOnWhatsapp"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Available on WhatsApp</FormLabel>
                              <FormDescription className="text-xs">
                                Allow guests to interact via WhatsApp (Coming Soon)
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit" className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              Save AI Assistant Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}