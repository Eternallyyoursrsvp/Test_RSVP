import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { PermissionsProvider } from "@/hooks/use-permissions";

import { Suspense, lazy } from "react";
import { Spinner } from "@/components/ui/spinner";

// Smart bundle splitting - group by functionality for optimal loading
const NotFound = lazy(() => import("@/pages/not-found"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const ChangePasswordPage = lazy(() => import(/* webpackChunkName: "auth" */ "@/pages/change-password"));

// Core dashboard - high priority preload
const Dashboard = lazy(() => import(/* @vite-preload */ /* webpackChunkName: "core" */ "@/pages/dashboard"));
const GuestList = lazy(() => import(/* @vite-preload */ /* webpackChunkName: "core" */ "@/pages/guest-list"));
const Events = lazy(() => import(/* @vite-preload */ /* webpackChunkName: "core" */ "@/pages/events"));

// RSVP module - separate chunk
const RsvpManagement = lazy(() => import(/* webpackChunkName: "rsvp" */ "@/pages/rsvp-management"));
const RsvpPage = lazy(() => import(/* webpackChunkName: "rsvp" */ "@/pages/rsvp-page"));
const RsvpDemo = lazy(() => import(/* webpackChunkName: "rsvp" */ "@/pages/rsvp-demo"));

// Travel and accommodation - separate chunk  
const Travel = lazy(() => import(/* webpackChunkName: "travel" */ "@/pages/travel"));
const TravelManagement = lazy(() => import(/* webpackChunkName: "travel" */ "@/pages/travel-management"));
const Accommodations = lazy(() => import(/* webpackChunkName: "travel" */ "@/pages/accommodations-simple"));
const Hotels = lazy(() => import(/* webpackChunkName: "travel" */ "@/pages/hotels"));
const TransportPage = lazy(() => import(/* webpackChunkName: "travel" */ "@/pages/transport"));
const TransportAssignmentsPage = lazy(() => import(/* webpackChunkName: "travel" */ "@/pages/transport-assignments"));

// Admin and settings - separate chunk
const Meals = lazy(() => import(/* webpackChunkName: "admin" */ "@/pages/meals"));
const Reports = lazy(() => import(/* webpackChunkName: "admin" */ "@/pages/reports"));
const Settings = lazy(() => import(/* webpackChunkName: "admin" */ "@/pages/settings"));
const EventSettings = lazy(() => import(/* webpackChunkName: "admin" */ "@/pages/event-settings"));
const EventSetupWizard = lazy(() => import(/* webpackChunkName: "admin" */ "@/pages/event-setup-wizard"));
const Docs = lazy(() => import(/* webpackChunkName: "admin" */ "@/pages/docs"));

// Platform admin components - separate chunk for enterprise features
const PlatformAdminDashboard = lazy(() => import(/* webpackChunkName: "platform-admin" */ "@/pages/platform-admin-dashboard"));
const RBACDashboardPage = lazy(() => import(/* webpackChunkName: "platform-admin" */ "@/pages/rbac-dashboard"));
const SystemHealthDashboard = lazy(() => import(/* webpackChunkName: "platform-admin" */ "@/pages/system-health-dashboard"));
const UserManagementPage = lazy(() => import(/* webpackChunkName: "platform-admin" */ "@/pages/user-management"));
const BatchOperationsPage = lazy(() => import(/* webpackChunkName: "platform-admin" */ "@/pages/admin/batch-operations"));
const GuestRelationshipsPage = lazy(() => import(/* webpackChunkName: "platform-admin" */ "@/pages/admin/guest-relationships"));

// Communication Dashboard - separate chunk
const CommunicationDashboardPage = lazy(() => import(/* webpackChunkName: "communication" */ "@/pages/communication-dashboard"));

// Profile and Account Management - separate chunk
const ProfilePage = lazy(() => import(/* webpackChunkName: "profile" */ "@/pages/profile"));

// Landing and marketing - temporarily direct imports to fix loading issues
import ImmersiveLanding from "@/pages/immersive-landing";
import MessageSection from "@/pages/message-section";
const OAuthCallbackSuccess = lazy(() => import(/* webpackChunkName: "auth" */ "@/components/auth/oauth-callback-success"));

// Setup page for first-time configuration
const FirstTimeSetup = lazy(() => import(/* webpackChunkName: "setup" */ "@/pages/first-time-setup"));

// Bootstrap router for automatic setup detection
import BootstrapRouter from "@/components/bootstrap-router";



// Optimized loading component with minimal render cost
const LoadingSpinner = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <Suspense fallback={<LoadingSpinner />}>
        <Switch>
          {/* First-time setup route */}
          <Route path="/setup" component={FirstTimeSetup} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/change-password" component={ChangePasswordPage} />
          {/* RSVP routes - capture all possible formats */}
          <Route path="/guest-rsvp/:rest*">
            {(params) => <RsvpPage />}
          </Route>
          <Route path="/oauth/callback/:provider" component={OAuthCallbackSuccess} />
          <Route path="/rsvp-demo" component={RsvpDemo} />
          <Route path="/">
            {() => <ImmersiveLanding />}
          </Route>
          <Route path="/engagement" component={MessageSection} />
          <Route path="/dashboard">
            {() => (
              
                <Dashboard />
              
            )}
          </Route>
        <Route path="/guests">
          {() => <GuestList />}
        </Route>
        <Route path="/rsvp">
          {() => (
            
              <RsvpManagement />
            
          )}
        </Route>
        <Route path="/communication-dashboard">
          {() => (
            
              <CommunicationDashboardPage />
            
          )}
        </Route>
        <Route path="/events">
          {() => (
            
              <Events />
            
          )}
        </Route>
        <Route path="/travel">
          {() => (
            
              <Travel />
            
          )}
        </Route>
        <Route path="/travel-management">
          {() => (
            
              <TravelManagement />
            
          )}
        </Route>
        <Route path="/accommodations">
          {() => (
            
              <Accommodations />
            
          )}
        </Route>
        <Route path="/hotels">
          {() => (
            
              <Hotels />
            
          )}
        </Route>
        <Route path="/meals">
          {() => (
            
              <Meals />
            
          )}
        </Route>
        <Route path="/reports">
          {() => (
            
              <Reports />
            
          )}
        </Route>
        <Route path="/settings">
          {() => (
            
              <Settings />
            
          )}
        </Route>
        <Route path="/event-settings">
          {() => (
            
              <EventSettings />
            
          )}
        </Route>

        <Route path="/transport">
          {() => (
            
              <TransportPage />
            
          )}
        </Route>
        <Route path="/transport-assignments">
          {() => (
            
              <TransportAssignmentsPage />
            
          )}
        </Route>
        <Route path="/event-setup-wizard/:eventId?">
          {({ eventId }) => (
            
              <EventSetupWizard />
            
          )}
        </Route>
        <Route path="/wizard/:step?">
          {({ step }) => (
            
              <EventSetupWizard initialStep={step} />
            
          )}
        </Route>
        <Route path="/docs">
          {() => (
            
              <Docs />
            
          )}
        </Route>

        {/* Profile and Account Management */}
        <Route path="/profile">
          {() => (
            
              <ProfilePage />
            
          )}
        </Route>

        {/* Platform Admin Routes - Enterprise Features */}
        <Route path="/platform-admin">
          {() => (
            
              <PlatformAdminDashboard />
            
          )}
        </Route>
        <Route path="/rbac-dashboard">
          {() => (
            
              <RBACDashboardPage />
            
          )}
        </Route>
        <Route path="/system-health">
          {() => (
            
              <SystemHealthDashboard />
            
          )}
        </Route>
        <Route path="/user-management">
          {() => (
            
              <UserManagementPage />
            
          )}
        </Route>
        <Route path="/batch-operations/:eventId?">
          {({ eventId }) => (
            
              <BatchOperationsPage />
            
          )}
        </Route>
        <Route path="/guest-relationships/:eventId?">
          {({ eventId }) => (
            
              <GuestRelationshipsPage />
            
          )}
        </Route>

        <Route component={NotFound} />
      </Switch>
      </Suspense>
      <Toaster />
      </PermissionsProvider>
    </AuthProvider>
  );
}

export default App;
