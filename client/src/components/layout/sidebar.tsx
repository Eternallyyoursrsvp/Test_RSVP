import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Reply,
  Calendar,
  Plane,
  Car,
  Utensils,
  FileSpreadsheet,
  Settings,
  LogOut,
  Mail,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Hotel,
  BookOpen,
  MessageSquare,
  Shield,
  Activity,
  Server,
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentEvent } from "@/hooks/use-current-event";
import { 
  usePermissions, 
  useCanManageEvents, 
  useCanManageGuests, 
  useCanManageCommunications,
  useCanViewAnalytics,
  useCanManageSystem,
  useCanManageRBAC,
  useIsAdmin,
  CORE_PERMISSIONS
} from "@/hooks/use-permissions";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ isOpen, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { hasPermission } = usePermissions();
  const { currentEvent } = useCurrentEvent();
  
  // Core navigation items - always visible
  const coreMenuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard className="mr-3 h-5 w-5" />,
      path: "/dashboard",
      show: true
    },
  ];

  // Event management items
  const eventMenuItems = [
    {
      name: "Event Setup Wizard",
      icon: <Wand2 className="mr-3 h-5 w-5" />,
      path: "/event-setup-wizard",
      show: hasPermission([CORE_PERMISSIONS.EVENT_CREATE, CORE_PERMISSIONS.EVENT_MANAGE])
    },
    {
      name: "Events",
      icon: <Calendar className="mr-3 h-5 w-5" />,
      path: "/events",
      show: hasPermission(CORE_PERMISSIONS.EVENT_READ)
    },
  ];

  // Guest management items
  const guestMenuItems = [
    {
      name: "Guest List",
      icon: <Users className="mr-3 h-5 w-5" />,
      path: "/guests",
      show: hasPermission(CORE_PERMISSIONS.GUEST_READ)
    },
    {
      name: "RSVP Management",
      icon: <Reply className="mr-3 h-5 w-5" />,
      path: "/rsvp",
      show: hasPermission([CORE_PERMISSIONS.GUEST_READ, CORE_PERMISSIONS.GUEST_UPDATE])
    },
  ];

  // Communication items
  const communicationMenuItems = [
    {
      name: "Communication Dashboard",
      icon: <MessageSquare className="mr-3 h-5 w-5" />,
      path: "/communication-dashboard",
      show: hasPermission(CORE_PERMISSIONS.COMMUNICATIONS_READ)
    },
  ];

  // Travel & logistics items
  const travelMenuItems = [
    {
      name: "Flight Coordination",
      icon: <Plane className="mr-3 h-5 w-5" />,
      path: "/travel-management",
      show: hasPermission(CORE_PERMISSIONS.TRANSPORT_READ)
    },
    {
      name: "Transport Groups",
      icon: <Car className="mr-3 h-5 w-5" />,
      path: "/transport",
      show: hasPermission(CORE_PERMISSIONS.TRANSPORT_READ)
    },
    {
      name: "Accommodations",
      icon: <Hotel className="mr-3 h-5 w-5" />,
      path: "/accommodations",
      show: hasPermission(CORE_PERMISSIONS.EVENT_READ)
    },
    {
      name: "Meal Planning",
      icon: <Utensils className="mr-3 h-5 w-5" />,
      path: "/meals",
      show: hasPermission([CORE_PERMISSIONS.EVENT_READ, CORE_PERMISSIONS.GUEST_READ])
    },
  ];

  // Analytics & reporting items
  const analyticsMenuItems = [
    {
      name: "Reports",
      icon: <FileSpreadsheet className="mr-3 h-5 w-5" />,
      path: "/reports",
      show: hasPermission(CORE_PERMISSIONS.ANALYTICS_READ)
    },
  ];

  // System items
  const systemMenuItems = [
    {
      name: "Profile & Account",
      icon: <Users className="mr-3 h-5 w-5" />,
      path: "/profile",
      show: true // Always visible for authenticated users
    },
    {
      name: "Help & Documentation",
      icon: <BookOpen className="mr-3 h-5 w-5" />,
      path: "/docs",
      show: true // Always visible
    },
    {
      name: "Settings",
      icon: <Settings className="mr-3 h-5 w-5" />,
      path: "/settings",
      show: hasPermission([CORE_PERMISSIONS.EVENT_UPDATE, CORE_PERMISSIONS.EVENT_MANAGE])
    },
  ];

  // Combine all menu items
  const menuItems = [
    ...coreMenuItems,
    ...eventMenuItems,
    ...guestMenuItems,
    ...communicationMenuItems,
    ...travelMenuItems,
    ...analyticsMenuItems,
    ...systemMenuItems,
  ].filter(item => item.show);

  // Admin menu items - only show if user has system permissions
  const adminMenuItems = [
    {
      name: "Platform Admin",
      icon: <Shield className="mr-3 h-5 w-5" />,
      path: "/platform-admin",
      show: hasPermission(CORE_PERMISSIONS.SYSTEM_ADMIN)
    },
    {
      name: "User Management",
      icon: <Users className="mr-3 h-5 w-5" />,
      path: "/user-management",
      show: hasPermission(CORE_PERMISSIONS.SYSTEM_ADMIN)
    },
    {
      name: "RBAC Dashboard",
      icon: <Shield className="mr-3 h-5 w-5" />,
      path: "/rbac-dashboard",
      show: hasPermission(CORE_PERMISSIONS.SYSTEM_RBAC)
    },
    {
      name: "System Health",
      icon: <Activity className="mr-3 h-5 w-5" />,
      path: "/system-health",
      show: hasPermission([CORE_PERMISSIONS.SYSTEM_MONITOR, CORE_PERMISSIONS.SYSTEM_ADMIN])
    },
    {
      name: "Batch Operations",
      icon: <Database className="mr-3 h-5 w-5" />,
      path: `/batch-operations/${currentEvent?.id || ''}`,
      show: hasPermission([CORE_PERMISSIONS.SYSTEM_ADMIN, CORE_PERMISSIONS.ANALYTICS_READ])
    },
    {
      name: "Guest Relationships",
      icon: <Users className="mr-3 h-5 w-5" />,
      path: `/guest-relationships/${currentEvent?.id || ''}`,
      show: hasPermission([CORE_PERMISSIONS.GUEST_READ, CORE_PERMISSIONS.GUEST_UPDATE])
    },
  ].filter(item => item.show);

  const hasAdminAccess = adminMenuItems.length > 0;

  const sidebarClasses = cn(
    "glass flex-shrink-0 fixed h-full z-10 transition-all duration-300 lg:static border-r border-border",
    isCollapsed ? "w-16" : "w-56",
    isOpen ? "left-0" : (isCollapsed ? "-left-16 lg:left-0" : "-left-56 lg:left-0")
  );

  return (
    <aside className={sidebarClasses}>
      {/* Collapse Toggle - Desktop Only */}
      <div className="hidden lg:flex justify-end p-2">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="mt-2 px-2 space-y-1">
        {/* Main Menu Items */}
        {menuItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <div
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 hover:scale-105",
                location === item.path
                  ? "bg-primary/10 text-primary border-l-4 border-primary font-semibold"
                  : "text-foreground hover:bg-muted hover:text-primary",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <span className={cn("flex-shrink-0", !isCollapsed && "mr-3")}>
                {React.cloneElement(item.icon, { className: "h-5 w-5" })}
              </span>
              {!isCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </div>
          </Link>
        ))}
        
        {/* Admin Section Separator - Only show if user has admin access */}
        {hasAdminAccess && (
          <div className={cn("pt-4 mt-4 border-t border-border", isCollapsed && "mx-2")}>
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Platform Administration
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Admin Menu Items */}
        {adminMenuItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <div
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-all duration-200 hover:scale-105",
                location === item.path
                  ? "bg-primary/10 text-primary border-l-4 border-primary font-semibold"
                  : "text-foreground hover:bg-muted hover:text-primary",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <span className={cn("flex-shrink-0", !isCollapsed && "mr-3")}>
                {React.cloneElement(item.icon, { className: "h-5 w-5" })}
              </span>
              {!isCollapsed && (
                <span className="truncate">{item.name}</span>
              )}
            </div>
          </Link>
        ))}
      </nav>
      
      <div className={cn("mt-6", isCollapsed ? "px-2" : "px-4")}>
        <div className="pt-4 border-t border-border">
          <button
            className={cn(
              "w-full flex items-center px-3 py-2 text-sm font-medium rounded-md text-foreground hover:bg-muted hover:scale-105 transition-all duration-200",
              isCollapsed && "justify-center"
            )}
            onClick={logout}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
            {!isCollapsed && "Sign Out"}
          </button>
        </div>
      </div>
    </aside>
  );
}
