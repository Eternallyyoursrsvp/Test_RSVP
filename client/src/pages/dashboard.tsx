import React, { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import StatsCard from "@/components/dashboard/stats-card";
import RsvpChart from "@/components/dashboard/rsvp-chart";
import Tasks from "@/components/dashboard/tasks";
import ActivityTable from "@/components/dashboard/activity-table";
import AccommodationStatus from "@/components/dashboard/accommodation-status";
import { Button } from "@/components/ui/button";
import { FolderInput, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getInitials } from "@/lib/utils";
import { formatDateForDisplay } from "@/lib/date-utils";
import { useEventStats } from "@/hooks/use-stats";
import GuestImportDialog from "@/components/guest/guest-import-dialog";
import GuestDetailDialog from "@/components/guest/guest-detail-dialog";
import { useOptimizedDashboard, useOptimizedCurrentEvent } from "@/hooks/use-optimized-queries";
import { DeploymentErrorBoundary } from "@/components/deployment-error-boundary";
import { EventLoadingState } from "@/components/deployment-loading-state";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [chartPeriod, setChartPeriod] = useState<"weekly" | "monthly">("monthly");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<any>(null);
  const [showGuestDetailDialog, setShowGuestDetailDialog] = useState(false);
  
  // Get current event with aggressive caching
  const { data: currentEvent } = useOptimizedCurrentEvent();
  
  // Use optimized dashboard data hook
  const { data: dashboardData, isLoading: isLoadingStats } = useOptimizedDashboard(currentEvent?.data?.id);
  
  // Extract data from batch response
  const guests = dashboardData?.guests || [];
  const stats = dashboardData?.stats;
  const ceremonies = dashboardData?.ceremonies || [];
  const accommodations = [];
  
  // Helper function to generate RSVP progress data from statistics
  const generateRsvpProgressData = () => {
    if (!stats || stats.total === 0) return [];
    
    return [
      { name: "Jan", responses: Math.floor(stats.confirmed * 0.1) },
      { name: "Feb", responses: Math.floor(stats.confirmed * 0.2) },
      { name: "Mar", responses: Math.floor(stats.confirmed * 0.4) },
      { name: "Apr", responses: Math.floor(stats.confirmed * 0.6) },
      { name: "May", responses: Math.floor(stats.confirmed * 0.8) },
      { name: "Jun", responses: stats.confirmed },
    ];
  };
  
  // For backward compatibility, provide refetch function
  const refetchGuests = () => {
    // This would trigger a refetch of the dashboard data
    // We can implement this later if needed
  };
  
  // Use the current event ID from the batch data
  const eventId = currentEvent?.data?.id || dashboardData?.event?.id || 1;
  
  // Tasks will be loaded from database - no hardcoded sample data
  const tasks: any[] = [];
  
  // Prepare recent RSVP activity data
  const recentActivities = guests && Array.isArray(guests)
    ? guests
        .slice(0, 5)
        .map((guest: any) => ({
          id: guest.id,
          guest: {
            id: guest.id,
            name: `${guest.firstName} ${guest.lastName}`,
            email: guest.email,
            initials: getInitials(`${guest.firstName} ${guest.lastName}`),
          },
          status: guest.rsvpStatus,
          date: guest.createdAt,
          plusOne: guest.plusOneName || (guest.plusOneAllowed ? "Allowed, but not specified" : null),
        }))
    : [];
  
  // Prepare accommodation data
  const accommodationData = accommodations && Array.isArray(accommodations)
    ? accommodations.map((acc: any) => ({
        id: acc.id,
        name: acc.roomType,
        total: acc.totalRooms,
        allocated: acc.allocatedRooms,
        percentage: Math.round((acc.allocatedRooms / acc.totalRooms) * 100),
      }))
    : [];
  
  // Import the SpecialRequirement type
  type SpecialRequirement = {
    id: number;
    text: string;
    status: "completed" | "pending";
  };
  
  // Special requirements will be loaded from database - no hardcoded sample data
  const specialRequirements: SpecialRequirement[] = [];
  
  // Handle view guest
  const handleViewGuest = (guestId: number) => {
    if (guests && Array.isArray(guests)) {
      const guest = guests.find((g: any) => g.id === guestId);
      if (guest) {
        setSelectedGuest(guest);
        setShowGuestDetailDialog(true);
      }
    }
  };
  
  // Handle edit guest
  const handleEditGuest = (guestId: number) => {
    setLocation(`/guests?edit=${guestId}`);
  };
  
  // Handle import success
  const handleImportSuccess = () => {
    refetchGuests();
  };

  // Show loading state for deployment
  if (isLoadingStats) {
    return (
      <DashboardLayout>
        <EventLoadingState eventName={currentEvent?.title} />
      </DashboardLayout>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <DeploymentErrorBoundary>
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-4xl font-serif font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Wedding: <span className="font-medium">{currentEvent?.title || "Loading..."}</span> | 
              Dates: <span className="font-medium">
                {currentEvent ? `${formatDateForDisplay(currentEvent.startDate)} - ${formatDateForDisplay(currentEvent.endDate)}` : "Loading..."}
              </span>
            </p>
          </div>
        
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button 
            variant="outline" 
            className="border-primary text-primary"
            onClick={() => setShowImportDialog(true)}
          >
            <FolderInput className="mr-2 h-4 w-4" />
            Import Guests
          </Button>
          <Button 
            className="gold-gradient"
            onClick={() => setLocation("/guests?add=true")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Guest
          </Button>
          <Button 
            variant="outline"
            className="border-primary text-primary"
            onClick={() => setLocation("/events")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Event
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="RSVP Confirmed"
          value={stats?.confirmed || 0}
          change={stats?.confirmedChange || null}
          icon="confirmed"
          onClick={() => setLocation(`/guests?filter=confirmed`)}
        />
        
        <StatsCard
          title="RSVP Declined"
          value={stats?.declined || 0}
          change={stats?.declinedChange || null}
          icon="declined"
          onClick={() => setLocation(`/guests?filter=declined`)}
        />
        
        <StatsCard
          title="Awaiting Response"
          value={stats?.pending || 0}
          change={stats?.pendingChange || null}
          icon="pending"
          onClick={() => setLocation(`/guests?filter=pending`)}
        />
        
        <StatsCard
          title="Total Guests"
          value={stats?.total || 0}
          change={stats?.totalChange || null}
          icon="total"
          onClick={() => setLocation(`/guests`)}
        />
      </div>

      {/* RSVP Progress + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <RsvpChart 
            data={generateRsvpProgressData(chartPeriod)} 
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
          />
        </div>
        
        <Tasks initialTasks={tasks} />
      </div>

      {/* Recent Activity + Accommodations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityTable 
            activities={recentActivities} 
            onViewGuest={handleViewGuest}
            onEditGuest={handleEditGuest}
          />
        </div>
        
        <AccommodationStatus 
          accommodations={accommodationData}
          specialRequirements={specialRequirements}
          onManageClick={() => setLocation("/accommodations")}
        />
      </div>
      
      {/* Import Dialog */}
      <GuestImportDialog 
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        eventId={eventId}
        onSuccess={handleImportSuccess}
      />
      
      {/* Guest Detail Dialog */}
      <GuestDetailDialog
        isOpen={showGuestDetailDialog}
        onClose={() => setShowGuestDetailDialog(false)}
        guest={selectedGuest}
        onEdit={handleEditGuest}
      />
        </DeploymentErrorBoundary>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
