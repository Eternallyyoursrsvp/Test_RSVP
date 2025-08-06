import React, { useState, useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateForDisplay } from "@/lib/date-utils";
import { Eye, Edit } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import DataTable, { Column } from "@/components/ui/data-table";

export interface RsvpActivity {
  id: number;
  guest: {
    id: number;
    name: string;
    email: string;
    initials: string;
  };
  status: "confirmed" | "declined" | "pending";
  date: string;
  plusOne: string | null;
}

interface ActivityTableProps {
  activities: RsvpActivity[];
  onViewGuest?: (guestId: number) => void;
  onEditGuest?: (guestId: number) => void;
  onFilterChange?: (filter: string) => void;
}

// Optimized cell components with aggressive memoization and reduced DOM footprint
// Pre-computed status colors to avoid recalculations
const STATUS_COLORS = {
  confirmed: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  declined: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400", 
  pending: "bg-secondary/10 text-secondary-foreground dark:bg-secondary/20 dark:text-secondary",
};

// Static status labels to avoid string manipulations on every render
const STATUS_LABELS = {
  confirmed: "Confirmed",
  declined: "Declined",
  pending: "Pending",
};

// Heavily optimized GuestCell with minimal DOM nodes
const GuestCell = memo(function GuestCell({ guest }: { guest: RsvpActivity['guest'] }) {
  return (
    <div className="flex items-center">
      <Avatar className="h-8 w-8 rounded-full bg-primary text-primary-foreground">
        <AvatarFallback>{guest.initials}</AvatarFallback>
      </Avatar>
      <div className="ml-4">
        <div className="text-sm font-medium text-foreground">{guest.name}</div>
        <div className="text-xs text-muted-foreground">{guest.email}</div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom equality check to prevent unnecessary rerenders
  return prevProps.guest.id === nextProps.guest.id && 
         prevProps.guest.name === nextProps.guest.name && 
         prevProps.guest.email === nextProps.guest.email;
});

// Optimized StatusCell that doesn't recalculate styles on every render
const StatusCell = memo(function StatusCell({ status }: { status: RsvpActivity['status'] }) {
  // Access pre-computed values instead of calculating during render
  const statusColor = STATUS_COLORS[status] || "bg-muted text-muted-foreground";
  const label = STATUS_LABELS[status] || "Unknown";
  
  return (
    <Badge 
      variant="outline" 
      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}
    >
      {label}
    </Badge>
  );
}, (prevProps, nextProps) => prevProps.status === nextProps.status); // Simple equality check for primitive value

