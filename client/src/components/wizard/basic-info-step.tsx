import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { WeddingEvent } from "@shared/schema";

// Schema for the basic info step
const basicInfoSchema = z.object({
  title: z.string().min(3, "Event title must be at least 3 characters"),
  coupleNames: z.string().min(3, "Couple names must be at least 3 characters"),
  brideName: z.string().min(1, "Bride name is required"),
  groomName: z.string().min(1, "Groom name is required"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  location: z.string().min(3, "Location must be at least 3 characters"),
  description: z.string().optional(),
});

// TypeScript type for the form data
type BasicInfoData = z.infer<typeof basicInfoSchema>;

interface BasicInfoStepProps {
  eventId: string;
  currentEvent: any; // Can be WeddingEvent or basicInfo from wizard endpoint
  onComplete: (data: BasicInfoData) => void;
  isCompleted: boolean;
}

export default function BasicInfoStep({
  eventId,
  currentEvent,
  onComplete,
  isCompleted
}: BasicInfoStepProps) {
  const [isEditing, setIsEditing] = useState(!isCompleted);

  // Set up form with default values from current event
  const form = useForm<BasicInfoData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      title: "",
      coupleNames: "",
      brideName: "",
      groomName: "",
      startDate: undefined,
      endDate: undefined,
      location: "",
      description: "",
    },
  });

  // RELIABLE form pre-population - fixed setTimeout anti-pattern
  useEffect(() => {
    if (currentEvent && Object.keys(currentEvent).length > 0) {
      // Handle multiple possible date formats from API
      const parseDate = (dateValue: any) => {
        if (!dateValue) return undefined;
        if (dateValue instanceof Date) return dateValue;
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? undefined : parsed;
        }
        return undefined;
      };
      
      const formData = {
        title: currentEvent.title || "",
        coupleNames: currentEvent.coupleNames || "",
        brideName: currentEvent.brideName || "",
        groomName: currentEvent.groomName || "",
        startDate: parseDate(currentEvent.startDate),
        endDate: parseDate(currentEvent.endDate),
        location: currentEvent.location || "",
        description: currentEvent.description || "",
      };
      
      // Use form.reset() to properly update all form fields
      form.reset(formData);
    }
  }, [currentEvent, form]);

  function onSubmit(data: BasicInfoData) {
    onComplete(data);
    setIsEditing(false);
  }

  // If step is completed and not editing, show summary view
  if (isCompleted && !isEditing) {
    const data = form.getValues();
    
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Event Title:</h3>
              <p className="col-span-3">{data.title}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Couple Names:</h3>
              <p className="col-span-3">{data.coupleNames}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Bride:</h3>
              <p className="col-span-3">{data.brideName}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Groom:</h3>
              <p className="col-span-3">{data.groomName}</p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Dates:</h3>
              <p className="col-span-3">
                {data.startDate && format(data.startDate, "PPP")} - {data.endDate && format(data.endDate, "PPP")}
              </p>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <h3 className="font-medium text-sm">Location:</h3>
              <p className="col-span-3">{data.location}</p>
            </div>
            {data.description && (
              <div className="grid grid-cols-4 items-start gap-4">
                <h3 className="font-medium text-sm">Description:</h3>
                <p className="col-span-3">{data.description}</p>
              </div>
            )}
          </div>
        </div>
        
        <Button type="button" onClick={() => setIsEditing(true)}>
          Edit Information
        </Button>
      </div>
    );
  }

  // Edit/Create form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter the main title for this wedding event" {...field} />
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
                  <Input placeholder="How you want the couple to be referred to" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="brideName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bride's Name</FormLabel>
                <FormControl>
                  <Input placeholder="Bride's full name" {...field} />
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
                  <Input placeholder="Groom's full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The first day of wedding events.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                      disabled={(date) => 
                        form.watch("startDate") ? date < form.watch("startDate") : false
                      }
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  The last day of wedding events.
                </FormDescription>
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
              <FormLabel>Primary Location</FormLabel>
              <FormControl>
                <Input placeholder="City, Country" {...field} />
              </FormControl>
              <FormDescription>
                The main location where the wedding will take place.
              </FormDescription>
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
                <Textarea
                  placeholder="Add any additional details about this wedding..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Additional information about the wedding event.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          Save Basic Information
        </Button>
      </form>
    </Form>
  );
}