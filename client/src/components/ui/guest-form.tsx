import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { insertGuestSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash, User, Users, CheckCircle, Baby, Hotel, Info, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GuestFormProps {
  eventId?: number;
  guest?: any;
  initialData?: Partial<z.infer<typeof formSchema>>;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const childSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.union([
    z.number().min(0, "Age must be a positive number"),
    z.string().transform((val) => parseInt(val) || 0)
  ]),
  gender: z.string().optional(),
  salutation: z.string().optional()
});

const formSchema = insertGuestSchema.extend({
  gender: z.string().optional().nullable(),
  salutation: z.string().optional().nullable(),
  whatsappAvailable: z.boolean().default(false),
  whatsappSame: z.boolean().default(true),
  whatsappCountryCode: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  allergies: z.string().optional().nullable(),
  needsAccommodation: z.boolean().default(false),
  childrenDetails: z.array(childSchema).default([]),
  childrenNotes: z.string().optional().nullable(),
  plusOneEmail: z.string().email().optional().or(z.literal("")),
  plusOnePhone: z.string().optional().nullable(),
  plusOneCountryCode: z.string().optional().nullable(),
  plusOneRelationship: z.string().optional().nullable(),
  plusOneRsvpContact: z.boolean().default(false),
  plusOneGender: z.string().optional().nullable(),
  plusOneSalutation: z.string().optional().nullable(),
  rsvpStatus: z.enum(["pending", "confirmed", "declined", "yes", "no"]).default("pending")
});

