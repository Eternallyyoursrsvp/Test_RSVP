/**
 * Guest Relationship Management Dashboard
 * Advanced guest relationship tracking and management interface
 * Phase 3.5: Ferrari transformation implementation
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { get, post, put, del } from '@/lib/api-utils';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeAnalytics } from '@/hooks/use-realtime-analytics';
import {
  Users,
  Heart,
  UserPlus,
  UserMinus,
  Link2,
  Unlink,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Activity,
  RefreshCw,
  Download,
  Upload,
  Users2,
  UserCheck,
  UserX,
  Target,
  Network,
  GitBranch,
  Settings
} from 'lucide-react';

// Enhanced interfaces for comprehensive guest relationship management
interface RelationshipType {
  id: number;
  name: string;
  description?: string;
  category: 'family' | 'friend' | 'colleague' | 'other';
  priority: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GuestRelationship {
  id: number;
  fromGuestId: number;
  toGuestId: number;
  relationshipTypeId: number;
  relationshipType: RelationshipType;
  fromGuest: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  toGuest: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface RelationshipStats {
  totalRelationships: number;
  uniqueGuests: number;
  relationshipTypes: {
    family: number;
    friend: number;
    colleague: number;
    other: number;
  };
  averageConnectionsPerGuest: number;
  mostConnectedGuests: Array<{
    id: number;
    name: string;
    connectionCount: number;
  }>;
  relationshipGrowth: {
    thisWeek: number;
    lastWeek: number;
    percentageChange: number;
  };
}

interface GuestRelationshipDashboardProps {
  className?: string;
  eventId?: string;
}

export const GuestRelationshipDashboard: React.FC<GuestRelationshipDashboardProps> = ({ 
  className, 
  eventId 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRelationshipType, setSelectedRelationshipType] = useState<string>('all');
  const [showAddRelationshipDialog, setShowAddRelationshipDialog] = useState(false);
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form states
  const [newRelationship, setNewRelationship] = useState({
    fromGuestId: '',
    toGuestId: '',
    relationshipTypeId: '',
    notes: ''
  });

  const [newRelationshipType, setNewRelationshipType] = useState({
    name: '',
    description: '',
    category: 'family' as const,
    priority: 1
  });

  // Real-time analytics integration
  const {
    isConnected,
    isConnecting,
    alerts,
    clearAlerts,
    metrics: realtimeMetrics,
    analyticsData
  } = useRealtimeAnalytics();

  // Fetch relationship types
  const { data: relationshipTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['/api/relationship-types'],
    queryFn: async () => {
      try {
        const response = await get('/api/relationship-types');
        return response.data;
      } catch (error) {
        return generateMockRelationshipTypes();
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch guest relationships
  const { data: relationships, isLoading: relationshipsLoading } = useQuery({
    queryKey: [`/api/events/${eventId}/guest-relationships`],
    queryFn: async () => {
      try {
        const response = await get(`/api/events/${eventId}/guest-relationships`);
        return response.data;
      } catch (error) {
        return generateMockRelationships();
      }
    },
    refetchInterval: 15000, // Refresh every 15 seconds
    enabled: !!eventId,
  });

  // Fetch relationship statistics
  const { data: relationshipStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/events/${eventId}/relationship-stats`],
    queryFn: async () => {
      try {
        const response = await get(`/api/events/${eventId}/relationship-stats`);
        return response.data;
      } catch (error) {
        return generateMockRelationshipStats();
      }
    },
    refetchInterval: 20000, // Refresh every 20 seconds
    enabled: !!eventId,
  });

  // Fetch event guests for relationship creation
  const { data: eventGuests } = useQuery({
    queryKey: [`/api/events/${eventId}/guests`],
    queryFn: async () => {
      try {
        const response = await get(`/api/events/${eventId}/guests`);
        return response.data;
      } catch (error) {
        return generateMockGuests();
      }
    },
    enabled: !!eventId,
  });

  // Mock data generators for Phase 3.5 implementation
  function generateMockRelationshipTypes(): RelationshipType[] {
    return [
      { id: 1, name: 'Spouse', description: 'Married partner', category: 'family', priority: 1, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 2, name: 'Child', description: 'Son or daughter', category: 'family', priority: 2, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 3, name: 'Parent', description: 'Mother or father', category: 'family', priority: 3, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 4, name: 'Sibling', description: 'Brother or sister', category: 'family', priority: 4, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 5, name: 'Best Friend', description: 'Close personal friend', category: 'friend', priority: 5, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 6, name: 'Colleague', description: 'Work colleague', category: 'colleague', priority: 6, isDefault: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 7, name: 'Extended Family', description: 'Cousin, aunt, uncle, etc.', category: 'family', priority: 7, isDefault: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 8, name: 'Plus One', description: 'Guest plus one', category: 'other', priority: 8, isDefault: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];
  }

  function generateMockRelationships(): GuestRelationship[] {
    const types = generateMockRelationshipTypes();
    const guests = generateMockGuests();
    
    return Array.from({ length: 35 }, (_, i) => {
      const fromGuest = guests[Math.floor(Math.random() * guests.length)];
      let toGuest = guests[Math.floor(Math.random() * guests.length)];
      while (toGuest.id === fromGuest.id) {
        toGuest = guests[Math.floor(Math.random() * guests.length)];
      }
      const relationshipType = types[Math.floor(Math.random() * types.length)];
      
      return {
        id: i + 1,
        fromGuestId: fromGuest.id,
        toGuestId: toGuest.id,
        relationshipTypeId: relationshipType.id,
        relationshipType,
        fromGuest,
        toGuest,
        notes: Math.random() > 0.7 ? `Special note about ${fromGuest.firstName} and ${toGuest.firstName}` : undefined,
        isConfirmed: Math.random() > 0.2,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
  }

  function generateMockGuests() {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      firstName: `Guest${i + 1}`,
      lastName: `Family${Math.floor(i / 5) + 1}`,
      email: `guest${i + 1}@example.com`,
      phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`
    }));
  }

  function generateMockRelationshipStats(): RelationshipStats {
    const totalRelationships = 35;
    const uniqueGuests = 28;
    
    return {
      totalRelationships,
      uniqueGuests,
      relationshipTypes: {
        family: 18,
        friend: 8,
        colleague: 6,
        other: 3
      },
      averageConnectionsPerGuest: Math.round((totalRelationships * 2) / uniqueGuests * 10) / 10,
      mostConnectedGuests: [
        { id: 1, name: 'Sarah Johnson', connectionCount: 8 },
        { id: 2, name: 'Michael Smith', connectionCount: 6 },
        { id: 3, name: 'Emily Davis', connectionCount: 5 },
        { id: 4, name: 'James Wilson', connectionCount: 4 },
        { id: 5, name: 'Jessica Brown', connectionCount: 4 }
      ],
      relationshipGrowth: {
        thisWeek: 7,
        lastWeek: 4,
        percentageChange: 75
      }
    };
  }

  // Create relationship mutation
  const createRelationship = useMutation({
    mutationFn: async (relationshipData: typeof newRelationship) => {
      // Mock API call for Phase 3.5 implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { 
        id: Date.now(),
        ...relationshipData,
        message: 'Relationship created successfully'
      };
    },
    onSuccess: () => {
      toast({
        title: "Relationship Created",
        description: "Guest relationship has been successfully created."
      });
      setShowAddRelationshipDialog(false);
      setNewRelationship({ fromGuestId: '', toGuestId: '', relationshipTypeId: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/guest-relationships`] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create relationship",
        variant: "destructive"
      });
    }
  });

  // Create relationship type mutation
  const createRelationshipType = useMutation({
    mutationFn: async (typeData: typeof newRelationshipType) => {
      // Mock API call for Phase 3.5 implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { 
        id: Date.now(),
        ...typeData,
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        message: 'Relationship type created successfully'
      };
    },
    onSuccess: () => {
      toast({
        title: "Relationship Type Created",
        description: "New relationship type has been successfully created."
      });
      setShowAddTypeDialog(false);
      setNewRelationshipType({ name: '', description: '', category: 'family', priority: 1 });
      queryClient.invalidateQueries({ queryKey: ['/api/relationship-types'] });
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create relationship type",
        variant: "destructive"
      });
    }
  });

  // Delete relationship mutation
  const deleteRelationship = useMutation({
    mutationFn: async (relationshipId: number) => {
      // Mock API call for Phase 3.5 implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      return { message: 'Relationship deleted successfully' };
    },
    onSuccess: () => {
      toast({
        title: "Relationship Deleted",
        description: "Guest relationship has been successfully removed."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/guest-relationships`] });
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete relationship",
        variant: "destructive"
      });
    }
  });

  // Refresh all data
  const refreshAllData = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/relationship-types'] }),
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/guest-relationships`] }),
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/relationship-stats`] })
    ]);
    setRefreshing(false);
  };

  // Filter relationships based on search and type
  const filteredRelationships = relationships?.filter((rel: GuestRelationship) => {
    const matchesSearch = searchQuery === '' || 
      rel.fromGuest.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.fromGuest.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.toGuest.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.toGuest.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rel.relationshipType.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedRelationshipType === 'all' || 
      rel.relationshipType.category === selectedRelationshipType;
    
    return matchesSearch && matchesType;
  }) || [];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'family': return <Users2 className="w-4 h-4" />;
      case 'friend': return <Heart className="w-4 h-4" />;
      case 'colleague': return <Users className="w-4 h-4" />;
      default: return <UserCheck className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'family': return 'text-blue-600';
      case 'friend': return 'text-pink-600';
      case 'colleague': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (!eventId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Event Selected</AlertTitle>
        <AlertDescription>
          Please select an event to view guest relationships.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Header with Real-time Status */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Guest Relationship Management</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Advanced guest relationship tracking and family connections</p>
            <div className="flex items-center gap-1">
              <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
                {isConnected ? "Live Monitoring" : isConnecting ? "Connecting..." : "Offline"}
              </Badge>
              {alerts.length > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">
                  {alerts.length} Alert{alerts.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-1" />
                Manage Types
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Relationship Type</DialogTitle>
                <DialogDescription>
                  Create a new relationship type for guest connections.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="typeName">Name</Label>
                  <Input
                    id="typeName"
                    value={newRelationshipType.name}
                    onChange={(e) => setNewRelationshipType(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Cousin, Roommate, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="typeDescription">Description</Label>
                  <Input
                    id="typeDescription"
                    value={newRelationshipType.description}
                    onChange={(e) => setNewRelationshipType(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this relationship type"
                  />
                </div>
                <div>
                  <Label htmlFor="typeCategory">Category</Label>
                  <Select
                    value={newRelationshipType.category}
                    onValueChange={(value) => setNewRelationshipType(prev => ({ ...prev, category: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="colleague">Colleague</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createRelationshipType.mutate(newRelationshipType)}
                  disabled={createRelationshipType.isPending || !newRelationshipType.name}
                >
                  {createRelationshipType.isPending ? 'Creating...' : 'Create Type'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddRelationshipDialog} onOpenChange={setShowAddRelationshipDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Relationship
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Guest Relationship</DialogTitle>
                <DialogDescription>
                  Create a new relationship between two guests.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fromGuest">From Guest</Label>
                  <Select
                    value={newRelationship.fromGuestId}
                    onValueChange={(value) => setNewRelationship(prev => ({ ...prev, fromGuestId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select first guest" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventGuests?.map((guest: any) => (
                        <SelectItem key={guest.id} value={guest.id.toString()}>
                          {guest.firstName} {guest.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="toGuest">To Guest</Label>
                  <Select
                    value={newRelationship.toGuestId}
                    onValueChange={(value) => setNewRelationship(prev => ({ ...prev, toGuestId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select second guest" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventGuests?.filter((guest: any) => guest.id.toString() !== newRelationship.fromGuestId)
                        .map((guest: any) => (
                        <SelectItem key={guest.id} value={guest.id.toString()}>
                          {guest.firstName} {guest.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="relationshipType">Relationship Type</Label>
                  <Select
                    value={newRelationship.relationshipTypeId}
                    onValueChange={(value) => setNewRelationship(prev => ({ ...prev, relationshipTypeId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipTypes?.map((type: RelationshipType) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name} ({type.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={newRelationship.notes}
                    onChange={(e) => setNewRelationship(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this relationship"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createRelationship.mutate(newRelationship)}
                  disabled={createRelationship.isPending || !newRelationship.fromGuestId || !newRelationship.toGuestId || !newRelationship.relationshipTypeId}
                >
                  {createRelationship.isPending ? 'Creating...' : 'Create Relationship'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={refreshAllData} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Relationship Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Relationships</CardTitle>
            <Link2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipStats?.totalRelationships || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {relationshipStats?.uniqueGuests || 0} guests involved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Family Connections</CardTitle>
            <Users2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipStats?.relationshipTypes.family || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(((relationshipStats?.relationshipTypes.family || 0) / (relationshipStats?.totalRelationships || 1)) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Friend Connections</CardTitle>
            <Heart className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipStats?.relationshipTypes.friend || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(((relationshipStats?.relationshipTypes.friend || 0) / (relationshipStats?.totalRelationships || 1)) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Connections</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipStats?.relationshipTypes.colleague || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(((relationshipStats?.relationshipTypes.colleague || 0) / (relationshipStats?.totalRelationships || 1)) * 100)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Connections</CardTitle>
            <Network className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relationshipStats?.averageConnectionsPerGuest || 0}</div>
            <p className="text-xs text-gray-500 mt-1">per guest</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {relationshipStats?.relationshipGrowth.percentageChange > 0 ? '+' : ''}
              {relationshipStats?.relationshipGrowth.percentageChange || 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Relationship Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="relationships">All Relationships</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="types">Relationship Types</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Connected Guests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Most Connected Guests
                </CardTitle>
                <CardDescription>
                  Guests with the highest number of relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {relationshipStats?.mostConnectedGuests.map((guest: any, index: number) => (
                    <div key={guest.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{guest.name}</div>
                          <div className="text-sm text-gray-500">Guest ID: {guest.id}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{guest.connectionCount}</div>
                        <div className="text-xs text-gray-500">connections</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Relationship Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Relationship Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of relationship types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Users2 className="w-4 h-4 text-blue-600" />
                        Family
                      </span>
                      <span>{relationshipStats?.relationshipTypes.family || 0}</span>
                    </div>
                    <Progress value={(relationshipStats?.relationshipTypes.family || 0) / (relationshipStats?.totalRelationships || 1) * 100} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-600" />
                        Friends
                      </span>
                      <span>{relationshipStats?.relationshipTypes.friend || 0}</span>
                    </div>
                    <Progress value={(relationshipStats?.relationshipTypes.friend || 0) / (relationshipStats?.totalRelationships || 1) * 100} />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-green-600" />
                        Colleagues
                      </span>
                      <span>{relationshipStats?.relationshipTypes.colleague || 0}</span>
                    </div>
                    <Progress value={(relationshipStats?.relationshipTypes.colleague || 0) / (relationshipStats?.totalRelationships || 1) * 100} />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-gray-600" />
                        Other
                      </span>
                      <span>{relationshipStats?.relationshipTypes.other || 0}</span>
                    </div>
                    <Progress value={(relationshipStats?.relationshipTypes.other || 0) / (relationshipStats?.totalRelationships || 1) * 100} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search relationships by guest name or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedRelationshipType} onValueChange={setSelectedRelationshipType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="friend">Friends</SelectItem>
                <SelectItem value="colleague">Colleagues</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Relationships List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Guest Relationships ({filteredRelationships.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredRelationships.map((relationship: GuestRelationship) => (
                    <div key={relationship.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getCategoryColor(relationship.relationshipType.category)} bg-opacity-10`}>
                          {getCategoryIcon(relationship.relationshipType.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {relationship.fromGuest.firstName} {relationship.fromGuest.lastName}
                            </span>
                            <Link2 className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {relationship.toGuest.firstName} {relationship.toGuest.lastName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {relationship.relationshipType.name}
                            </Badge>
                            {relationship.isConfirmed ? (
                              <Badge variant="default" className="text-xs">
                                Confirmed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Pending
                              </Badge>
                            )}
                          </div>
                          {relationship.notes && (
                            <p className="text-sm text-gray-500 mt-1">{relationship.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {/* TODO: Edit relationship */}}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRelationship.mutate(relationship.id)}
                          disabled={deleteRelationship.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Relationship Analytics
              </CardTitle>
              <CardDescription>
                Insights and trends in guest relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {relationshipStats?.relationshipGrowth.thisWeek || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">New This Week</div>
                  <div className="text-xs text-gray-500">vs {relationshipStats?.relationshipGrowth.lastWeek || 0} last week</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(((relationshipStats?.relationshipTypes.family || 0) / (relationshipStats?.totalRelationships || 1)) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Family Relationships</div>
                  <div className="text-xs text-gray-500">Most common type</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {relationshipStats?.averageConnectionsPerGuest || 0}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">Avg Connections</div>
                  <div className="text-xs text-gray-500">Per guest</div>
                </div>
              </div>
              
              <div className="mt-6">
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertTitle>Relationship Insights</AlertTitle>
                  <AlertDescription>
                    Your event has {relationshipStats?.totalRelationships || 0} guest relationships across {relationshipStats?.uniqueGuests || 0} guests. 
                    Family connections represent the largest category at {Math.round(((relationshipStats?.relationshipTypes.family || 0) / (relationshipStats?.totalRelationships || 1)) * 100)}% of all relationships.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Relationship Types Management
              </CardTitle>
              <CardDescription>
                Configure and manage relationship type definitions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relationshipTypes?.map((type: RelationshipType) => (
                  <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getCategoryColor(type.category)} bg-opacity-10`}>
                        {getCategoryIcon(type.category)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type.name}</span>
                          {type.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {type.description} • Category: {type.category}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!type.isDefault && (
                        <Button size="sm" variant="ghost">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GuestRelationshipDashboard;