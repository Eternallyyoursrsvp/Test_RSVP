/**
 * Drag Drop Interface Component
 * Specialized reusable drag-and-drop interface for passenger assignment
 */

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Users,
  MapPin,
  AlertCircle,
  Clock,
  Car,
  UserPlus,
  Phone,
  Settings,
  Route,
  Navigation
} from 'lucide-react';

// Types
interface DragDropPassenger {
  id: string;
  name: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  specialRequirements: string[];
  priority?: number;
  phone?: string;
  estimatedPickupTime?: string;
}

interface DragDropGroup {
  id: string;
  name: string;
  passengers: DragDropPassenger[];
  capacity: number;
  currentOccupancy: number;
  vehicleName?: string;
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
  status: 'planning' | 'assigned' | 'in_transit' | 'completed' | 'cancelled';
  estimatedDuration?: number;
  route?: {
    location: string;
    type: 'pickup' | 'dropoff' | 'waypoint';
    estimatedTime?: string;
  }[];
  notes?: string;
}

interface DragDropSource {
  id: string;
  title: string;
  passengers: DragDropPassenger[];
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  description?: string;
}

// Component Props
interface DragDropInterfaceProps {
  groups: DragDropGroup[];
  sources: DragDropSource[];
  onDragEnd: (result: DropResult) => void;
  onGroupAction?: (groupId: string, action: string) => void;
  onPassengerAction?: (passengerId: string, groupId: string, action: string) => void;
  loading?: boolean;
  className?: string;
}