export default function GuestForm({ eventId, guest, initialData, onSubmit, onCancel, isLoading = false }: GuestFormProps) {
  const [childrenCount, setChildrenCount] = useState(0);
  const [activeSection, setActiveSection] = useState("basic");
  
  const guestData = initialData || guest;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventId: eventId || guestData?.eventId,
      firstName: guestData?.firstName || "",
      lastName: guestData?.lastName || "",
      email: guestData?.email || "",
      gender: guestData?.gender || "",
      salutation: guestData?.salutation || "",
      countryCode: guestData?.countryCode || "+91",
      phone: guestData?.phone || "",
      whatsappSame: guestData?.whatsappSame !== false,
      whatsappCountryCode: guestData?.whatsappCountryCode || "+91",
      whatsappNumber: guestData?.whatsappNumber || "",
      whatsappAvailable: guestData?.whatsappAvailable || false,
      address: guestData?.address || "",
      side: guestData?.side || "bride",
      isFamily: guestData?.isFamily || false,
      relationship: guestData?.relationship || "",
      rsvpStatus: guestData?.rsvpStatus === "yes" ? "confirmed" : guestData?.rsvpStatus === "no" ? "declined" : guestData?.rsvpStatus || "pending",
      plusOneAllowed: guestData?.plusOneAllowed || false,
      plusOneName: guestData?.plusOneName || "",
      plusOneEmail: guestData?.plusOneEmail || "",
      plusOnePhone: guestData?.plusOnePhone || "",
      plusOneCountryCode: guestData?.plusOneCountryCode || "+91",
      plusOneGender: guestData?.plusOneGender || "",
      plusOneSalutation: guestData?.plusOneSalutation || "",
      plusOneRelationship: guestData?.plusOneRelationship || "",
      plusOneRsvpContact: guestData?.plusOneRsvpContact || false,
      childrenDetails: guestData?.childrenDetails || [],
      childrenNotes: guestData?.childrenNotes || "",
      dietaryRestrictions: guestData?.dietaryRestrictions || "",
      allergies: guestData?.allergies || "",
      needsAccommodation: guestData?.needsAccommodation || false,
      tableAssignment: guestData?.tableAssignment || "",
      giftTracking: guestData?.giftTracking || "",
      notes: guestData?.notes || ""
    }
  });

  // Form pre-population
  useEffect(() => {
    if (guestData && Object.keys(guestData).length > 0) {
      const formData = {
        eventId: eventId || guestData.eventId,
        firstName: guestData.firstName || "",
        lastName: guestData.lastName || "",
        email: guestData.email || "",
        gender: guestData.gender || "",
        salutation: guestData.salutation || "",
        countryCode: guestData.countryCode || "+91",
        phone: guestData.phone || "",
        whatsappSame: guestData.whatsappSame !== false,
        whatsappCountryCode: guestData.whatsappCountryCode || "+91",
        whatsappNumber: guestData.whatsappNumber || "",
        whatsappAvailable: guestData.whatsappAvailable || false,
        address: guestData.address || "",
        side: guestData.side || "bride",
        isFamily: guestData.isFamily || false,
        relationship: guestData.relationship || "",
        rsvpStatus: guestData.rsvpStatus === "yes" ? "confirmed" : guestData.rsvpStatus === "no" ? "declined" : guestData.rsvpStatus || "pending",
        plusOneAllowed: guestData.plusOneAllowed || false,
        plusOneName: guestData.plusOneName || "",
        plusOneEmail: guestData.plusOneEmail || "",
        plusOnePhone: guestData.plusOnePhone || "",
        plusOneCountryCode: guestData.plusOneCountryCode || "+91",
        plusOneGender: guestData.plusOneGender || "",
        plusOneSalutation: guestData.plusOneSalutation || "",
        plusOneRelationship: guestData.plusOneRelationship || "",
        plusOneRsvpContact: guestData.plusOneRsvpContact || false,
        childrenDetails: guestData.childrenDetails || [],
        childrenNotes: guestData.childrenNotes || "",
        dietaryRestrictions: guestData.dietaryRestrictions || "",
        allergies: guestData.allergies || "",
        needsAccommodation: guestData.needsAccommodation || false,
        tableAssignment: guestData.tableAssignment || "",
        giftTracking: guestData.giftTracking || "",
        notes: guestData.notes || ""
      };
      
      form.reset(formData);
      setChildrenCount(guestData?.childrenDetails?.length || 0);
    }
  }, [guestData, form, eventId]);

  const sections = [
    { id: "basic", label: "Basic Info", icon: User, description: "Personal details & contact" },
    { id: "rsvp", label: "RSVP Status", icon: CheckCircle, description: "Attendance & ceremonies" },
    { id: "relationship", label: "Relationship", icon: Users, description: "Connection to couple" },
    { id: "plusone", label: "Plus One", icon: Users, description: "Companion information" },
    { id: "children", label: "Children", icon: Baby, description: "Child guests & details" },
    { id: "dietary", label: "Dietary", icon: Utensils, description: "Food preferences & allergies" },
    { id: "accommodation", label: "Stay & Travel", icon: Hotel, description: "Lodging & travel needs" },
    { id: "additional", label: "Additional", icon: Info, description: "Extra notes & tracking" }
  ];

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };
  
  const addChild = () => {
    const currentChildren = form.getValues("childrenDetails") || [];
    form.setValue("childrenDetails", [
      ...currentChildren, 
      { name: "", age: 0, gender: "", salutation: "" }
    ]);
    setChildrenCount(childrenCount + 1);
  };
  
  const removeChild = (index: number) => {
    const currentChildren = form.getValues("childrenDetails") || [];
    const newChildren = [...currentChildren];
    newChildren.splice(index, 1);
    form.setValue("childrenDetails", newChildren);
    setChildrenCount(childrenCount - 1);
  };

  const getCurrentSection = () => {
    return sections.find(s => s.id === activeSection) || sections[0];
  };

  const renderBasicSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name*</FormLabel>
              <FormControl>
                <Input placeholder="John" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name*</FormLabel>
              <FormControl>
                <Input placeholder="Doe" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="salutation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salutation</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input type="email" placeholder="john.doe@example.com" {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="countryCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <Input placeholder="+91" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="col-span-3">
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="9876543210" {...field} value={field.value || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Textarea placeholder="Enter full address" {...field} value={field.value || ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="whatsappAvailable"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Available on WhatsApp</FormLabel>
              <FormDescription>Check if this guest can receive WhatsApp messages</FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );

  const renderRSVPSection = () => (
    <div className="space-y-6">
      <div className="glassmorphism-light p-4 rounded-xl border-l-3 border-accent">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-accent" />
          <p className="text-sm text-muted-foreground font-body">
            RSVP Status helps track guest responses and integrate with the 2-stage RSVP process.
          </p>
        </div>
      </div>
      <FormField
        control={form.control}
        name="rsvpStatus"
        render={({ field }) => (
          <FormItem>
            <FormLabel>RSVP Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || "pending"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>Track the guest's response to your wedding invitation</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderRelationshipSection = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="side"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Guest Association*</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || "bride"}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select side" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="bride">Bride's Guest</SelectItem>
                <SelectItem value="groom">Groom's Guest</SelectItem>
                <SelectItem value="mutual">Mutual Friend</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="relationship"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Relationship</FormLabel>
            <FormControl>
              <Input placeholder="Friend of the bride" {...field} value={field.value || ""} />
            </FormControl>
            <FormDescription>How is this guest related to the couple?</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderPlusOneSection = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="plusOneAllowed"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Plus One Allowed</FormLabel>
              <FormDescription>Check if guest can bring a companion</FormDescription>
            </div>
          </FormItem>
        )}
      />
      {form.watch("plusOneAllowed") && (
        <div className="space-y-4 p-4 glassmorphism-light rounded-xl border-l-3 border-accent">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <h4 className="text-sm font-medium text-primary">Plus One Details</h4>
          </div>
          <FormField
            control={form.control}
            name="plusOneName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plus One Name</FormLabel>
                <FormControl>
                  <Input placeholder="Companion's name" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );

  const renderChildrenSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between glassmorphism-light p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <Baby className="h-5 w-5 text-accent" />
          <h4 className="text-sm font-medium text-primary">Children Information</h4>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addChild} className="bg-primary/10 border-primary/20 hover:bg-primary/20">
          <Plus className="h-4 w-4 mr-2" />
          Add Child
        </Button>
      </div>
      {form.watch("childrenDetails")?.map((child: any, index: number) => (
        <div key={index} className="glassmorphism-light p-4 rounded-xl border-l-3 border-accent space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Baby className="h-4 w-4 text-accent" />
              <h5 className="text-sm font-medium text-primary">Child {index + 1}</h5>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeChild(index)} className="text-destructive hover:bg-destructive/10">
              <Trash className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name={"childrenDetails." + index + ".name"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Child's name" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"childrenDetails." + index + ".age"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Age" {...field} value={field.value || ""} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"childrenDetails." + index + ".gender"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderDietarySection = () => (
    <div className="space-y-6">
      <div className="glassmorphism-light p-4 rounded-xl border-l-3 border-accent">
        <div className="flex items-center gap-3">
          <Utensils className="h-5 w-5 text-accent" />
          <p className="text-sm text-muted-foreground font-body">
            Dietary information helps with meal planning and kitchen preparation for the wedding events.
          </p>
        </div>
      </div>
      <FormField
        control={form.control}
        name="dietaryRestrictions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dietary Restrictions</FormLabel>
            <FormControl>
              <Textarea placeholder="Vegetarian, vegan, gluten-free, etc." {...field} value={field.value || ""} />
            </FormControl>
            <FormDescription>List any dietary preferences or restrictions</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="allergies"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Allergies</FormLabel>
            <FormControl>
              <Textarea placeholder="Nuts, dairy, shellfish, etc." {...field} value={field.value || ""} />
            </FormControl>
            <FormDescription>List any food allergies - this is important for safety</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderAccommodationSection = () => (
    <div className="space-y-6">
      <div className="glassmorphism-light p-4 rounded-xl border-l-3 border-accent">
        <div className="flex items-center gap-3">
          <Hotel className="h-5 w-5 text-accent" />
          <p className="text-sm text-muted-foreground font-body">
            Accommodation details support Stage 2 RSVP process and travel coordination.
          </p>
        </div>
      </div>
      <FormField
        control={form.control}
        name="needsAccommodation"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>Needs Accommodation</FormLabel>
              <FormDescription>Check if guest requires hotel/lodging arrangements</FormDescription>
            </div>
          </FormItem>
        )}
      />
    </div>
  );

  const renderAdditionalSection = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="giftTracking"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Gift Tracking</FormLabel>
            <FormControl>
              <Textarea placeholder="Details about gift(s) received" {...field} value={field.value || ""} />
            </FormControl>
            <FormDescription>Track gifts received from this guest</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Notes</FormLabel>
            <FormControl>
              <Textarea placeholder="Any other notes about this guest" {...field} value={field.value || ""} />
            </FormControl>
            <FormDescription>Special requirements, preferences, or important information</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderCurrentSection = () => {
    switch (activeSection) {
      case "basic":
        return renderBasicSection();
      case "rsvp":
        return renderRSVPSection();
      case "relationship":
        return renderRelationshipSection();
      case "plusone":
        return renderPlusOneSection();
      case "children":
        return renderChildrenSection();
      case "dietary":
        return renderDietarySection();
      case "accommodation":
        return renderAccommodationSection();
      case "additional":
        return renderAdditionalSection();
      default:
        return renderBasicSection();
    }
  };

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="text-center glassmorphism-light p-6 rounded-xl">
          <div className="flex items-center justify-center gap-3 mb-3">
            <User className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-primary font-display">
              {guestData ? "Edit Guest Details" : "Add New Guest"}
            </h2>
          </div>
          <DialogDescription className="text-sm text-muted-foreground font-body">
            {guestData ? "Update guest information for your wedding" : "Add a new guest to your wedding celebration"}
          </DialogDescription>
          {guestData?.rsvpStatus && (
            <Badge className="mt-3 bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30">
              RSVP: {guestData.rsvpStatus.charAt(0).toUpperCase() + guestData.rsvpStatus.slice(1)}
            </Badge>
          )}
        </div>

        <div className="glassmorphism p-4 rounded-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex flex-col items-center gap-2 p-3 text-xs rounded-xl transition-all duration-200 ${
                  activeSection === section.id
                    ? "bg-primary/10 text-primary border-l-3 border-primary shadow-lg transform scale-105"
                    : "glassmorphism-light hover:bg-primary/5 text-muted-foreground hover:text-primary hover:scale-102"
                }`}
              >
                {React.createElement(section.icon, { 
                  className: `h-5 w-5 ${activeSection === section.id ? 'text-primary' : 'text-muted-foreground'}` 
                })}
                <span className="font-medium leading-tight text-center">{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card className="glassmorphism border-l-3 border-primary">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 glassmorphism-light">
                  {React.createElement(getCurrentSection().icon, { className: "h-6 w-6 text-primary" })}
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-primary font-display">
                    {getCurrentSection().label}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-body">
                    {getCurrentSection().description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {renderCurrentSection()}
            </CardContent>
          </Card>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 glassmorphism-light p-4 rounded-xl">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel} 
                className="order-2 sm:order-1 bg-background/50 border-muted-foreground/20 hover:bg-muted/10"
              >
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="order-1 sm:order-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              {isLoading ? "Saving..." : guestData ? "Update Guest" : "Add Guest"}
            </Button>
          </DialogFooter>
        </form>
      </div>
    </Form>
  );
}