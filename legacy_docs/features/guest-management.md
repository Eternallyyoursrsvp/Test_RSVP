# Guest Management System

## Overview

The Guest Management System is the core component of the Wedding RSVP Platform, handling comprehensive guest information, two-stage RSVP processes, family relationships, and detailed logistics coordination.

**Latest Updates (July 2025)**: Complete RSVP system enhancements with mobile optimization, "Select All" ceremony functionality, and customizable event branding.

🔗 **[Complete RSVP System Documentation](./rsvp-system-comprehensive.md)** - Comprehensive documentation of the enhanced RSVP system with mobile optimization and customizable branding.

## 🎯 Core Features

### Two-Stage RSVP System
A sophisticated response collection system designed for complex Indian weddings:

**Stage 1: Basic Attendance Confirmation**
- Initial response to wedding invitation
- Ceremony-specific attendance selection
- Plus-one guest information collection
- Basic dietary restrictions capture

**Stage 2: Detailed Logistics Collection**
- Accommodation preferences and requirements
- Travel details and flight information
- Detailed dietary restrictions and allergies
- Special requests and accessibility needs

### Comprehensive Guest Profiles
Each guest record includes extensive information for complete event planning:

```typescript
interface GuestProfile {
  // Basic Information
  name: string;
  email: string;
  phone?: string;
  category: 'family' | 'friends' | 'colleagues';
  relationshipToCouple: string;
  
  // RSVP Status
  rsvpStatus: 'pending' | 'confirmed' | 'declined';
  rsvpStage: 0 | 1 | 2; // Progress through RSVP stages
  rsvpSubmittedAt?: Date;
  
  // Plus One Information
  plusOne: boolean;
  plusOneDetails?: {
    name: string;
    email: string;
    phone?: string;
  };
  
  // Ceremony Attendance
  invitedCeremonies: string[]; // Which ceremonies they're invited to
  attendingCeremonies: string[]; // Which they confirmed attendance
  
  // Accommodation Details
  accommodationMode: 'provided' | 'self' | 'not-needed' | 'not-decided';
  accommodationPreference: 'single' | 'double' | 'suite' | 'family';
  accommodationSpecialRequests?: string;
  
  // Travel Information
  travelMode: 'flight' | 'train' | 'car' | 'bus' | 'other';
  travelDetails: {
    arrivalDate?: Date;
    departureDate?: Date;
    arrivalAirport?: string;
    departureAirport?: string;
    flightNumbers?: {
      arrival: string;
      departure: string;
    };
  };
  
  // Special Requirements
  dietaryRestrictions: string[];
  accessibilityRequirements?: string;
  specialRequests?: string;
  
  // Communication Preferences
  preferredContactMethod: 'email' | 'phone' | 'whatsapp';
  languagePreference: string;
}
```

## 🔄 RSVP Process Flow

### Token-Based Security
Secure RSVP access using HMAC-signed tokens:

```typescript
// Token generation with event and guest context
export const generateRSVPToken = (guestId: number, eventId: number): string => {
  const payload = {
    guestId,
    eventId,
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  };
  
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.RSVP_TOKEN_SECRET!)
    .update(payloadBase64)
    .digest('base64url');
    
  return `${payloadBase64}.${signature}`;
};

// Secure token verification
export const verifyRSVPToken = (token: string): RSVPTokenPayload | null => {
  try {
    const [payloadBase64, signature] = token.split('.');
    
    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RSVP_TOKEN_SECRET!)
      .update(payloadBase64)
      .digest('base64url');
      
    if (signature !== expectedSignature) {
      return null; // Invalid signature
    }
    
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString());
    
    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return null; // Token expired
    }
    
    return payload;
  } catch (error) {
    return null; // Invalid token format
  }
};
```

### Stage 1: Basic Confirmation
Initial RSVP collection focusing on essential information:

