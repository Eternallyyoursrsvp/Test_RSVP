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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { post, get, put, del } from "@/lib/api-utils";
import { useToast } from "@/hooks/use-toast";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  ChefHat, 
  Utensils,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

// Validation schemas
const mealOptionSchema = z.object({
  ceremonyId: z.number(),
  name: z.string().min(1, "Meal name is required"),
  description: z.string().optional(),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  isNutFree: z.boolean().default(false),
});

type MealOptionForm = z.infer<typeof mealOptionSchema>;

export default function Meals() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEventId } = useCurrentEvent();

  // Get current event ID
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });
  
  const eventId = currentEventId || events?.[0]?.id || 1;

  // Fetch ceremonies
  const { data: ceremonies = [], isLoading: isLoadingCeremonies } = useQuery<any[]>({
    queryKey: [`/api/ceremonies/${eventId}/ceremonies`],
    enabled: !!eventId,
  });

  // Fetch meal options for all ceremonies
  const { data: allMealOptions = [], isLoading: isLoadingMeals } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/meal-options`],
    enabled: !!eventId,
    queryFn: async () => {
      // Since there might not be a direct endpoint, we'll mock this for now
      // In a real implementation, this would fetch all meal options for the event
      return [];
    }
  });

  // Fetch guests for meal selection tracking
  const { data: guests = [] } = useQuery<any[]>({
    queryKey: [`/api/events/${eventId}/guests`],
    enabled: !!eventId,
  });

  // Form setup
  const form = useForm<MealOptionForm>({
    resolver: zodResolver(mealOptionSchema),
    defaultValues: {
      ceremonyId: 0,
      name: "",
      description: "",
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isNutFree: false,
    },
  });

  // Mutations
  const createMealMutation = useMutation({
    mutationFn: async (data: MealOptionForm & { eventId: number }) => {
      return await post(`/api/events/${eventId}/meal-options`, data);
    },
    onSuccess: () => {
      toast({
        title: "Meal Option Created",
        description: "The meal option has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/meal-options`] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create meal option.",
        variant: "destructive",
      });
    },
  });

  const updateMealMutation = useMutation({
    mutationFn: async ({ id, ...data }: MealOptionForm & { id: number }) => {
      return await put(`/api/meal-options/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Meal Option Updated",
        description: "The meal option has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/meal-options`] });
      setEditingMeal(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update meal option.",
        variant: "destructive",
      });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (id: number) => {
      return await del(`/api/meal-options/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Meal Option Deleted",
        description: "The meal option has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/meal-options`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meal option.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleCreateMeal = (data: MealOptionForm) => {
    createMealMutation.mutate({ ...data, eventId });
  };

  const handleUpdateMeal = (data: MealOptionForm) => {
    if (editingMeal) {
      updateMealMutation.mutate({ ...data, id: editingMeal.id });
    }
  };

  const handleEditMeal = (meal: any) => {
    setEditingMeal(meal);
    form.reset({
      ceremonyId: meal.ceremonyId,
      name: meal.name,
      description: meal.description || "",
      isVegetarian: meal.isVegetarian || false,
      isVegan: meal.isVegan || false,
      isGlutenFree: meal.isGlutenFree || false,
      isNutFree: meal.isNutFree || false,
    });
  };

  const handleDeleteMeal = (id: number) => {
    if (confirm("Are you sure you want to delete this meal option?")) {
      deleteMealMutation.mutate(id);
    }
  };

  // Calculate statistics
  const totalMealOptions = allMealOptions.length;
  const vegetarianOptions = allMealOptions.filter(meal => meal.isVegetarian).length;
  const veganOptions = allMealOptions.filter(meal => meal.isVegan).length;
  const glutenFreeOptions = allMealOptions.filter(meal => meal.isGlutenFree).length;

  // Group meal options by ceremony
  const mealOptionsByCeremony = ceremonies.map(ceremony => ({
    ...ceremony,
    mealOptions: allMealOptions.filter(meal => meal.ceremonyId === ceremony.id)
  }));

  const getDietaryBadges = (meal: any) => {
    const badges = [];
    if (meal.isVegetarian) badges.push(<Badge key="veg" variant="secondary" className="bg-green-100 text-green-800">Vegetarian</Badge>);
    if (meal.isVegan) badges.push(<Badge key="vegan" variant="secondary" className="bg-green-200 text-green-900">Vegan</Badge>);
    if (meal.isGlutenFree) badges.push(<Badge key="gf" variant="secondary" className="bg-blue-100 text-blue-800">Gluten-Free</Badge>);
    if (meal.isNutFree) badges.push(<Badge key="nf" variant="secondary" className="bg-orange-100 text-orange-800">Nut-Free</Badge>);
    return badges;
  };

  if (isLoadingCeremonies) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute requiredPermission={[CORE_PERMISSIONS.EVENT_READ, CORE_PERMISSIONS.GUEST_READ]}>
      <DashboardLayout>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-playfair font-bold text-neutral">Meal Management</h2>
            <p className="text-sm text-gray-500">
              Manage meal options and track guest dietary preferences
            </p>
          </div>
        
        <Dialog open={isCreateDialogOpen || !!editingMeal} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingMeal(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              className="gold-gradient"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Meal Option
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMeal ? "Edit Meal Option" : "Create New Meal Option"}
              </DialogTitle>
              <DialogDescription>
                {editingMeal 
                  ? "Update the meal option details below."
                  : "Add a new meal option for your guests to choose from."
                }
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(editingMeal ? handleUpdateMeal : handleCreateMeal)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="ceremonyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ceremony</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a ceremony" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ceremonies.map((ceremony: any) => (
                            <SelectItem key={ceremony.id} value={ceremony.id.toString()}>
                              {ceremony.name}
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
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Chicken Biryani" {...field} />
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
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the meal ingredients and preparation..."
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-3">
                  <FormLabel>Dietary Restrictions</FormLabel>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isVegetarian"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Vegetarian</FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isVegan"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Vegan</FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isGlutenFree"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Gluten-Free</FormLabel>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="isNutFree"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">Nut-Free</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingMeal(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMealMutation.isPending || updateMealMutation.isPending}
                  >
                    {(createMealMutation.isPending || updateMealMutation.isPending) 
                      ? "Saving..." 
                      : editingMeal 
                        ? "Update Meal Option" 
                        : "Create Meal Option"
                    }
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl">
          <TabsTrigger value="overview">
            <TrendingUp className="mr-2 h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="ceremonies">
            <ChefHat className="mr-2 h-4 w-4" /> By Ceremony
          </TabsTrigger>
          <TabsTrigger value="selections">
            <Users className="mr-2 h-4 w-4" /> Guest Selections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Utensils className="h-5 w-5 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{totalMealOptions}</div>
                    <p className="text-muted-foreground text-sm">Total Meal Options</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="text-2xl font-bold">{vegetarianOptions}</div>
                    <p className="text-muted-foreground text-sm">Vegetarian Options</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-green-700 rounded-full"></div>
                  <div>
                    <div className="text-2xl font-bold">{veganOptions}</div>
                    <p className="text-muted-foreground text-sm">Vegan Options</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-blue-500 rounded-full"></div>
                  <div>
                    <div className="text-2xl font-bold">{glutenFreeOptions}</div>
                    <p className="text-muted-foreground text-sm">Gluten-Free Options</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Meal Options Overview</CardTitle>
              <CardDescription>All meal options across ceremonies</CardDescription>
            </CardHeader>
            <CardContent>
              {allMealOptions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Meal Name</TableHead>
                      <TableHead>Ceremony</TableHead>
                      <TableHead>Dietary Info</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allMealOptions.map((meal: any) => {
                      const ceremony = ceremonies.find(c => c.id === meal.ceremonyId);
                      return (
                        <TableRow key={meal.id}>
                          <TableCell className="font-medium">{meal.name}</TableCell>
                          <TableCell>{ceremony?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getDietaryBadges(meal)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{meal.description || '-'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMeal(meal)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMeal(meal.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <ChefHat className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium">No meal options yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first meal option to get started.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add First Meal Option
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ceremonies">
          <div className="space-y-6">
            {mealOptionsByCeremony.map((ceremony: any) => (
              <Card key={ceremony.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{ceremony.name}</span>
                    <Badge variant="secondary">
                      {ceremony.mealOptions.length} meal{ceremony.mealOptions.length !== 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {ceremony.description} • {new Date(ceremony.date).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {ceremony.mealOptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ceremony.mealOptions.map((meal: any) => (
                        <div key={meal.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{meal.name}</h4>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditMeal(meal)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMeal(meal.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          {meal.description && (
                            <p className="text-sm text-muted-foreground mb-2">{meal.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {getDietaryBadges(meal)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No meal options for this ceremony yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="selections">
          <Card>
            <CardHeader>
              <CardTitle>Guest Meal Selections</CardTitle>
              <CardDescription>Track which meals guests have selected</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium">Guest Selections Coming Soon</h3>
                <p className="text-muted-foreground">
                  Once guests start selecting meals through RSVP, their choices will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </DashboardLayout>
    </ProtectedRoute>
  );
}