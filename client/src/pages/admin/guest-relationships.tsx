/**
 * Guest Relationships Page
 * Admin dashboard page for comprehensive guest relationship management
 * Phase 3.5: Ferrari transformation implementation
 */

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import GuestRelationshipDashboard from '@/components/admin/GuestRelationshipDashboard';
import { useParams } from 'react-router-dom';

export default function GuestRelationshipsPage() {
  const { eventId } = useParams();

  return (
    <DashboardLayout>
      <GuestRelationshipDashboard eventId={eventId} />
    </DashboardLayout>
  );
}