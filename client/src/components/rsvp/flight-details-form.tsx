/**
 * Enhanced Flight Details Form Component
 * Comprehensive flight data collection for RSVP integration with flight coordination system
 */

import React from 'react';
import { UseFormReturn, FieldPath } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plane, Plus, X, AlertCircle } from 'lucide-react';

interface FlightDetailsFormProps {
  form: UseFormReturn<any>;
  baseFieldName: string;
}

// Common special requirements options
const SPECIAL_REQUIREMENTS = [
  'Wheelchair assistance',
  'Language support',
  'Dietary restrictions',
  'Carry infant',
  'Extra baggage',
  'Pet travel',
  'Medical equipment',
  'Special meal',
  'Seat preference',
  'Early boarding'
];

export const FlightDetailsForm: React.FC<FlightDetailsFormProps> = ({ form, baseFieldName }) => {
  const flightDetails = form.watch(baseFieldName);
  const hasDepartureFlight = flightDetails?.hasDepartureFlight || false;

  const addSpecialRequirement = (type: 'arrival' | 'departure', requirement: string) => {
    const fieldName = type === 'arrival' ? 'arrivalSpecialRequirements' : 'departureSpecialRequirements';
    const currentRequirements = form.getValues(`${baseFieldName}.${fieldName}`) || [];
    
    if (!currentRequirements.includes(requirement)) {
      form.setValue(`${baseFieldName}.${fieldName}`, [...currentRequirements, requirement]);
    }
  };

  const removeSpecialRequirement = (type: 'arrival' | 'departure', requirement: string) => {
    const fieldName = type === 'arrival' ? 'arrivalSpecialRequirements' : 'departureSpecialRequirements';
    const currentRequirements = form.getValues(`${baseFieldName}.${fieldName}`) || [];
    
    form.setValue(
      `${baseFieldName}.${fieldName}`, 
      currentRequirements.filter((req: string) => req !== requirement)
    );
  };

  return (
    <div className="space-y-6">
      {/* Arrival Flight Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="w-5 h-5" />
            Arrival Flight Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`${baseFieldName}.arrivalAirline`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airline</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., American Airlines" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`${baseFieldName}.arrivalFlightNumber`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Flight Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AA123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`${baseFieldName}.departureAirport`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Departure Airport</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., JFK (3-letter code)" maxLength={3} {...field} />
                  </FormControl>
                  <FormDescription>Use 3-letter airport code</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`${baseFieldName}.arrivalAirport`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arrival Airport</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., LAX (3-letter code)" maxLength={3} {...field} />
                  </FormControl>
                  <FormDescription>Use 3-letter airport code</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name={`${baseFieldName}.scheduledDeparture`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Departure</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`${baseFieldName}.scheduledArrival`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scheduled Arrival</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`${baseFieldName}.arrivalSeat`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seat Number (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 12A" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Airport Assistance */}
          <FormField
            control={form.control}
            name={`${baseFieldName}.arrivalAssistanceRequired`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Airport Assistance Required</FormLabel>
                  <FormDescription>
                    Need help with check-in, luggage, wheelchair, or other assistance?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Special Requirements */}
          <div className="space-y-3">
            <FormLabel>Special Requirements</FormLabel>
            <div className="flex flex-wrap gap-2">
              {(flightDetails?.arrivalSpecialRequirements || []).map((req: string, index: number) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {req}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => removeSpecialRequirement('arrival', req)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
            <Select onValueChange={(value) => addSpecialRequirement('arrival', value)}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <SelectValue placeholder="Add special requirement" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {SPECIAL_REQUIREMENTS.map((req) => (
                  <SelectItem key={req} value={req}>
                    {req}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Departure Flight Toggle */}
      <FormField
        control={form.control}
        name={`${baseFieldName}.hasDepartureFlight`}
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Different Departure Flight</FormLabel>
              <FormDescription>
                Check this if you have a different flight for departure
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Departure Flight Details (if different) */}
      {hasDepartureFlight && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="w-5 h-5 rotate-45" />
              Departure Flight Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`${baseFieldName}.departureAirline`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Airline</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., American Airlines" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${baseFieldName}.departureFlightNumber`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flight Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., AA456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`${baseFieldName}.departureScheduledDeparture`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Departure</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`${baseFieldName}.departureScheduledArrival`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scheduled Arrival</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name={`${baseFieldName}.departureSeat`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seat Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 15C" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Departure Airport Assistance */}
            <FormField
              control={form.control}
              name={`${baseFieldName}.departureAssistanceRequired`}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Airport Assistance Required</FormLabel>
                    <FormDescription>
                      Need help with check-in, luggage, wheelchair, or other assistance?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Departure Special Requirements */}
            <div className="space-y-3">
              <FormLabel>Special Requirements</FormLabel>
              <div className="flex flex-wrap gap-2">
                {(flightDetails?.departureSpecialRequirements || []).map((req: string, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {req}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeSpecialRequirement('departure', req)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <Select onValueChange={(value) => addSpecialRequirement('departure', value)}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <SelectValue placeholder="Add special requirement" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {SPECIAL_REQUIREMENTS.map((req) => (
                    <SelectItem key={req} value={req}>
                      {req}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flight Coordination Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Flight Coordination Service</p>
            <p>
              Your flight information will be used to coordinate pickup arrangements and provide real-time 
              flight tracking. We'll send you updates if your flight status changes and ensure smooth 
              airport assistance if requested.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};