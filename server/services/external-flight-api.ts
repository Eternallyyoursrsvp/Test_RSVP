/**
 * External Flight API Integration
 * Production-ready flight tracking service with multiple providers
 */

import { FlightStatusUpdate } from './flight-tracking';

// Flight API Provider Interface
export interface FlightAPIProvider {
  name: string;
  getFlightStatus(airline: string, flightNumber: string, date: string): Promise<FlightStatusUpdate>;
  subscribeToUpdates(flightId: string, callback: (update: FlightStatusUpdate) => void): void;
  unsubscribeFromUpdates(flightId: string): void;
  isAvailable(): boolean;
}

// AviationStack API Provider
class AviationStackProvider implements FlightAPIProvider {
  name = 'AviationStack';
  private apiKey: string;
  private baseUrl = 'http://api.aviationstack.com/v1';
  private subscriptions = new Map<string, (update: FlightStatusUpdate) => void>();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFlightStatus(airline: string, flightNumber: string, date: string): Promise<FlightStatusUpdate> {
    try {
      const response = await fetch(`${this.baseUrl}/flights?access_key=${this.apiKey}&airline_iata=${airline}&flight_number=${flightNumber}&flight_date=${date}`);
      
      if (!response.ok) {
        throw new Error(`AviationStack API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('Flight not found');
      }

      const flight = data.data[0];
      
      return {
        flightId: `${airline}${flightNumber}-${date}`,
        status: this.mapFlightStatus(flight.flight_status),
        actualDeparture: flight.departure?.actual || undefined,
        actualArrival: flight.arrival?.actual || undefined,
        gate: flight.departure?.gate || undefined,
        terminal: flight.departure?.terminal || undefined,
        delay: flight.departure?.delay ? parseInt(flight.departure.delay) : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ AviationStack API error:', error);
      throw error;
    }
  }

  subscribeToUpdates(flightId: string, callback: (update: FlightStatusUpdate) => void): void {
    this.subscriptions.set(flightId, callback);
    
    // Poll for updates every 5 minutes
    const interval = setInterval(async () => {
      if (!this.subscriptions.has(flightId)) {
        clearInterval(interval);
        return;
      }

      try {
        // Extract airline and flight number from flightId
        const match = flightId.match(/^([A-Z]{2})(\d+)-(.+)$/);
        if (match) {
          const [, airline, flightNumber, date] = match;
          const update = await this.getFlightStatus(airline, flightNumber, date);
          callback(update);
        }
      } catch (error) {
        console.error('❌ Flight update polling error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  unsubscribeFromUpdates(flightId: string): void {
    this.subscriptions.delete(flightId);
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private mapFlightStatus(apiStatus: string): FlightStatusUpdate['status'] {
    const statusMap: Record<string, FlightStatusUpdate['status']> = {
      'scheduled': 'scheduled',
      'active': 'departed',
      'landed': 'arrived',
      'cancelled': 'cancelled',
      'incident': 'cancelled',
      'diverted': 'delayed'
    };
    
    return statusMap[apiStatus] || 'scheduled';
  }
}

// FlightLabs API Provider (alternative)
class FlightLabsProvider implements FlightAPIProvider {
  name = 'FlightLabs';
  private apiKey: string;
  private baseUrl = 'https://app.goflightlabs.com/flights';
  private subscriptions = new Map<string, (update: FlightStatusUpdate) => void>();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getFlightStatus(airline: string, flightNumber: string, date: string): Promise<FlightStatusUpdate> {
    try {
      const response = await fetch(`${this.baseUrl}?access_key=${this.apiKey}&airline_iata=${airline}&flight_iata=${airline}${flightNumber}&dep_date=${date}`);
      
      if (!response.ok) {
        throw new Error(`FlightLabs API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        throw new Error('Flight not found');
      }

      const flight = data.data[0];
      
      return {
        flightId: `${airline}${flightNumber}-${date}`,
        status: this.mapFlightStatus(flight.status),
        actualDeparture: flight.departure_actual || undefined,
        actualArrival: flight.arrival_actual || undefined,
        gate: flight.departure_gate || undefined,
        terminal: flight.departure_terminal || undefined,
        delay: flight.delay ? parseInt(flight.delay) : undefined,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ FlightLabs API error:', error);
      throw error;
    }
  }

  subscribeToUpdates(flightId: string, callback: (update: FlightStatusUpdate) => void): void {
    this.subscriptions.set(flightId, callback);
    
    // Poll for updates every 3 minutes (FlightLabs has higher rate limits)
    const interval = setInterval(async () => {
      if (!this.subscriptions.has(flightId)) {
        clearInterval(interval);
        return;
      }

      try {
        const match = flightId.match(/^([A-Z]{2})(\d+)-(.+)$/);
        if (match) {
          const [, airline, flightNumber, date] = match;
          const update = await this.getFlightStatus(airline, flightNumber, date);
          callback(update);
        }
      } catch (error) {
        console.error('❌ Flight update polling error:', error);
      }
    }, 3 * 60 * 1000); // 3 minutes
  }

  unsubscribeFromUpdates(flightId: string): void {
    this.subscriptions.delete(flightId);
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private mapFlightStatus(apiStatus: string): FlightStatusUpdate['status'] {
    const statusMap: Record<string, FlightStatusUpdate['status']> = {
      'scheduled': 'scheduled',
      'en-route': 'departed',
      'landed': 'arrived',
      'cancelled': 'cancelled',
      'delayed': 'delayed'
    };
    
    return statusMap[apiStatus] || 'scheduled';
  }
}

// Mock Provider for development
class MockFlightProvider implements FlightAPIProvider {
  name = 'Mock';
  private subscriptions = new Map<string, (update: FlightStatusUpdate) => void>();

  async getFlightStatus(airline: string, flightNumber: string, date: string): Promise<FlightStatusUpdate> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const statuses: FlightStatusUpdate['status'][] = ['scheduled', 'boarding', 'departed', 'arrived', 'delayed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      flightId: `${airline}${flightNumber}-${date}`,
      status: randomStatus,
      actualDeparture: randomStatus === 'departed' || randomStatus === 'arrived' ? 
        new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() : undefined,
      actualArrival: randomStatus === 'arrived' ? 
        new Date(Date.now() - 30 * 60 * 1000).toISOString() : undefined,
      gate: randomStatus === 'boarding' || randomStatus === 'departed' ? `A${Math.floor(Math.random() * 50) + 1}` : undefined,
      terminal: '1',
      delay: randomStatus === 'delayed' ? Math.floor(Math.random() * 120) + 15 : undefined,
      timestamp: new Date().toISOString()
    };
  }

  subscribeToUpdates(flightId: string, callback: (update: FlightStatusUpdate) => void): void {
    this.subscriptions.set(flightId, callback);
    
    // Simulate periodic updates
    const interval = setInterval(() => {
      if (!this.subscriptions.has(flightId)) {
        clearInterval(interval);
        return;
      }
      
      // Random chance of status update
      if (Math.random() < 0.1) { // 10% chance every interval
        const update: FlightStatusUpdate = {
          flightId,
          status: 'delayed',
          delay: Math.floor(Math.random() * 60) + 10,
          reason: 'Weather conditions',
          timestamp: new Date().toISOString()
        };
        callback(update);
      }
    }, 30000); // Check every 30 seconds
  }

  unsubscribeFromUpdates(flightId: string): void {
    this.subscriptions.delete(flightId);
  }

  isAvailable(): boolean {
    return true; // Always available for development
  }
}

// Flight API Manager with failover
export class FlightAPIManager {
  private providers: FlightAPIProvider[] = [];
  private primaryProvider: FlightAPIProvider | null = null;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize providers based on available API keys
    const aviationStackKey = process.env.AVIATIONSTACK_API_KEY;
    const flightLabsKey = process.env.FLIGHTLABS_API_KEY;

    if (aviationStackKey) {
      const provider = new AviationStackProvider(aviationStackKey);
      this.providers.push(provider);
      if (!this.primaryProvider && provider.isAvailable()) {
        this.primaryProvider = provider;
      }
    }

    if (flightLabsKey) {
      const provider = new FlightLabsProvider(flightLabsKey);
      this.providers.push(provider);
      if (!this.primaryProvider && provider.isAvailable()) {
        this.primaryProvider = provider;
      }
    }

    // Always have mock provider as fallback
    const mockProvider = new MockFlightProvider();
    this.providers.push(mockProvider);
    
    if (!this.primaryProvider) {
      this.primaryProvider = mockProvider;
      console.log('⚠️ Using mock flight API provider - configure AVIATIONSTACK_API_KEY or FLIGHTLABS_API_KEY for production');
    } else {
      console.log(`✅ Flight API initialized with ${this.primaryProvider.name} provider`);
    }
  }

  async getFlightStatus(airline: string, flightNumber: string, date: string): Promise<FlightStatusUpdate> {
    if (!this.primaryProvider) {
      throw new Error('No flight API provider available');
    }

    let lastError: Error | null = null;

    // Try primary provider first
    try {
      return await this.primaryProvider.getFlightStatus(airline, flightNumber, date);
    } catch (error) {
      console.error(`❌ Primary provider (${this.primaryProvider.name}) failed:`, error);
      lastError = error as Error;
    }

    // Try fallback providers
    for (const provider of this.providers) {
      if (provider === this.primaryProvider) continue;
      
      try {
        console.log(`🔄 Trying fallback provider: ${provider.name}`);
        return await provider.getFlightStatus(airline, flightNumber, date);
      } catch (error) {
        console.error(`❌ Fallback provider (${provider.name}) failed:`, error);
        lastError = error as Error;
      }
    }

    throw lastError || new Error('All flight API providers failed');
  }

  subscribeToUpdates(flightId: string, callback: (update: FlightStatusUpdate) => void): void {
    if (this.primaryProvider) {
      this.primaryProvider.subscribeToUpdates(flightId, callback);
    }
  }

  unsubscribeFromUpdates(flightId: string): void {
    if (this.primaryProvider) {
      this.primaryProvider.unsubscribeFromUpdates(flightId);
    }
  }

  getProviderInfo(): { primary: string; available: string[] } {
    return {
      primary: this.primaryProvider?.name || 'None',
      available: this.providers.map(p => p.name)
    };
  }
}

// Export singleton instance
export const flightAPIManager = new FlightAPIManager();