```typescript
interface Stage1RSVPData {
  attending: boolean;
  ceremonies: number[]; // IDs of ceremonies they'll attend
  plusOne: boolean;
  plusOneDetails?: {
    name: string;
    email: string;
    phone?: string;
  };
  basicDietaryRestrictions?: string[];
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

// API endpoint for Stage 1 submission
app.post('/api/rsvp/:token/stage1', async (req, res) => {
  const tokenPayload = verifyRSVPToken(req.params.token);
  if (!tokenPayload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  const validation = stage1Schema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: validation.error.errors 
    });
  }
  
  const data = validation.data;
  
  // Update guest record
  await db.update(guests)
    .set({
      rsvpStatus: data.attending ? 'confirmed' : 'declined',
      rsvpStage: 1,
      rsvpSubmittedAt: new Date(),
      attendingCeremonies: data.ceremonies,
      plusOne: data.plusOne,
      plusOneName: data.plusOneDetails?.name,
      plusOneEmail: data.plusOneDetails?.email,
      plusOnePhone: data.plusOneDetails?.phone,
      dietaryRestrictions: data.basicDietaryRestrictions || [],
    })
    .where(and(
      eq(guests.id, tokenPayload.guestId),
      eq(guests.eventId, tokenPayload.eventId)
    ));
  
  // If confirmed, send Stage 2 invitation
  if (data.attending) {
    await sendStage2Invitation(tokenPayload.guestId, tokenPayload.eventId);
  }
  
  res.json({ success: true, stage: 1, nextStage: data.attending ? 2 : null });
});
```

### Stage 2: Detailed Logistics
Comprehensive information collection for confirmed guests:

```typescript
interface Stage2RSVPData {
  // Accommodation Details
  accommodationMode: 'provided' | 'self' | 'not-needed';
  accommodationPreferences?: {
    roomType: 'single' | 'double' | 'suite' | 'family';
    sharingWith?: string[]; // Names of people they want to share with
    accessibilityNeeds?: string;
    specialRequests?: string;
  };
  
  // Travel Information
  travelMode: 'flight' | 'train' | 'car' | 'bus' | 'other';
  travelDetails?: {
    arrivalDate: Date;
    departureDate: Date;
    arrivalLocation: string; // Airport code or city
    departureLocation: string;
    flightNumbers?: {
      arrivalFlight: string;
      departureFlight: string;
    };
    transportNeeded: boolean; // Airport pickup/drop
    specialAssistance?: string;
  };
  
  // Detailed Dietary & Medical
  dietaryRestrictions: string[];
  allergies?: string[];
  medicalRequirements?: string;
  accessibilityRequirements?: string;
  
  // Special Requests
  specialRequests?: string;
  additionalGuests?: Array<{
    name: string;
    relationship: string;
    dietaryRestrictions?: string[];
    specialRequests?: string;
  }>;
}
```

## 📊 Guest Categories & Relationships

### Family Structure Mapping
Comprehensive relationship tracking for Indian wedding complexities:

```typescript
enum RelationshipCategory {
  // Bride's Side
  BRIDE_IMMEDIATE = 'bride_immediate', // Parents, siblings
  BRIDE_EXTENDED = 'bride_extended',   // Aunts, uncles, cousins
  BRIDE_FRIENDS = 'bride_friends',     // Personal friends
  
  // Groom's Side
  GROOM_IMMEDIATE = 'groom_immediate',
  GROOM_EXTENDED = 'groom_extended',
  GROOM_FRIENDS = 'groom_friends',
  
  // Mutual
  MUTUAL_FRIENDS = 'mutual_friends',   // Common friends
  COLLEAGUES = 'colleagues',           // Work relationships
  NEIGHBORS = 'neighbors',             // Community members
  FAMILY_FRIENDS = 'family_friends',   // Long-term family friends
}

interface FamilyConnection {
  guestId: number;
  relatedGuestIds: number[];
  connectionType: 'family' | 'friends' | 'colleagues';
  accommodationPreference: 'together' | 'nearby' | 'separate';
  notes?: string;
}
```

### Guest Grouping Logic
Intelligent grouping for accommodation and transport allocation:

```typescript
export const generateGuestGroups = async (eventId: number): Promise<GuestGroup[]> => {
  const guests = await getEventGuests(eventId);
  const connections = await getFamilyConnections(eventId);
  
  const groups: GuestGroup[] = [];
  const processedGuests = new Set<number>();
  
  for (const guest of guests) {
    if (processedGuests.has(guest.id)) continue;
    
    const group: GuestGroup = {
      id: generateGroupId(),
      primaryGuest: guest,
      members: [guest],
      accommodationRequirements: getAccommodationRequirements(guest),
      travelRequirements: getTravelRequirements(guest),
    };
    
    // Find connected guests
    const relatedGuests = findRelatedGuests(guest.id, connections, guests);
    for (const relatedGuest of relatedGuests) {
      if (!processedGuests.has(relatedGuest.id)) {
        group.members.push(relatedGuest);
        processedGuests.add(relatedGuest.id);
      }
    }
    
    groups.push(group);
    processedGuests.add(guest.id);
  }
  
  return groups;
};
```