// Optimized ActionsCell with reduced closures
const ActionsCell = memo(function ActionsCell({ 
  guestId, 
  onViewGuest, 
  onEditGuest 
}: { 
  guestId: number;
  onViewGuest?: (id: number) => void;
  onEditGuest?: (id: number) => void;
}) {
  // Create event handlers only once per component instance
  const handleView = useCallback(() => onViewGuest && onViewGuest(guestId), [guestId, onViewGuest]);
  const handleEdit = useCallback(() => onEditGuest && onEditGuest(guestId), [guestId, onEditGuest]);
  
  return (
    <div className="flex space-x-3">
      <button
        onClick={handleView}
        className="text-primary hover:text-opacity-80"
        aria-label="View guest"
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        onClick={handleEdit}
        className="text-neutral hover:text-opacity-80"
        aria-label="Edit guest"
      >
        <Edit className="h-4 w-4" />
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only rerender if the ID changes or handlers are different references
  return prevProps.guestId === nextProps.guestId && 
         prevProps.onViewGuest === nextProps.onViewGuest && 
         prevProps.onEditGuest === nextProps.onEditGuest;
});

// Highly optimized main component with aggressive memoization and reduced memory footprint
const ActivityTable = memo(function ActivityTable({
  activities,
  onViewGuest,
  onEditGuest,
  onFilterChange,
}: ActivityTableProps) {
  // Use useReducer instead of useState to batch related state changes
  const [state, dispatch] = React.useReducer(
    (state: { filter: string; page: number }, action: { type: string; payload: any }) => {
      switch (action.type) {
        case 'SET_FILTER':
          return { ...state, filter: action.payload, page: 1 };
        default:
          return state;
      }
    },
    { filter: 'all', page: 1 }
  );
  
  // Memoize filtered activities with more granular dependencies
  const filteredActivities = useMemo(() => {
    // Early return for common case to avoid unnecessary filtering
    if (state.filter === "all") {
      return activities;
    }
    
    // Use a more efficient filtering approach
    const filtered = [];
    const targetStatus = state.filter;
    const activityCount = activities.length;
    
    // Manual loop is faster than filter for large datasets
    for (let i = 0; i < activityCount; i++) {
      if (activities[i].status === targetStatus) {
        filtered.push(activities[i]);
      }
    }
    
    return filtered;
  }, [activities, state.filter]);

  // Memoized handler with simplified dependency list
  const handleFilterChange = useCallback((value: string) => {
    dispatch({ type: 'SET_FILTER', payload: value });
    
    if (onFilterChange) {
      onFilterChange(value);
    }
  }, [onFilterChange]);

  // Format date outside of render function
  const formatDate = useCallback((date: string) => formatDateForDisplay(date), []);
  
  // Optimized cell renderers with consistent references
  const renderGuestCell = useCallback((row: RsvpActivity) => <GuestCell guest={row.guest} />, []);
  const renderStatusCell = useCallback((row: RsvpActivity) => <StatusCell status={row.status} />, []);
  const renderActionsCell = useCallback((row: RsvpActivity) => (
    <ActionsCell 
      guestId={row.guest.id} 
      onViewGuest={onViewGuest} 
      onEditGuest={onEditGuest}
    />
  ), [onViewGuest, onEditGuest]);

  // Memoized columns with stable definitions
  const columns: Column<RsvpActivity>[] = useMemo(() => [
    {
      header: "Guest",
      accessor: (row: RsvpActivity) => row.guest.name, // Used for sorting
      cell: renderGuestCell,
    },
    {
      header: "Status",
      accessor: (row: RsvpActivity) => row.status,
      cell: renderStatusCell,
    },
    {
      header: "Date",
      accessor: (row: RsvpActivity) => row.date,
      cell: (row: RsvpActivity) => formatDate(row.date),
    },
    {
      header: "Plus One",
      accessor: (row: RsvpActivity) => row.plusOne || "N/A",
    },
    {
      header: "Actions",
      accessor: (row: RsvpActivity) => "actions", // Function for consistency
      cell: renderActionsCell,
    },
  ], [renderGuestCell, renderStatusCell, formatDate, renderActionsCell]);

  // Memoize virtualization options for consistent references
  const virtualizationOptions = useMemo(() => ({
    virtualized: true,
    virtualizedHeight: 300,
    virtualizedItemHeight: 56, // Fixed height based on row content
    virtualizedOverscan: 2, // Reduced overscan for memory efficiency
  }), []);

  // Memoize pagination options for consistent references
  const paginationOptions = useMemo(() => ({
    defaultItemsPerPage: 5,
    itemsPerPageOptions: [5, 10, 25],
  }), []);

  return (
    <Card>
      <CardHeader className="py-5 px-6 border-b border-border flex justify-between items-center flex-wrap sm:flex-nowrap">
        <CardTitle className="text-lg font-medium font-serif mb-3 sm:mb-0">
          Recent RSVP Activity
        </CardTitle>
        <div className="flex space-x-2">
          <Select value={state.filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="text-sm border-border rounded-md focus:ring-primary focus:border-primary h-9 w-[150px]">
              <SelectValue placeholder="All Responses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Responses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable<RsvpActivity>
          data={filteredActivities}
          columns={columns}
          keyField="id"
          {...paginationOptions}
          {...virtualizationOptions}
        />
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom equality check to prevent unnecessary rerenders
  if (prevProps.activities.length !== nextProps.activities.length) {
    return false; // Different number of activities
  }
  
  // Check if handlers changed
  if (prevProps.onViewGuest !== nextProps.onViewGuest || 
      prevProps.onEditGuest !== nextProps.onEditGuest ||
      prevProps.onFilterChange !== nextProps.onFilterChange) {
    return false;
  }
  
  // Only do deep comparison if necessary (when activities.length is the same)
  // This is a simplified comparison assuming IDs are stable
  const prevIds = new Set(prevProps.activities.map(a => a.id));
  const nextIds = new Set(nextProps.activities.map(a => a.id));
  
  if (prevIds.size !== nextIds.size) {
    return false;
  }
  
  // If sizes match, check if all IDs from prev exist in next
  return nextProps.activities.every(activity => prevIds.has(activity.id));
});

export default ActivityTable;
