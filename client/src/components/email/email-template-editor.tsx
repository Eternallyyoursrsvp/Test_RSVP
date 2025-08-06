import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { get, post, put, del } from "@/lib/api-utils";
import { queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Loader2, Plus, X } from "lucide-react";

interface EmailTemplateEditorProps {
  eventId: number;
}

const emailTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "HTML content is required"),
  bodyText: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  isDefault: z.boolean().default(false),
  eventId: z.number()
});

type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

type EmailTemplate = {
  id: number;
  name: string;
  description: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  category: string;
  isDefault: boolean;
  isSystem: boolean;
  lastUpdated: string;
  createdAt: string;
  eventId: number;
};

export default function EmailTemplateEditor({ eventId }: EmailTemplateEditorProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['/api/events', eventId, 'email-templates'],
    queryFn: async () => {
      const res = await get(`/api/events/${eventId}/email-templates`);
      return res.data;
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: EmailTemplateFormValues) => 
      post(`/api/events/${eventId}/email-templates`, data).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Template created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-templates'] });
      setIsCreating(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create template", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: EmailTemplateFormValues & { id: number }) => 
      put(`/api/events/${eventId}/email-templates/${data.id}`, data).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Template updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-templates'] });
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update template", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => 
      del(`/api/events/${eventId}/email-templates/${id}`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Template deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-templates'] });
      setSelectedTemplate(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete template", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      name: "",
      description: "",
      subject: "",
      bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px 0;">
      <!-- Header Content -->
      <h1 style="color: #333;">Your Wedding Invitation</h1>
    </div>
    
    <div style="padding: 20px; background-color: #fff; border-radius: 5px;">
      <!-- Main Content -->
      <p>Dear [Guest Name],</p>
      <p>We're excited to invite you to our wedding celebration!</p>
      
      <!-- Add your content here -->
      
      <p>We hope you can join us on this special day.</p>
      <p>Best regards,</p>
      <p>[Couple Names]</p>
    </div>
    
    <div style="text-align: center; padding: 20px 0; color: #666; font-size: 12px;">
      <!-- Footer Content -->
      <p>This is an automated email from our wedding management system.</p>
    </div>
  </div>
</body>
</html>`,
      bodyText: "Dear [Guest Name],\n\nWe're excited to invite you to our wedding celebration!\n\nWe hope you can join us on this special day.\n\nBest regards,\n[Couple Names]",
      category: "invitation",
      isDefault: false,
      eventId: eventId
    }
  });

  useEffect(() => {
    if (selectedTemplate) {
      form.reset({
        name: selectedTemplate.name,
        description: selectedTemplate.description || "",
        subject: selectedTemplate.subject,
        bodyHtml: selectedTemplate.bodyHtml,
        bodyText: selectedTemplate.bodyText || "",
        category: selectedTemplate.category,
        isDefault: selectedTemplate.isDefault,
        eventId: selectedTemplate.eventId
      });
    } else if (!isCreating) {
      form.reset({
        name: "",
        description: "",
        subject: "",
        bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; padding: 20px 0;">
      <!-- Header Content -->
      <h1 style="color: #333;">Your Wedding Invitation</h1>
    </div>
    
    <div style="padding: 20px; background-color: #fff; border-radius: 5px;">
      <!-- Main Content -->
      <p>Dear [Guest Name],</p>
      <p>We're excited to invite you to our wedding celebration!</p>
      
      <!-- Add your content here -->
      
      <p>We hope you can join us on this special day.</p>
      <p>Best regards,</p>
      <p>[Couple Names]</p>
    </div>
    
    <div style="text-align: center; padding: 20px 0; color: #666; font-size: 12px;">
      <!-- Footer Content -->
      <p>This is an automated email from our wedding management system.</p>
    </div>
  </div>
</body>
</html>`,
        bodyText: "Dear [Guest Name],\n\nWe're excited to invite you to our wedding celebration!\n\nWe hope you can join us on this special day.\n\nBest regards,\n[Couple Names]",
        category: "invitation",
        isDefault: false,
        eventId: eventId
      });
    }
  }, [selectedTemplate, isCreating, form, eventId]);

  const openEditor = (template?: EmailTemplate) => {
    if (template) {
      setSelectedTemplate(template);
    } else {
      setIsCreating(true);
      setSelectedTemplate(null);
    }
  };

  const closeEditor = () => {
    setIsCreating(false);
    setSelectedTemplate(null);
    form.reset();
  };

  const onSubmit = (values: EmailTemplateFormValues) => {
    if (selectedTemplate) {
      updateTemplateMutation.mutate({ ...values, id: selectedTemplate.id });
    } else {
      createTemplateMutation.mutate(values);
    }
  };

  const previewTemplate = (template: EmailTemplate) => {
    // This would open a preview dialog or navigate to a preview page
    toast({ title: "Preview functionality coming soon" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isCreating || selectedTemplate) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{selectedTemplate ? 'Edit Template' : 'Create New Template'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={closeEditor}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., RSVP Confirmation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="invitation">Invitation</SelectItem>
                          <SelectItem value="rsvp">RSVP</SelectItem>
                          <SelectItem value="reminder">Reminder</SelectItem>
                          <SelectItem value="confirmation">Confirmation</SelectItem>
                          <SelectItem value="thank-you">Thank You</SelectItem>
                          <SelectItem value="update">Event Update</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A brief description of this template's purpose" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Your Wedding Invitation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML Content</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bodyHtml"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML Content</FormLabel>
                        <FormControl>
                          <Textarea rows={15} placeholder="HTML email content" {...field} className="font-mono text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="text" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="bodyText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plain Text Content</FormLabel>
                        <FormControl>
                          <Textarea rows={10} placeholder="Plain text email content" {...field} className="font-mono text-sm" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium leading-none">
                      Set as default template for this category
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeEditor}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Email Templates</h2>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" /> New Template
        </Button>
      </div>

      {templatesData?.templates?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No email templates found</p>
          <Button onClick={() => openEditor()}>Create Your First Template</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templatesData?.templates?.map((template: EmailTemplate) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                  {template.isDefault && " (Default)"}
                  {template.isSystem && " (System)"}
                </p>
              </CardHeader>
              <CardContent className="pb-2">
                <p className="text-sm font-medium">Subject:</p>
                <p className="text-sm mb-2 truncate">{template.subject}</p>
                {template.description && (
                  <>
                    <p className="text-sm font-medium mt-2">Description:</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {template.description}
                    </p>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => previewTemplate(template)}
                >
                  Preview
                </Button>
                {!template.isSystem && (
                  <div className="space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openEditor(template)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this template?')) {
                          deleteTemplateMutation.mutate(template.id);
                        }
                      }}
                      disabled={deleteTemplateMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}