## 🏨 Accommodation Integration

### Auto-Allocation System
Intelligent room assignment based on preferences and relationships:

```typescript
interface AccommodationAllocation {
  guestId: number;
  hotelId: number;
  roomTypeId: number;
  roomNumber?: string;
  occupants: string[]; // Names of people sharing the room
  allocationReason: 'preference' | 'family_group' | 'availability';
  status: 'pending' | 'confirmed' | 'waitlist';
}

export const allocateAccommodations = async (eventId: number): Promise<AllocationResult> => {
  const confirmedGuests = await getConfirmedGuests(eventId);
  const availableRooms = await getAvailableRooms(eventId);
  const guestGroups = await generateGuestGroups(eventId);
  
  const allocations: AccommodationAllocation[] = [];
  const unallocated: Guest[] = [];
  
  // Priority 1: Family groups with specific preferences
  for (const group of guestGroups) {
    if (group.accommodationRequirements.mode === 'provided') {
      const allocation = await tryAllocateGroup(group, availableRooms);
      if (allocation.success) {
        allocations.push(...allocation.allocations);
        updateRoomAvailability(availableRooms, allocation.allocations);
      } else {
        unallocated.push(...group.members);
      }
    }
  }
  
  // Priority 2: Individual guests
  for (const guest of confirmedGuests) {
    if (!allocations.find(a => a.guestId === guest.id)) {
      const allocation = await tryAllocateIndividual(guest, availableRooms);
      if (allocation.success) {
        allocations.push(allocation.allocation);
        updateRoomAvailability(availableRooms, [allocation.allocation]);
      } else {
        unallocated.push(guest);
      }
    }
  }
  
  return {
    allocations,
    unallocated,
    summary: generateAllocationSummary(allocations, unallocated),
  };
};
```

### Room Sharing Logic
Smart room sharing based on relationships and preferences:

```typescript
export const determineRoomSharing = (guests: Guest[], roomCapacity: number): RoomArrangement => {
  // Priority order for room sharing
  const sharingPriority = [
    'spouse_partner',     // Married couples
    'immediate_family',   // Parents with children
    'siblings',          // Brothers/sisters
    'close_relatives',   // Cousins, close family
    'friends',          // Friend groups
    'colleagues',       // Work relationships
  ];
  
  const arrangements: RoomArrangement[] = [];
  
  for (const priority of sharingPriority) {
    const compatibleGuests = findCompatibleGuests(guests, priority);
    const roomGroups = groupByCapacity(compatibleGuests, roomCapacity);
    
    arrangements.push(...roomGroups.map(group => ({
      guests: group,
      arrangement: priority,
      compatibility: calculateCompatibility(group),
    })));
  }
  
  return selectBestArrangement(arrangements);
};
```

## ✈️ Travel Coordination Integration

### Flight Information Management
Comprehensive flight tracking and coordination:

```typescript
interface FlightDetails {
  guestId: number;
  flightType: 'arrival' | 'departure';
  flightNumber: string;
  airline: string;
  date: Date;
  time: string;
  airport: string;
  terminal?: string;
  gate?: string;
  seatNumber?: string;
  
  // Coordination details
  transportRequired: boolean;
  pickupLocation?: string;
  pickupTime?: string;
  representativeAssigned?: number;
  specialAssistance?: string;
  
  // Status tracking
  status: 'scheduled' | 'delayed' | 'cancelled' | 'landed' | 'departed';
  lastUpdated: Date;
}

export const processFlightInformation = async (eventId: number, guestId: number, flightData: FlightInput) => {
  // Validate flight information
  const validation = await validateFlightDetails(flightData);
  if (!validation.isValid) {
    throw new Error(`Invalid flight information: ${validation.errors.join(', ')}`);
  }
  
  // Store flight details
  await db.insert(guestTravelInfo).values({
    eventId,
    guestId,
    arrivalFlight: flightData.arrivalFlight,
    arrivalDate: flightData.arrivalDate,
    arrivalTime: flightData.arrivalTime,
    arrivalAirport: flightData.arrivalAirport,
    departureFlow: flightData.departureFlight,
    departureDate: flightData.departureDate,
    departureTime: flightData.departureTime,
    departureAirport: flightData.departureAirport,
    specialAssistance: flightData.specialAssistance,
  });
  
  // Trigger coordination workflow if transport mode is 'selected'
  const event = await getEvent(eventId);
  if (event.transportMode === 'selected') {
    await initiateTransportCoordination(eventId, guestId, flightData);
  }
  
  // Send confirmation if email confirmations are enabled
  if (event.flightEmailConfirmations) {
    await sendFlightConfirmation(eventId, guestId, flightData);
  }
};
```

