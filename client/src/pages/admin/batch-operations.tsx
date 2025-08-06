/**
 * Batch Operations Page
 * Admin dashboard page for comprehensive batch operations monitoring and management
 * Phase 3.4: Ferrari transformation implementation
 */

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import BatchOperationsDashboard from '@/components/admin/BatchOperationsDashboard';
import { useParams } from 'react-router-dom';

export default function BatchOperationsPage() {
  const { eventId } = useParams();

  return (
    <DashboardLayout>
      <BatchOperationsDashboard eventId={eventId} />
    </DashboardLayout>
  );
}