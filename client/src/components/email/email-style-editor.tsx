import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Loader2, Plus, X } from "lucide-react";

interface EmailStyleEditorProps {
  eventId: number;
}

const emailStyleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  headerLogo: z.string().optional(),
  headerBackground: z.string().optional(),
  bodyBackground: z.string().optional(),
  textColor: z.string().regex(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i, "Must be a valid hex color").optional(),
  linkColor: z.string().regex(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i, "Must be a valid hex color").optional(),
  buttonColor: z.string().regex(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i, "Must be a valid hex color").optional(),
  buttonTextColor: z.string().regex(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i, "Must be a valid hex color").optional(),
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  borderColor: z.string().regex(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i, "Must be a valid hex color").optional(),
  footerText: z.string().optional(),
  footerBackground: z.string().optional(),
  css: z.string().optional(),
  isDefault: z.boolean().default(false),
  eventId: z.number()
});

type EmailStyleFormValues = z.infer<typeof emailStyleSchema>;

type EmailStyle = {
  id: number;
  name: string;
  description: string | null;
  headerLogo: string | null;
  headerBackground: string | null;
  bodyBackground: string | null;
  textColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  fontSize: string;
  borderColor: string;
  footerText: string | null;
  footerBackground: string | null;
  css: string | null;
  isDefault: boolean;
  lastUpdated: string;
  createdAt: string;
  eventId: number;
};

