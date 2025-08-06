import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Search, Heart, Users, Settings, Building2, HelpCircle, CheckCircle, Menu, Star, ThumbsUp, ThumbsDown, MessageCircle, Shield, Key, Lock, Calendar, Mail, BarChart3, UserPlus, Bell, Utensils } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import DashboardLayout from '@/components/layout/dashboard-layout';

interface UserGuide {
  id: string;
  title: string;
  description: string;
  steps: number;
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  content?: React.ReactNode;
}

interface UserType {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  guides: UserGuide[];
  color: string;
  requiredRole?: 'staff' | 'admin' | 'couple';
}

export default function DocsPage() {
  const [selectedUserType, setSelectedUserType] = useState<string>('guest');
  const [selectedGuide, setSelectedGuide] = useState<UserGuide | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  
  const userRole = user?.role || 'staff';

  // Role-based access control
  const hasAccess = (requiredRole?: string): boolean => {
    if (!requiredRole) return true;
    
    const roleHierarchy = { staff: 0, admin: 1, couple: 2 };
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;
    
    return userLevel >= requiredLevel;
  };

  const userTypes: UserType[] = [
    {
      id: 'guest',
      name: 'Wedding Guests',
      icon: <Users className="h-5 w-5" />,
      description: 'RSVP and manage your attendance',
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      guides: [
        {
          id: 'rsvp-response',
          title: 'How to RSVP to a Wedding',
          description: 'Respond to wedding invitations and select meal preferences',
          steps: 4,
          estimatedTime: '3 minutes',
          difficulty: 'Beginner',
          tags: ['rsvp', 'response', 'quick-start'],
          content: (
            <div className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Welcome!</strong> This guide will help you respond to a wedding invitation in just 3 minutes.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                      Open Your Invitation Link
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Check your email for the wedding invitation</li>
                      <li>• Click the "RSVP Now" button in the email</li>
                      <li>• Works on any device - phone, tablet, or computer</li>
                      <li>• If the button doesn't work, copy and paste the link</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                      Find Your Name
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Look for your name in the guest list</li>
                      <li>• Use the search box if you can't find it</li>
                      <li>• Name spelled wrong? Just select the closest match</li>
                      <li>• Contact the couple if you still can't find your name</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                      Choose Your Response
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm">✅ "Yes, I'll be there!" - You plan to attend</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-sm">❌ "Sorry, can't make it" - You cannot attend</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm">❓ "Maybe/Not sure yet" - You're unsure</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                      Complete Additional Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Select meal preferences (if attending)</li>
                      <li>• Add dietary restrictions or allergies</li>
                      <li>• Include plus-one details if applicable</li>
                      <li>• Add any special accommodation needs</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pro Tip:</strong> You can always update your response later using the same link!
                </AlertDescription>
              </Alert>
            </div>
          )
        },
        {
          id: 'update-response',
          title: 'Updating Your RSVP Response',
          description: 'Change your attendance or meal preferences',
          steps: 3,
          estimatedTime: '2 minutes',
          difficulty: 'Beginner',
          tags: ['editing', 'changes', 'updates']
        },
        {
          id: 'plus-one-rsvp',
          title: 'RSVPing for Plus-Ones',
          description: 'Add and manage responses for your plus-one',
          steps: 5,
          estimatedTime: '4 minutes',
          difficulty: 'Beginner',
          tags: ['plus-one', 'multiple-guests', 'family']
        },
        {
          id: 'event-details',
          title: 'Viewing Event Details',
          description: 'Access venue information, schedule, and special instructions',
          steps: 2,
          estimatedTime: '1 minute',
          difficulty: 'Beginner',
          tags: ['information', 'venue', 'schedule']
        }
      ]
    },
    {
      id: 'couple',
      name: 'Couples & Hosts',
      icon: <Heart className="h-5 w-5" />,
      description: 'Create and manage your wedding events',
      color: 'bg-rose-50 border-rose-200 text-rose-800',
      requiredRole: 'admin',
      guides: [
        {
          id: 'create-event',
          title: 'How to Create Your Wedding Event',
          description: 'Set up your wedding with guest lists, venues, and timing',
          steps: 8,
          estimatedTime: '10 minutes',
          difficulty: 'Beginner',
          tags: ['setup', 'getting-started', 'event-creation'],
          content: (
            <div className="space-y-6">
              <Alert className="border-rose-200 bg-rose-50">
                <Heart className="h-4 w-4" />
                <AlertDescription>
                  <strong>Creating Your Dream Wedding Event!</strong> This guide will walk you through setting up your perfect wedding event step by step.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Step 1: Basic Event Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-2">Essential Details</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• Wedding title (e.g., "Sarah & Mike's Wedding")</li>
                          <li>• Couple names for personalization</li>
                          <li>• Wedding date and time</li>
                          <li>• Venue name and full address</li>
                          <li>• Brief event description</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Step 2: RSVP Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Set RSVP deadline (usually 2-4 weeks before wedding)</li>
                      <li>• Allow plus-ones (optional)</li>
                      <li>• Collect children's details for meal planning</li>
                      <li>• Custom welcome message for guests</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Step 3: Communication Setup
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Email Provider (Recommended: Gmail)</h4>
                        <ol className="text-sm space-y-1 text-muted-foreground">
                          <li>1. Click "Email Settings" in your event dashboard</li>
                          <li>2. Select "Gmail" as your provider</li>
                          <li>3. Click "Connect Gmail Account"</li>
                          <li>4. Sign in and grant permissions</li>
                          <li>5. Test with a sample invitation</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <Star className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pro Tip:</strong> Start with basic settings and add advanced features later. You can always update your event settings!
                </AlertDescription>
              </Alert>
            </div>
          )
        },
        {
          id: 'manage-guest-list',
          title: 'Managing Your Guest List',
          description: 'Add, organize, and track your wedding guests',
          steps: 6,
          estimatedTime: '15 minutes',
          difficulty: 'Beginner',
          tags: ['guests', 'organization', 'invites']
        },
        {
          id: 'customize-invitations',
          title: 'Customizing Digital Invitations',
          description: 'Design and personalize your wedding invitations',
          steps: 10,
          estimatedTime: '20 minutes',
          difficulty: 'Intermediate',
          tags: ['design', 'invitations', 'branding']
        },
        {
          id: 'track-responses',
          title: 'Tracking RSVP Responses',
          description: 'Monitor guest responses and meal preferences',
          steps: 5,
          estimatedTime: '5 minutes',
          difficulty: 'Beginner',
          tags: ['tracking', 'responses', 'analytics']
        }
      ]
    },
    {
      id: 'admin',
      name: 'Platform Admins',
      icon: <Shield className="h-5 w-5" />,
      description: 'Manage platform settings and users',
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      requiredRole: 'admin',
      guides: [
        {
          id: 'user-management',
          title: 'Managing User Accounts',
          description: 'Create, edit, and deactivate user accounts',
          steps: 12,
          estimatedTime: '25 minutes',
          difficulty: 'Advanced',
          tags: ['users', 'accounts', 'permissions']
        },
        {
          id: 'analytics-dashboard',
          title: 'Using the Analytics Dashboard',
          description: 'Monitor platform usage and generate reports',
          steps: 8,
          estimatedTime: '15 minutes',
          difficulty: 'Intermediate',
          tags: ['analytics', 'reporting', 'insights']
        },
        {
          id: 'support-tickets',
          title: 'Managing Support Requests',
          description: 'Handle customer support tickets and escalations',
          steps: 9,
          estimatedTime: '18 minutes',
          difficulty: 'Intermediate',
          tags: ['support', 'tickets', 'customer-service']
        }
      ]
    },
    {
      id: 'super-admin',
      name: 'Super Admins',
      icon: <Key className="h-5 w-5" />,
      description: 'Full platform administration and configuration',
      color: 'bg-red-50 border-red-200 text-red-800',
      requiredRole: 'couple',
      guides: [
        {
          id: 'platform-setup',
          title: 'Platform Setup & Configuration',
          description: 'Initial platform configuration and system settings',
          steps: 15,
          estimatedTime: '45 minutes',
          difficulty: 'Advanced',
          tags: ['setup', 'configuration', 'system']
        },
        {
          id: 'provider-management',
          title: 'Provider Management',
          description: 'Configure email, SMS, and storage providers',
          steps: 10,
          estimatedTime: '30 minutes',
          difficulty: 'Advanced',
          tags: ['providers', 'integration', 'configuration']
        }
      ]
    }
  ];

  // Filter user types based on role access
  const accessibleUserTypes = userTypes.filter(userType => hasAccess(userType.requiredRole));

  const currentUserType = accessibleUserTypes.find(type => type.id === selectedUserType) || accessibleUserTypes[0];

  const filteredGuides = currentUserType?.guides.filter(guide =>
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const SidebarContent = () => (
    <div className="space-y-6">
      {/* User Role Badge */}
      <div className="mb-6">
        <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
          {userRole === 'couple' ? 'Super Admin' : userRole === 'admin' ? 'Admin' : 'User'} Access
        </Badge>
      </div>

      {/* User Type Selection */}
      <div>
        <h3 className="font-semibold text-sm text-gray-900 mb-3">Documentation Sections</h3>
        <div className="space-y-2">
          {accessibleUserTypes.map((userType) => (
            <button
              key={userType.id}
              onClick={() => {
                setSelectedUserType(userType.id);
                setSelectedGuide(null);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                selectedUserType === userType.id 
                  ? userType.color 
                  : 'hover:bg-gray-50'
              }`}
            >
              {userType.icon}
              <div className="flex-1">
                <div className="font-medium text-sm">{userType.name}</div>
                <div className="text-xs text-gray-500 mt-1">{userType.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Section Guides */}
      {currentUserType && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-900">Guides</h3>
            <Badge variant="secondary" className="text-xs">
              {filteredGuides.length}
            </Badge>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredGuides.map((guide) => (
                <button
                  key={guide.id}
                  onClick={() => {
                    setSelectedGuide(guide);
                    setCurrentStep(1);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-colors border ${
                    selectedGuide?.id === guide.id
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium text-sm">{guide.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{guide.description}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className={`text-xs ${getDifficultyColor(guide.difficulty)}`}>
                      {guide.difficulty}
                    </Badge>
                    <span className="text-xs text-gray-400">{guide.estimatedTime}</span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Progress Indicator */}
      {selectedGuide && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Progress</span>
            <span className="text-xs text-gray-500">{currentStep} of {selectedGuide.steps}</span>
          </div>
          <Progress value={(currentStep / selectedGuide.steps) * 100} className="h-2" />
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="md:hidden">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80">
                    <SidebarContent />
                  </SheetContent>
                </Sheet>
                
                <div className="flex items-center space-x-2">
                  <Heart className="h-8 w-8 text-rose-500" />
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Wedding RSVP</h1>
                    <p className="text-xs text-gray-500">Documentation Center</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search guides..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Support
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar - Hidden on mobile */}
            <div className="hidden md:block">
              <div className="sticky top-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documentation</CardTitle>
                    <CardDescription>
                      Step-by-step guides for all user types
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SidebarContent />
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">
              {!selectedGuide ? (
                /* Documentation Home */
                <div className="space-y-8">
                  <div>
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbPage>Documentation Home</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                    
                    <div className="mt-4">
                      <h1 className="text-3xl font-bold text-gray-900">Welcome to Wedding RSVP Docs</h1>
                      <p className="text-lg text-gray-600 mt-2">
                        Everything you need to know to make your wedding planning seamless and stress-free.
                      </p>
                    </div>
                  </div>

                  <Alert className="border-blue-200 bg-blue-50">
                    <HelpCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>New here?</strong> Start with the guides for your user type. Each guide includes step-by-step instructions with screenshots and estimated completion times.
                    </AlertDescription>
                  </Alert>

                  {/* User Type Cards */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {accessibleUserTypes.map((userType) => (
                      <Card 
                        key={userType.id} 
                        className="cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                        onClick={() => setSelectedUserType(userType.id)}
                      >
                        <CardHeader>
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg ${userType.color}`}>
                              {userType.icon}
                            </div>
                            <div>
                              <CardTitle className="text-xl">{userType.name}</CardTitle>
                              <CardDescription>{userType.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Available guides</span>
                              <Badge variant="secondary">{userType.guides.length}</Badge>
                            </div>
                            <div className="space-y-2">
                              {userType.guides.slice(0, 3).map((guide) => (
                                <div key={guide.id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-700">{guide.title}</span>
                                  <span className="text-gray-400">{guide.estimatedTime}</span>
                                </div>
                              ))}
                              {userType.guides.length > 3 && (
                                <div className="text-sm text-blue-600 font-medium">
                                  +{userType.guides.length - 3} more guides
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Popular Guides Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Popular Guides</CardTitle>
                      <CardDescription>Most frequently accessed documentation</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[
                          { title: "How to RSVP to a Wedding", userType: "Wedding Guests", time: "3 min", popularity: 98 },
                          { title: "How to Create Your Wedding Event", userType: "Couples & Hosts", time: "10 min", popularity: 94 },
                          { title: "Managing Your Guest List", userType: "Couples & Hosts", time: "15 min", popularity: 89 },
                          { title: "Managing User Accounts", userType: "Platform Admins", time: "25 min", popularity: 85 }
                        ].map((guide, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{guide.title}</div>
                              <div className="text-xs text-gray-500">{guide.userType} • {guide.time}</div>
                            </div>
                            <div className="text-xs text-gray-400">{guide.popularity}% helpful</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                /* Guide Detail View */
                <div className="space-y-6">
                  <div>
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#" onClick={() => setSelectedGuide(null)}>
                            Documentation
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#" onClick={() => setSelectedGuide(null)}>
                            {currentUserType?.name}
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>{selectedGuide.title}</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                  </div>

                  {/* Guide Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="text-2xl">{selectedGuide.title}</CardTitle>
                          <CardDescription className="text-base">{selectedGuide.description}</CardDescription>
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-gray-400" />
                              <span>{selectedGuide.steps} steps</span>
                            </div>
                            <div>⏱️ {selectedGuide.estimatedTime}</div>
                            <Badge className={getDifficultyColor(selectedGuide.difficulty)}>
                              {selectedGuide.difficulty}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setSelectedGuide(null)}
                        >
                          ← Back to {currentUserType?.name}
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Guide Progress */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Your Progress</h3>
                        <span className="text-sm text-gray-500">Step {currentStep} of {selectedGuide.steps}</span>
                      </div>
                      <Progress value={(currentStep / selectedGuide.steps) * 100} className="h-3" />
                    </CardContent>
                  </Card>

                  {/* Guide Content */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Step {currentStep}: {currentStep === 1 ? 'Getting Started' : `Step ${currentStep}`}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Render guide content if available */}
                      {selectedGuide.content || (
                        <div className="space-y-6">
                          <div className="prose max-w-none">
                            <p>This is where the step-by-step content for <strong>{selectedGuide.title}</strong> would appear.</p>
                            <p>Each step includes:</p>
                            <ul>
                              <li>Clear, numbered instructions</li>
                              <li>Annotated screenshots showing exactly where to click</li>
                              <li>GIFs for complex interactions</li>
                              <li>Contextual alerts for tips and warnings</li>
                            </ul>
                          </div>

                          {/* Screenshot Placeholder */}
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                            <div className="text-gray-400 text-lg font-medium">📷 Screenshot/GIF Placeholder</div>
                            <div className="text-sm text-gray-500 mt-2">
                              Annotated visual showing the UI element being described
                            </div>
                          </div>

                          <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Pro Tip:</strong> You can always come back and edit these settings later from your account dashboard.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}

                      {/* Navigation */}
                      <div className="flex items-center justify-between pt-6 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                          disabled={currentStep === 1}
                        >
                          ← Previous Step
                        </Button>
                        
                        <div className="flex items-center space-x-2">
                          {currentStep < selectedGuide.steps ? (
                            <Button
                              onClick={() => setCurrentStep(currentStep + 1)}
                            >
                              Next Step →
                            </Button>
                          ) : (
                            <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
                              <DialogTrigger asChild>
                                <Button>
                                  Complete Guide ✨
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>🎉 Guide Completed!</DialogTitle>
                                  <DialogDescription>
                                    You've successfully completed "{selectedGuide.title}". 
                                    Was this guide helpful?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-center space-x-4 py-4">
                                  <Button variant="outline" className="flex items-center space-x-2">
                                    <ThumbsUp className="h-4 w-4" />
                                    <span>Yes, helpful</span>
                                  </Button>
                                  <Button variant="outline" className="flex items-center space-x-2">
                                    <ThumbsDown className="h-4 w-4" />
                                    <span>Needs improvement</span>
                                  </Button>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline">
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Leave feedback
                                  </Button>
                                  <Button onClick={() => setFeedbackModalOpen(false)}>
                                    Continue exploring
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Related Guides */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Related Guides</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {currentUserType?.guides
                          .filter(guide => guide.id !== selectedGuide.id)
                          .slice(0, 4)
                          .map((guide) => (
                            <button
                              key={guide.id}
                              onClick={() => {
                                setSelectedGuide(guide);
                                setCurrentStep(1);
                              }}
                              className="text-left p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              <div className="font-medium text-sm">{guide.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{guide.description}</div>
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline" className={`text-xs ${getDifficultyColor(guide.difficulty)}`}>
                                  {guide.difficulty}
                                </Badge>
                                <span className="text-xs text-gray-400">{guide.estimatedTime}</span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}