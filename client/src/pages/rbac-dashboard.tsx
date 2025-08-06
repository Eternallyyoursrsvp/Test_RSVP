import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { RBACDashboard } from "@/components/admin/rbac/RBACDashboard";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { RBACRoute } from "@/components/auth/protected-route";

export default function RBACDashboardPage() {
  const { currentEventId } = useCurrentEvent();

  return (
    <RBACRoute>
      <DashboardLayout>
        <RBACDashboard eventId={currentEventId} />
      </DashboardLayout>
    </RBACRoute>
  );
}