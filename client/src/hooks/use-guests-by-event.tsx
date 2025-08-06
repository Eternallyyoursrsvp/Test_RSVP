import { useCurrentEvent } from './use-current-event';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from './use-toast';
import { queryClient } from '@/lib/queryClient';
import { post } from '@/lib/api-utils';
import { Guest } from './use-guest-with-context';

export function useGuestsByEvent() {
  const { currentEvent } = useCurrentEvent();
  
  const {
    data: guests = [],
    isLoading,
    error,
    refetch
  } = useQuery<Guest[]>({
    queryKey: ['guests', currentEvent?.id],
    queryFn: async () => {
      if (!currentEvent?.id) {
        return [];
      }

      const response = await fetch(`/api/events/${currentEvent.id}/guests`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch guests' }));
        throw new Error(errorData.message || 'Failed to fetch guests');
      }
      
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentEvent?.id,
    staleTime: 5000, // Cache for 5 seconds
    retry: 1, // Only retry once on failure
  });
  
  // Create a new guest
  const createGuestMutation = useMutation({
    mutationFn: async (guestData: Omit<Guest, 'id'>) => {
      if (!currentEvent?.id) throw new Error('No event selected');
      
      const res = await post(`/api/events/${currentEvent.id}/guests`, guestData);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate guests query to refresh the list
      if (currentEvent?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/events/${currentEvent.id}/guests`] 
        });
      }
      
      toast({
        title: 'Guest created',
        description: 'New guest was added successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('Error creating guest:', error);
      toast({
        title: 'Failed to create guest',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Import guests from Excel
  const importGuestsMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!currentEvent?.id) throw new Error('No event selected');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(`/api/events/${currentEvent.id}/guests/import`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text || res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate guests query to refresh the list
      if (currentEvent?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/events/${currentEvent.id}/guests`] 
        });
      }
      
      toast({
        title: 'Import successful',
        description: `Imported ${data.guests.length} guests.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error importing guests:', error);
      toast({
        title: 'Failed to import guests',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Export guests to Excel
  const exportGuests = async () => {
    if (!currentEvent?.id) {
      toast({
        title: 'Export failed',
        description: 'No event selected.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // Use a direct fetch to get the file
      const response = await fetch(`/api/events/${currentEvent.id}/guests/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`);
      }
      
      // Get the file name from the headers if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'guests.xlsx';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Convert response to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: 'Export successful',
        description: 'Guest list has been exported to Excel.',
      });
    } catch (error) {
      console.error('Error exporting guests:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  
  return {
    guests,
    isLoading,
    error,
    refetchGuests: refetch,
    createGuest: createGuestMutation.mutate,
    isCreating: createGuestMutation.isPending,
    importGuests: importGuestsMutation.mutate,
    isImporting: importGuestsMutation.isPending,
    exportGuests,
  };
}