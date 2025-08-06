import React from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { CORE_PERMISSIONS } from '@/hooks/use-permissions';
import { CommunicationDashboard } from '@/components/analytics/CommunicationDashboard';
import { useCurrentEvent } from '@/hooks/use-current-event';
import { useQuery } from '@tanstack/react-query';

export default function CommunicationDashboardPage() {
  const { currentEventId } = useCurrentEvent();
  
  // Fallback to first event only if currentEventId is not available
  const { data: events = [] } = useQuery<any[]>({
    queryKey: ['/api/events'],
  });
  
  const eventId = currentEventId || events?.[0]?.id || 1;

  return (
    <ProtectedRoute requiredPermission={CORE_PERMISSIONS.COMMUNICATIONS_READ}>
      <DashboardLayout>
        <div className="mb-6">
          <h2 className="text-3xl font-playfair font-bold text-neutral">Communication Dashboard</h2>
          <p className="text-sm text-gray-500">
            Monitor and analyze your communication performance across all channels
          </p>
        </div>
        
        <CommunicationDashboard eventId={eventId?.toString()} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}