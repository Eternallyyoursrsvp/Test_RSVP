import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { put } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { useCurrentEvent } from "@/hooks/use-current-event";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Save, Calendar } from "lucide-react";

// Define schema for RSVP settings
const rsvpSettingsSchema = z.object({
  // General RSVP settings
  allowPlusOnes: z.boolean().default(true),
  allowChildrenDetails: z.boolean().default(true),
  customRsvpUrl: z.string().nullable().optional(),
  rsvpDeadline: z.string().nullable().optional(),
});

type RsvpSettingsData = z.infer<typeof rsvpSettingsSchema>;

interface RsvpSettingsProps {
  settings: any;
  eventId: number | undefined;
}

export default function RsvpSettings({ settings, eventId }: RsvpSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEvent } = useCurrentEvent();
  const [isSaving, setIsSaving] = useState(false);

  // Set up form with default values from settings
  const form = useForm<RsvpSettingsData>({
    resolver: zodResolver(rsvpSettingsSchema),
    defaultValues: {
      allowPlusOnes: settings?.allowPlusOnes ?? true,
      allowChildrenDetails: settings?.allowChildrenDetails ?? true,
      customRsvpUrl: settings?.customRsvpUrl ?? null,
      rsvpDeadline: settings?.rsvpDeadline ?? null,
    },
  });

  // Update event settings mutation
  const mutation = useMutation({
    mutationFn: async (data: RsvpSettingsData) => {
      if (!eventId) throw new Error("No event selected");
      setIsSaving(true);
      const response = await put(`/api/event-settings/${eventId}/rsvp`, data);
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "RSVP settings updated",
        description: "Your RSVP settings have been saved successfully.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/event-settings/${eventId}`] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  function onSubmit(data: RsvpSettingsData) {
    mutation.mutate(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>RSVP Settings</CardTitle>
        <CardDescription>
          Configure how guests can RSVP to your wedding events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">General RSVP Settings</h3>
              
              <FormField
                control={form.control}
                name="rsvpDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RSVP Deadline</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input
                          type="date"
                          placeholder="Select a deadline date"
                          {...field}
                          value={field.value || ""}
                          className="w-full"
                        />
                        <Calendar className="ml-2 h-5 w-5 text-muted-foreground self-center" />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The date by which guests should respond to your invitation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="customRsvpUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom RSVP URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., rsvp.example.com or a custom subdomain"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional: Use a custom domain for your RSVP page
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator className="my-6" />
              
              <h3 className="text-lg font-medium">Guest Options</h3>
              
              <FormField
                control={form.control}
                name="allowPlusOnes"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Allow Plus Ones</FormLabel>
                      <FormDescription>
                        Enable this to allow guests to bring additional companions
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Request Children Details</FormLabel>
                      <FormDescription>
                        Enable to collect information about children attending with guests
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
            
            <Button 
              type="submit" 
              className="gold-gradient mt-6"
              disabled={isSaving}
            >
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save RSVP Settings
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}