### Transport Group Assignment
Automatic grouping for efficient transport coordination:

```typescript
export const assignTransportGroups = async (eventId: number): Promise<TransportAssignment[]> => {
  const travelInfo = await getGuestTravelInfo(eventId);
  const transportVendors = await getTransportVendors(eventId);
  
  // Group by arrival time and airport
  const arrivalGroups = groupBy(travelInfo, (info) => 
    `${info.arrivalAirport}_${formatTimeSlot(info.arrivalTime)}`
  );
  
  const assignments: TransportAssignment[] = [];
  
  for (const [groupKey, guests] of Object.entries(arrivalGroups)) {
    const [airport, timeSlot] = groupKey.split('_');
    
    // Find available transport vendor with capacity
    const availableVendor = findAvailableVendor(transportVendors, guests.length, timeSlot);
    
    if (availableVendor) {
      assignments.push({
        vendorId: availableVendor.id,
        guests: guests.map(g => g.guestId),
        pickupLocation: airport,
        pickupTime: timeSlot,
        estimatedDuration: calculateDuration(airport, 'hotel'),
        specialRequirements: aggregateSpecialRequirements(guests),
      });
    } else {
      // Handle overflow - split group or assign to waitlist
      const splitAssignments = await handleTransportOverflow(guests, transportVendors);
      assignments.push(...splitAssignments);
    }
  }
  
  return assignments;
};
```

## 📧 Communication Integration

### Automated Follow-ups
Smart communication workflow based on RSVP status:

```typescript
interface CommunicationWorkflow {
  trigger: 'rsvp_sent' | 'stage1_completed' | 'stage2_pending' | 'deadline_approaching';
  delay: number; // Hours to wait before sending
  template: string;
  channels: ('email' | 'whatsapp' | 'sms')[];
  conditions?: string[]; // Additional conditions to check
}

const defaultWorkflows: CommunicationWorkflow[] = [
  {
    trigger: 'rsvp_sent',
    delay: 72, // 3 days
    template: 'rsvp_reminder_gentle',
    channels: ['email'],
    conditions: ['rsvp_status = pending'],
  },
  {
    trigger: 'stage1_completed',
    delay: 24, // 1 day
    template: 'stage2_invitation',
    channels: ['email', 'whatsapp'],
    conditions: ['rsvp_status = confirmed', 'rsvp_stage = 1'],
  },
  {
    trigger: 'stage2_pending',
    delay: 120, // 5 days
    template: 'stage2_reminder',
    channels: ['email', 'whatsapp'],
    conditions: ['rsvp_status = confirmed', 'rsvp_stage < 2'],
  },
];

export const processScheduledCommunications = async () => {
  for (const workflow of defaultWorkflows) {
    const dueGuests = await findGuestsDueForCommunication(workflow);
    
    for (const guest of dueGuests) {
      try {
        await sendTemplateMessage(guest.eventId, guest.id, workflow.template, workflow.channels);
        await logCommunication(guest.eventId, guest.id, workflow.template, 'automated');
      } catch (error) {
        console.error(`Failed to send ${workflow.template} to guest ${guest.id}:`, error);
      }
    }
  }
};
```

### Template Variable Substitution
Dynamic content generation with guest-specific information:

```typescript
interface TemplateVariables {
  // Guest information
  guest_name: string;
  guest_email: string;
  plus_one_name?: string;
  
  // Event information
  couple_names: string;
  wedding_date: string;
  venue_names: string;
  
  // RSVP specific
  rsvp_link: string;
  deadline_date: string;
  ceremonies_invited: string;
  
  // Accommodation specific
  hotel_name?: string;
  room_details?: string;
  check_in_date?: string;
  
  // Travel specific
  flight_details?: string;
  transport_info?: string;
  pickup_details?: string;
}

export const generateTemplateVariables = async (eventId: number, guestId: number): Promise<TemplateVariables> => {
  const [guest, event, accommodation, travelInfo] = await Promise.all([
    getGuest(guestId, eventId),
    getEvent(eventId),
    getGuestAccommodation(guestId, eventId),
    getGuestTravelInfo(guestId, eventId),
  ]);
  
  return {
    guest_name: guest.name,
    guest_email: guest.email,
    plus_one_name: guest.plusOneName || '',
    
    couple_names: `${event.coupleName1} & ${event.coupleName2}`,
    wedding_date: formatDate(event.weddingDate),
    venue_names: await getVenueNames(eventId),
    
    rsvp_link: `${process.env.BASE_URL}/rsvp/${guest.rsvpToken}`,
    deadline_date: formatDate(addDays(event.weddingDate, -14)),
    ceremonies_invited: await formatCeremonies(guest.invitedCeremonies),
    
    hotel_name: accommodation?.hotel?.name || '',
    room_details: accommodation ? formatRoomDetails(accommodation) : '',
    check_in_date: accommodation?.checkInDate ? formatDate(accommodation.checkInDate) : '',
    
    flight_details: travelInfo ? formatFlightDetails(travelInfo) : '',
    transport_info: travelInfo?.transportAssignment ? formatTransportInfo(travelInfo.transportAssignment) : '',
    pickup_details: travelInfo?.pickupDetails ? formatPickupDetails(travelInfo.pickupDetails) : '',
  };
};
```