// Passenger Card Component
const PassengerCard: React.FC<{
  passenger: DragDropPassenger;
  index: number;
  groupId?: string;
  onAction?: (action: string) => void;
}> = ({ passenger, index, groupId, onAction }) => {
  return (
    <Draggable draggableId={passenger.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            p-3 bg-white border rounded-lg cursor-move transition-all duration-200
            ${snapshot.isDragging 
              ? 'shadow-2xl border-blue-500 bg-blue-50 rotate-2 scale-105' 
              : 'shadow-sm hover:shadow-md hover:border-gray-300'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">{passenger.name}</div>
              
              {/* Location Information */}
              {(passenger.pickupLocation || passenger.dropoffLocation) && (
                <div className="mt-1 space-y-1">
                  {passenger.pickupLocation && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="w-3 h-3 text-green-500" />
                      <span className="font-medium">Pickup:</span> {passenger.pickupLocation}
                    </div>
                  )}
                  {passenger.dropoffLocation && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Navigation className="w-3 h-3 text-red-500" />
                      <span className="font-medium">Drop:</span> {passenger.dropoffLocation}
                    </div>
                  )}
                </div>
              )}

              {/* Contact and Time Information */}
              {(passenger.phone || passenger.estimatedPickupTime) && (
                <div className="mt-1 space-y-1">
                  {passenger.phone && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Phone className="w-3 h-3" />
                      {passenger.phone}
                    </div>
                  )}
                  {passenger.estimatedPickupTime && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="w-3 h-3" />
                      {new Date(passenger.estimatedPickupTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Special Requirements */}
              {passenger.specialRequirements.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {passenger.specialRequirements.map((req, idx) => (
                    <Badge 
                      key={idx} 
                      variant="secondary" 
                      className="text-xs px-2 py-1"
                    >
                      {req}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Indicator */}
            {passenger.priority && passenger.priority > 1 && (
              <div className="ml-2">
                <Badge variant="outline" className="text-xs">
                  Priority {passenger.priority}
                </Badge>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {onAction && groupId && (
            <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('edit');
                }}
              >
                <Settings className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction('remove');
                }}
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

// Drop Zone Component
const DropZone: React.FC<{
  droppableId: string;
  title: string;
  passengers: DragDropPassenger[];
  capacity?: number;
  occupied?: number;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  onAction?: (action: string) => void;
  children?: React.ReactNode;
}> = ({ 
  droppableId, 
  title, 
  passengers, 
  capacity, 
  occupied, 
  description, 
  icon: Icon, 
  color = 'blue',
  onAction,
  children 
}) => {
  const occupancyPercentage = capacity ? ((occupied || passengers.length) / capacity) * 100 : 0;
  const isOverCapacity = occupancyPercentage > 100;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 text-${color}-500`} />}
          <h3 className="font-medium text-sm">{title}</h3>
          {capacity && (
            <Badge variant={isOverCapacity ? "destructive" : "secondary"} className="text-xs">
              {occupied || passengers.length}/{capacity}
            </Badge>
          )}
        </div>
        {capacity && (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  isOverCapacity ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{Math.round(occupancyPercentage)}%</span>
          </div>
        )}
      </div>

      {description && (
        <p className="text-xs text-gray-600">{description}</p>
      )}

      {/* Drop Zone */}
      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              min-h-[120px] p-3 rounded-lg border-2 border-dashed transition-all duration-200
              ${snapshot.isDraggingOver 
                ? `border-${color}-500 bg-${color}-50` 
                : 'border-gray-300 bg-gray-50'
              }
              ${isOverCapacity ? 'border-red-300 bg-red-50' : ''}
            `}
          >
            <div className="space-y-2">
              {passengers.map((passenger, index) => (
                <PassengerCard
                  key={passenger.id}
                  passenger={passenger}
                  index={index}
                  groupId={droppableId}
                  onAction={(action) => onAction?.(action)}
                />
              ))}
              {provided.placeholder}
              
              {passengers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {snapshot.isDraggingOver ? 'Drop passengers here' : 'No passengers assigned'}
                  </p>
                </div>
              )}
            </div>

            {/* Over Capacity Warning */}
            {isOverCapacity && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-red-100 border border-red-300 rounded">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-800">Over Capacity</span>
              </div>
            )}

            {children}
          </div>
        )}
      </Droppable>
    </div>
  );
};

// Group Card Component
const GroupCard: React.FC<{
  group: DragDropGroup;
  onAction?: (action: string) => void;
  onPassengerAction?: (passengerId: string, action: string) => void;
}> = ({ group, onAction, onPassengerAction }) => {
  const getStatusColor = (status: DragDropGroup['status']) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_transit': return 'blue';
      case 'assigned': return 'purple';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const statusColor = getStatusColor(group.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{group.name}</CardTitle>
            <Badge variant="outline" className={`text-${statusColor}-600`}>
              {group.status.replace('_', ' ')}
            </Badge>
          </div>
          {onAction && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onAction('settings')}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Vehicle and Driver Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {group.vehicleName && (
            <div className="flex items-center gap-1">
              <Car className="w-4 h-4" />
              {group.vehicleName} ({group.vehicleType})
            </div>
          )}
          {group.driverName && (
            <div className="flex items-center gap-1">
              <UserPlus className="w-4 h-4" />
              {group.driverName}
              {group.driverPhone && (
                <span className="text-xs">({group.driverPhone})</span>
              )}
            </div>
          )}
          {group.estimatedDuration && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {group.estimatedDuration}min
            </div>
          )}
        </div>

        {/* Route Information */}
        {group.route && group.route.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Route className="w-3 h-3" />
            <span>{group.route.length} stops planned</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <DropZone
          droppableId={group.id}
          title="Passengers"
          passengers={group.passengers}
          capacity={group.capacity}
          occupied={group.currentOccupancy}
          color="green"
          onAction={(action) => onAction?.(action)}
        />

        {group.notes && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
            <strong>Notes:</strong> {group.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Drag Drop Interface Component
export const DragDropInterface: React.FC<DragDropInterfaceProps> = ({
  groups,
  sources,
  onDragEnd,
  onGroupAction,
  onPassengerAction,
  loading = false,
  className = ""
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading transport interface...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Source Zones (e.g., Unassigned passengers) */}
          <div className="lg:col-span-1 space-y-4">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {source.title} ({source.passengers.length})
                  </CardTitle>
                  {source.description && (
                    <p className="text-xs text-gray-600">{source.description}</p>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <DropZone
                    droppableId={source.id}
                    title=""
                    passengers={source.passengers}
                    icon={source.icon}
                    color={source.color}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transport Groups */}
          <div className="lg:col-span-3">
            {groups.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Transport Groups</h3>
                  <p className="text-gray-600">
                    Create transport groups to organize passenger transportation
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onAction={(action) => onGroupAction?.(group.id, action)}
                    onPassengerAction={(passengerId, action) => 
                      onPassengerAction?.(passengerId, group.id, action)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};

// Export helper components for reuse
export { PassengerCard, DropZone, GroupCard };
export type { DragDropPassenger, DragDropGroup, DragDropSource };
export default DragDropInterface;