export default function EmailStyleEditor({ eventId }: EmailStyleEditorProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<EmailStyle | null>(null);

  const { data: stylesData, isLoading } = useQuery({
    queryKey: ['/api/events', eventId, 'email-styles'],
    queryFn: async () => {
      const res = await get(`/api/events/${eventId}/email-styles`);
      return res.data;
    }
  });

  const createStyleMutation = useMutation({
    mutationFn: (data: EmailStyleFormValues) => 
      post(`/api/events/${eventId}/email-styles`, data).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Style created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-styles'] });
      setIsCreating(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create style", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateStyleMutation = useMutation({
    mutationFn: (data: EmailStyleFormValues & { id: number }) => 
      put(`/api/events/${eventId}/email-styles/${data.id}`, data).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Style updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-styles'] });
      setSelectedStyle(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update style", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteStyleMutation = useMutation({
    mutationFn: (id: number) => 
      del(`/api/events/${eventId}/email-styles/${id}`).then(r => r.data),
    onSuccess: () => {
      toast({ title: "Style deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'email-styles'] });
      setSelectedStyle(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete style", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const form = useForm<EmailStyleFormValues>({
    resolver: zodResolver(emailStyleSchema),
    defaultValues: {
      name: "",
      description: "Default wedding email style",
      headerLogo: "",
      headerBackground: "#ffffff",
      bodyBackground: "#f8f8f8",
      textColor: "#333333",
      linkColor: "#4a90e2",
      buttonColor: "#4a90e2",
      buttonTextColor: "#ffffff",
      fontFamily: "Arial, sans-serif",
      fontSize: "16px",
      borderColor: "#dddddd",
      footerText: "Wedding RSVP System",
      footerBackground: "#f1f1f1",
      css: "",
      isDefault: false,
      eventId: eventId
    }
  });

  useEffect(() => {
    if (selectedStyle) {
      form.reset({
        name: selectedStyle.name,
        description: selectedStyle.description || "",
        headerLogo: selectedStyle.headerLogo || "",
        headerBackground: selectedStyle.headerBackground || "#ffffff",
        bodyBackground: selectedStyle.bodyBackground || "#f8f8f8",
        textColor: selectedStyle.textColor || "#333333",
        linkColor: selectedStyle.linkColor || "#4a90e2",
        buttonColor: selectedStyle.buttonColor || "#4a90e2",
        buttonTextColor: selectedStyle.buttonTextColor || "#ffffff",
        fontFamily: selectedStyle.fontFamily || "Arial, sans-serif",
        fontSize: selectedStyle.fontSize || "16px",
        borderColor: selectedStyle.borderColor || "#dddddd",
        footerText: selectedStyle.footerText || "",
        footerBackground: selectedStyle.footerBackground || "#f1f1f1",
        css: selectedStyle.css || "",
        isDefault: selectedStyle.isDefault,
        eventId: selectedStyle.eventId
      });
    }
  }, [selectedStyle, form]);

  const openEditor = (style?: EmailStyle) => {
    if (style) {
      setSelectedStyle(style);
    } else {
      setIsCreating(true);
      setSelectedStyle(null);
    }
  };

  const closeEditor = () => {
    setIsCreating(false);
    setSelectedStyle(null);
    form.reset();
  };

  const onSubmit = (values: EmailStyleFormValues) => {
    if (selectedStyle) {
      updateStyleMutation.mutate({ ...values, id: selectedStyle.id });
    } else {
      createStyleMutation.mutate(values);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isCreating || selectedStyle) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{selectedStyle ? 'Edit Email Style' : 'Create New Style'}</CardTitle>
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
                      <FormLabel>Style Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Elegant Wedding" {...field} />
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
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="A brief description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Tabs defaultValue="colors">
                <TabsList className="mb-4">
                  <TabsTrigger value="colors">Colors & Fonts</TabsTrigger>
                  <TabsTrigger value="header">Header Settings</TabsTrigger>
                  <TabsTrigger value="footer">Footer Settings</TabsTrigger>
                  <TabsTrigger value="custom">Custom CSS</TabsTrigger>
                </TabsList>

                <TabsContent value="colors" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="bodyBackground"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body Background</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="text" placeholder="#f8f8f8" {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value || "#f8f8f8"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="textColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Text Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="text" placeholder="#333333" {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value || "#333333"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="linkColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="text" placeholder="#4a90e2" {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value || "#4a90e2"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="buttonColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="text" placeholder="#4a90e2" {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value || "#4a90e2"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="buttonTextColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Button Text Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="text" placeholder="#ffffff" {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value || "#ffffff"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="borderColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Border Color</FormLabel>
                          <div className="flex space-x-2">
                            <FormControl>
                              <Input type="text" placeholder="#dddddd" {...field} />
                            </FormControl>
                            <Input
                              type="color"
                              value={field.value || "#dddddd"}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="w-12 p-1 h-10"
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fontFamily"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Family</FormLabel>
                          <FormControl>
                            <Input placeholder="Arial, sans-serif" {...field} />
                          </FormControl>
                          <FormDescription>
                            Comma-separated list of fonts (e.g., "Arial, sans-serif")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fontSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Font Size</FormLabel>
                          <FormControl>
                            <Input placeholder="16px" {...field} />
                          </FormControl>
                          <FormDescription>
                            CSS font size value (e.g., "16px", "1.2em")
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="header" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="headerLogo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Logo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/logo.png" {...field} />
                        </FormControl>
                        <FormDescription>
                          Direct URL to your logo image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headerBackground"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Header Background</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input type="text" placeholder="#ffffff" {...field} />
                          </FormControl>
                          <Input
                            type="color"
                            value={field.value || "#ffffff"}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-12 p-1 h-10"
                          />
                        </div>
                        <FormDescription>
                          Color code or URL to background image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="footer" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Text</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Footer text content" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="footerBackground"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer Background</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <Input type="text" placeholder="#f1f1f1" {...field} />
                          </FormControl>
                          <Input
                            type="color"
                            value={field.value || "#f1f1f1"}
                            onChange={(e) => field.onChange(e.target.value)}
                            className="w-12 p-1 h-10"
                          />
                        </div>
                        <FormDescription>
                          Color code or URL to background image
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <FormField
                    control={form.control}
                    name="css"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom CSS</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={10}
                            placeholder=".email-body { padding: 20px; }" 
                            className="font-mono text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Add custom CSS rules to fine-tune your email template style
                        </FormDescription>
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
                      Set as default style
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
                  disabled={createStyleMutation.isPending || updateStyleMutation.isPending}
                >
                  {(createStyleMutation.isPending || updateStyleMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {selectedStyle ? 'Update Style' : 'Create Style'}
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
        <h2 className="text-2xl font-bold">Email Styles</h2>
        <Button onClick={() => openEditor()}>
          <Plus className="mr-2 h-4 w-4" /> New Style
        </Button>
      </div>

      {stylesData?.styles?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No email styles found</p>
          <Button onClick={() => openEditor()}>Create Your First Style</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylesData?.styles?.map((style: EmailStyle) => (
            <Card key={style.id} className="overflow-hidden">
              <div 
                className="h-10" 
                style={{ backgroundColor: style.headerBackground || '#ffffff' }}
              ></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{style.name}</CardTitle>
                {style.isDefault && <span className="text-xs font-semibold bg-green-100 text-green-800 px-2 py-1 rounded">Default</span>}
              </CardHeader>
              <CardContent className="pb-2">
                {style.description && (
                  <p className="text-sm text-muted-foreground mb-4">
                    {style.description}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Text:</span>
                    <div className="flex items-center mt-1">
                      <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: style.textColor }}></div>
                      <span>{style.textColor}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Button:</span>
                    <div className="flex items-center mt-1">
                      <div className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: style.buttonColor }}></div>
                      <span>{style.buttonColor}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Font:</span> {style.fontFamily}, {style.fontSize}
                  </div>
                </div>
              </CardContent>
              <div 
                className="h-3" 
                style={{ backgroundColor: style.footerBackground || '#f1f1f1' }}
              ></div>
              <CardFooter className="pt-4">
                <div className="flex w-full justify-end space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditor(style)}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this style?')) {
                        deleteStyleMutation.mutate(style.id);
                      }
                    }}
                    disabled={deleteStyleMutation.isPending}
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
  );
}