## 📊 Analytics & Reporting

### RSVP Analytics
Comprehensive tracking of guest response patterns:

```typescript
interface RSVPAnalytics {
  overview: {
    totalInvited: number;
    totalResponded: number;
    responseRate: number;
    confirmedGuests: number;
    declinedGuests: number;
    pendingGuests: number;
  };
  
  timeline: {
    date: string;
    cumulativeResponses: number;
    dailyResponses: number;
  }[];
  
  categoryBreakdown: {
    category: string;
    invited: number;
    confirmed: number;
    declined: number;
    pending: number;
    responseRate: number;
  }[];
  
  ceremonyAttendance: {
    ceremonyId: number;
    ceremonyName: string;
    totalInvited: number;
    confirmed: number;
    expectedAttendance: number;
  }[];
  
  accommodationSummary: {
    provided: number;
    selfArranged: number;
    notNeeded: number;
    undecided: number;
  };
  
  travelSummary: {
    byMode: Record<string, number>;
    byAirport: Record<string, number>;
    transportRequired: number;
  };
}

export const generateRSVPAnalytics = async (eventId: number): Promise<RSVPAnalytics> => {
  const guests = await getEventGuests(eventId);
  const ceremonies = await getEventCeremonies(eventId);
  
  // Calculate overview statistics
  const overview = {
    totalInvited: guests.length,
    totalResponded: guests.filter(g => g.rsvpStatus !== 'pending').length,
    responseRate: 0,
    confirmedGuests: guests.filter(g => g.rsvpStatus === 'confirmed').length,
    declinedGuests: guests.filter(g => g.rsvpStatus === 'declined').length,
    pendingGuests: guests.filter(g => g.rsvpStatus === 'pending').length,
  };
  overview.responseRate = overview.totalResponded / overview.totalInvited * 100;
  
  // Generate timeline data
  const timeline = await generateResponseTimeline(eventId);
  
  // Category breakdown
  const categories = ['family', 'friends', 'colleagues'];
  const categoryBreakdown = categories.map(category => {
    const categoryGuests = guests.filter(g => g.category === category);
    const confirmed = categoryGuests.filter(g => g.rsvpStatus === 'confirmed').length;
    const declined = categoryGuests.filter(g => g.rsvpStatus === 'declined').length;
    const pending = categoryGuests.filter(g => g.rsvpStatus === 'pending').length;
    
    return {
      category,
      invited: categoryGuests.length,
      confirmed,
      declined,
      pending,
      responseRate: categoryGuests.length > 0 ? 
        ((confirmed + declined) / categoryGuests.length * 100) : 0,
    };
  });
  
  // Ceremony attendance
  const ceremonyAttendance = ceremonies.map(ceremony => {
    const invitedToThis = guests.filter(g => 
      g.invitedCeremonies.includes(ceremony.id.toString())
    );
    const confirmedForThis = guests.filter(g => 
      g.attendingCeremonies.includes(ceremony.id.toString())
    );
    
    return {
      ceremonyId: ceremony.id,
      ceremonyName: ceremony.name,
      totalInvited: invitedToThis.length,
      confirmed: confirmedForThis.length,
      expectedAttendance: confirmedForThis.length + 
        Math.round(confirmedForThis.filter(g => g.plusOne).length * 0.8), // Estimate plus-ones
    };
  });
  
  return {
    overview,
    timeline,
    categoryBreakdown,
    ceremonyAttendance,
    accommodationSummary: generateAccommodationSummary(guests),
    travelSummary: generateTravelSummary(guests),
  };
};
```