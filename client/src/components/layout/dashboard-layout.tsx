import React, { useState } from "react";
import Header from "./header";
import Sidebar from "./sidebar";
import { formatDateForDisplay } from "@/lib/date-utils";
import EventDropdownSelector from "../event/event-dropdown-selector";
import { useCurrentEvent } from "@/hooks/use-current-event";
import Footer from "./footer";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Use our custom hook to get the current event
  const { currentEvent } = useCurrentEvent();

  const eventData = currentEvent ? {
    title: currentEvent.title,
    date: `${formatDateForDisplay(currentEvent.startDate)} - ${formatDateForDisplay(currentEvent.endDate)}`
  } : undefined;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Create an overlay that closes the sidebar when clicked (on mobile)
  const handleOverlayClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header 
        toggleSidebar={toggleSidebar} 
        toggleSidebarCollapse={toggleSidebarCollapse}
        sidebarCollapsed={sidebarCollapsed}
        currentEvent={eventData} 
      />

      <div className="flex flex-1">
        <Sidebar 
          isOpen={sidebarOpen} 
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
        />

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-[5] bg-black/50 lg:hidden"
            onClick={handleOverlayClick}
          />
        )}

        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-3 md:p-4 lg:p-6">
            <div className="w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}

export default DashboardLayout;