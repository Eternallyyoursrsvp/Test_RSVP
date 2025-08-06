import React from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { SystemAdminRoute } from "@/components/auth/protected-route";

export default function PlatformAdminDashboard() {
  return (
    <SystemAdminRoute>
      <DashboardLayout>
        <AdminDashboard />
      </DashboardLayout>
    </SystemAdminRoute>
  );
}