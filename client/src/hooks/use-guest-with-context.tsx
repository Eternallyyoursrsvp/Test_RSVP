import { useCurrentEvent } from './use-current-event';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from './use-toast';
import { queryClient } from '@/lib/queryClient';
import { get, put, post, del } from '@/lib/api-utils';

export interface Guest {
  id: number;
  eventId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  side: string;
  // Add other fields as needed
}

export function useGuestWithContext(guestId: number | undefined) {
  const { currentEvent } = useCurrentEvent();
  
  // Use event context in the query when available
  const { data: guest, isLoading, error } = useQuery<Guest>({
    queryKey: guestId && currentEvent?.id ? [
      `/api/guests/${guestId}`, 
      { eventId: currentEvent.id }
    ] : ['placeholder-key-that-wont-run'],
    enabled: !!guestId && !!currentEvent?.id,
  });
  
  // Update a guest with event context
  const updateGuestMutation = useMutation({
    mutationFn: async (guestData: Partial<Guest>) => {
      if (!guestId) throw new Error('No guest ID provided');
      
      const res = await put(`/api/guests/${guestId}`, {
        ...guestData,
        eventId: currentEvent?.id ? currentEvent.id : 0
      });
      return res.data;
    },
    onSuccess: (updatedGuest) => {
      // Invalidate all guest-related queries for this event
      if (currentEvent?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/events/${currentEvent.id}/guests`] 
        });
      }
      
      // Update the individual guest cache
      queryClient.setQueryData(
        [`/api/guests/${guestId}`, { eventId: currentEvent?.id }],
        updatedGuest
      );
      
      toast({
        title: 'Guest updated',
        description: `${updatedGuest.firstName} ${updatedGuest.lastName} was updated successfully.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error updating guest:', error);
      toast({
        title: 'Failed to update guest',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Delete a guest with event context
  const deleteGuestMutation = useMutation({
    mutationFn: async () => {
      if (!guestId) throw new Error('No guest ID provided');
      
      await del(`/api/guests/${guestId}?eventId=${currentEvent?.id ? currentEvent.id : 0}`);
    },
    onSuccess: () => {
      // Invalidate all guest-related queries for this event
      if (currentEvent?.id) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/events/${currentEvent.id}/guests`] 
        });
      }
      
      toast({
        title: 'Guest deleted',
        description: 'Guest was removed successfully.',
      });
    },
    onError: (error: Error) => {
      console.error('Error deleting guest:', error);
      toast({
        title: 'Failed to delete guest',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  return {
    guest,
    isLoading,
    error,
    updateGuest: updateGuestMutation.mutate,
    isUpdating: updateGuestMutation.isPending,
    deleteGuest: deleteGuestMutation.mutate,
    isDeleting: deleteGuestMutation.isPending,
  };
}