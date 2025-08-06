/**
 * System Health Page
 * Admin dashboard page for comprehensive system health monitoring
 * Phase 3.3: Ferrari transformation implementation
 */

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import SystemHealthDashboard from '@/components/admin/SystemHealthDashboard';

export default function SystemHealthPage() {
  return (
    <DashboardLayout>
      <SystemHealthDashboard />
    </DashboardLayout>
  );
}