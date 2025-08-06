import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { put, post, del } from "@/lib/api-utils";
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
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Loader2, Plus, X } from "lucide-react";

interface EmailSignatureEditorProps {
  eventId: number;
}

const emailSignatureSchema = z.object({
  name: z.string().min(1, "Name is required"),
  content: z.string().min(1, "Signature content is required"),
  plainText: z.string().optional(),
  includesSocialLinks: z.boolean().default(false),
  socialLinks: z.any().optional(),
  isDefault: z.boolean().default(false),
  eventId: z.number()
});

type EmailSignatureFormValues = z.infer<typeof emailSignatureSchema>;

type EmailSignature = {
  id: number;
  name: string;
  content: string;
  plainText?: string;
  includesSocialLinks: boolean;
  socialLinks?: any;
  isDefault: boolean;
  createdAt: string;
  eventId: number;
};

export default function EmailSignatureEditor({ eventId }: EmailSignatureEditorProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<EmailSignature | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const { data: signaturesData, isLoading } = useQuery({
    queryKey: ['/api/events', eventId, 'email-signatures'],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}/email-signatures`);
      if (!res.ok) throw new Error('Failed to fetch signatures');
      return res.json();
    }
  });

  const createSignatureMutation = useMutation({
    mutationFn: (data: EmailSignatureFormValues) => 
      post(`/api/events/${eventId}/email-signatures`, data).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Signature created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-signatures'] });
      setIsCreating(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create signature", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateSignatureMutation = useMutation({
    mutationFn: (data: EmailSignatureFormValues & { id: number }) => 
      put(`/api/events/${eventId}/email-signatures/${data.id}`, data).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Signature updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-signatures'] });
      setSelectedSignature(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update signature", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteSignatureMutation = useMutation({
    mutationFn: (id: number) => 
      del(`/api/events/${eventId}/email-signatures/${id}`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Signature deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-signatures'] });
      setSelectedSignature(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete signature", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const defaultSignatureHtml = `<table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 450px; font-family: Arial, sans-serif; color: #333333;">
  <tr>
    <td style="padding: 10px 0; border-top: 1px solid #dddddd;">
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        <tr>
          <td style="vertical-align: top; padding-right: 15px;">
            <img src="https://via.placeholder.com/100x100" alt="Profile Photo" style="width: 80px; height: 80px; border-radius: 50%;">
          </td>
          <td style="vertical-align: top;">
            <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 16px;">Your Name</p>
            <p style="margin: 0 0 5px 0; font-size: 14px;">Wedding Planner</p>
            <p style="margin: 0 0 5px 0; font-size: 14px;">Phone: +91 98765 43210</p>
            <p style="margin: 0; font-size: 14px;">Email: your.email@example.com</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const form = useForm<EmailSignatureFormValues>({
    resolver: zodResolver(emailSignatureSchema),
    defaultValues: {
      name: "",
      content: defaultSignatureHtml,
      plainText: "Your Name\nWedding Planner\nPhone: +91 98765 43210\nEmail: your.email@example.com",
      includesSocialLinks: false,
      socialLinks: {},
      isDefault: false,
      eventId: eventId
    }
  });

  useEffect(() => {
    if (selectedSignature) {
      form.reset({
        name: selectedSignature.name,
        content: selectedSignature.content,
        plainText: selectedSignature.plainText || "",
        includesSocialLinks: selectedSignature.includesSocialLinks,
        socialLinks: selectedSignature.socialLinks || {},
        isDefault: selectedSignature.isDefault,
        eventId: selectedSignature.eventId
      });
      setPreviewHtml(selectedSignature.content);
    } else if (!isCreating) {
      form.reset({
        name: "",
        content: defaultSignatureHtml,
        plainText: "Your Name\nWedding Planner\nPhone: +91 98765 43210\nEmail: your.email@example.com",
        includesSocialLinks: false,
        socialLinks: {},
        isDefault: false,
        eventId: eventId
      });
      setPreviewHtml(defaultSignatureHtml);
    }
  }, [selectedSignature, isCreating, form, eventId]);

  // Update preview when content changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'content') {
        setPreviewHtml(value.content as string || "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  const openEditor = (signature?: EmailSignature) => {
    if (signature) {
      setSelectedSignature(signature);
      setPreviewHtml(signature.content);
    } else {
      setIsCreating(true);
      setSelectedSignature(null);
      setPreviewHtml(defaultSignatureHtml);
    }
  };

  const closeEditor = () => {
    setIsCreating(false);
    setSelectedSignature(null);
    form.reset();
  };

  const onSubmit = (values: EmailSignatureFormValues) => {
    if (selectedSignature) {
      updateSignatureMutation.mutate({ ...values, id: selectedSignature.id });
    } else {
      createSignatureMutation.mutate(values);
    }
  };

  const previewSignature = (signature: EmailSignature) => {
    setPreviewHtml(signature.content);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isCreating || selectedSignature) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{selectedSignature ? 'Edit Email Signature' : 'Create New Signature'}</CardTitle>
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
                      <FormLabel>Signature Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Personal Signature" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-3 space-y-0 h-[74px]">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-medium leading-none">
                        Set as default signature
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Tabs defaultValue="html">
                <TabsList>
                  <TabsTrigger value="html">HTML Content</TabsTrigger>
                  <TabsTrigger value="text">Plain Text</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="html" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={12} 
                            placeholder="HTML signature content" 
                            {...field} 
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormDescription>
                          HTML markup for your signature. This will be displayed in email clients that support HTML.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="text" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="plainText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plain Text Version</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={8} 
                            placeholder="Plain text signature content" 
                            {...field} 
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormDescription>
                          Text-only version of your signature. This will be used in email clients that don't support HTML.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="preview" className="space-y-4">
                  <div className="border rounded-md p-6 bg-white">
                    <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This is how your signature will appear in HTML-compatible email clients.
                  </p>
                </TabsContent>
              </Tabs>

              <FormField
                control={form.control}
                name="includesSocialLinks"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </FormControl>
                    <div>
                      <FormLabel className="text-sm font-medium leading-none">
                        Include social media links
                      </FormLabel>
                      <FormDescription>
                        Social media links will be displayed as icons in your signature.
                        Edit the HTML directly to customize these links.
                      </FormDescription>
                    </div>
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
                  disabled={createSignatureMutation.isPending || updateSignatureMutation.isPending}
                >
                  {(createSignatureMutation.isPending || updateSignatureMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedSignature ? 'Update Signature' : 'Create Signature'}
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
        <h2 className="text-2xl font-bold">Email Signatures</h2>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" /> New Signature
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          {signaturesData?.signatures?.length === 0 ? (
            <div className="text-center py-8 border rounded-md">
              <p className="text-gray-500 mb-4">No email signatures found</p>
              <Button onClick={() => openEditor()}>Create Your First Signature</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {signaturesData?.signatures?.map((signature: EmailSignature) => (
                <Card key={signature.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      {signature.name}
                      {signature.isDefault && <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-0 cursor-pointer" onClick={() => previewSignature(signature)}>
                    <div className="border rounded bg-gray-50 p-2 h-24 overflow-hidden">
                      <div className="transform scale-75 origin-top-left">
                        <div dangerouslySetInnerHTML={{ __html: signature.content }} />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end pt-4">
                    <div className="space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditor(signature)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this signature?')) {
                            deleteSignatureMutation.mutate(signature.id);
                          }
                        }}
                        disabled={deleteSignatureMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-md p-6 bg-white">
          <h3 className="text-lg font-semibold mb-4">Signature Preview</h3>
          <div className="border-t pt-4">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </div>
  );
}