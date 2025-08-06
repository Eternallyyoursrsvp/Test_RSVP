import bcrypt from "bcryptjs";
import { db } from "./db";
import { DatabaseAuthAdapter, type User as AuthUser, type CreateUserData, IAuthDatabaseAdapter } from "./src/auth/database-auth-adapter";
import { getGlobalAuthenticationAdapter } from "./src/auth/auth-factory";
import { 
  users, weddingEvents, guests, ceremonies, guestCeremonies, 
  travelInfo, accommodations, roomAllocations, mealOptions, 
  guestMealSelections, coupleMessages, relationshipTypes,
  whatsappTemplates, rsvpFollowupTemplates, rsvpFollowupLogs,
  hotels, globalRoomTypes, transportGroups, transportAllocations,
  type User, type WeddingEvent, type Guest,
  type Ceremony, type GuestCeremony, type TravelInfo, type Accommodation,
  type RoomAllocation, type MealOption, type GuestMealSelection,
  type CoupleMessage, type RelationshipType, type WhatsappTemplate,
  type RsvpFollowupTemplate, type RsvpFollowupLog, type Hotel,
  type GlobalRoomType, type TransportGroup, type TransportAllocation,
  type InsertUser, type InsertWeddingEvent,
  type InsertGuest, type InsertCeremony, type InsertGuestCeremony,
  type InsertTravelInfo, type InsertAccommodation, type InsertRoomAllocation,
  type InsertMealOption, type InsertGuestMealSelection, type InsertCoupleMessage,
  type InsertRelationshipType, type InsertWhatsappTemplate,
  type InsertRsvpFollowupTemplate, type InsertRsvpFollowupLog,
  type InsertHotel, type InsertGlobalRoomType, type InsertTransportGroup,
  type InsertTransportAllocation
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Email configuration interface
interface EmailConfig {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  smtpSecure?: boolean;
  brevoApiKey?: string;
  outlookClientId?: string;
  outlookClientSecret?: string;
  outlookRefreshToken?: string;
  outlookAccessToken?: string;
  emailProvider?: string;
  whatsappEnabled?: boolean;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
}

// Complete storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  deleteUser(userId: number): Promise<boolean>;

  // Event operations
  getEvent(id: number): Promise<WeddingEvent | undefined>;
  eventExists(id: number): Promise<boolean>;
  getAllEvents(): Promise<WeddingEvent[]>;
  getEventsByUser(userId: number): Promise<WeddingEvent[]>;
  createEvent(event: InsertWeddingEvent): Promise<WeddingEvent>;
  updateEvent(id: number, event: Partial<InsertWeddingEvent>): Promise<WeddingEvent | undefined>;
  updateEventEmailConfig(id: number, config: EmailConfig): Promise<WeddingEvent | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Performance-optimized batch operations
  getEventStatistics(eventId: number): Promise<{
    total: number;
    confirmed: number;
    declined: number;
    pending: number;
    plusOnes: number;
    children: number;
  }>;
  getCeremoniesForEvent(eventId: number): Promise<Ceremony[]>;
  getWizardProgress(eventId: number): Promise<any>;
  getEvents(): Promise<WeddingEvent[]>;
  
  // Transaction support for atomic operations
  transaction<T>(callback: () => Promise<T>): Promise<T>;
  
  // Standard database operations

  // Guest operations
  getGuest(id: number): Promise<Guest | undefined>;
  getGuestByEmail(email: string): Promise<Guest | undefined>;
  getGuestsByEvent(eventId: number): Promise<Guest[]>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest | undefined>;
  deleteGuest(id: number): Promise<boolean>;
  updateGuestRsvpStatus(id: number, status: string): Promise<Guest | undefined>;
  bulkCreateGuests(guests: InsertGuest[]): Promise<Guest[]>;

  // Ceremony operations
  getCeremony(id: number): Promise<Ceremony | undefined>;
  getCeremoniesByEvent(eventId: number): Promise<Ceremony[]>;
  createCeremony(ceremony: InsertCeremony): Promise<Ceremony>;
  updateCeremony(id: number, ceremony: Partial<InsertCeremony>): Promise<Ceremony | undefined>;
  deleteCeremony(id: number): Promise<boolean>;

  // Guest Ceremony operations
  getGuestCeremony(guestId: number, ceremonyId: number): Promise<GuestCeremony | undefined>;
  getGuestCeremoniesByGuest(guestId: number): Promise<GuestCeremony[]>;
  getGuestCeremoniesByCeremony(ceremonyId: number): Promise<GuestCeremony[]>;
  createGuestCeremony(guestCeremony: InsertGuestCeremony): Promise<GuestCeremony>;
  updateGuestCeremony(id: number, guestCeremony: Partial<InsertGuestCeremony>): Promise<GuestCeremony | undefined>;

  // Travel operations
  getTravelInfo(id: number): Promise<TravelInfo | undefined>;
  getTravelInfoByGuest(guestId: number): Promise<TravelInfo | undefined>;
  createTravelInfo(travelInfo: InsertTravelInfo): Promise<TravelInfo>;
  updateTravelInfo(id: number, travelInfo: Partial<InsertTravelInfo>): Promise<TravelInfo | undefined>;

  // Accommodation operations
  getAccommodation(id: number): Promise<Accommodation | undefined>;
  getAccommodationsByEvent(eventId: number): Promise<Accommodation[]>;
  getAccommodationsByHotel(hotelId: number): Promise<Accommodation[]>;
  createAccommodation(accommodation: InsertAccommodation): Promise<Accommodation>;
  updateAccommodation(id: number, accommodation: Partial<InsertAccommodation>): Promise<Accommodation | undefined>;
  deleteAccommodation(id: number): Promise<boolean>;

  // Hotel operations
  getHotel(id: number): Promise<Hotel | undefined>;
  getHotelByName(name: string): Promise<Hotel | undefined>;
  getHotelsByEvent(eventId: number): Promise<Hotel[]>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: number, hotel: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: number): Promise<boolean>;

  // Global Room Type operations
  getGlobalRoomType(id: number): Promise<GlobalRoomType | undefined>;
  getGlobalRoomTypesByHotelName(hotelName: string): Promise<GlobalRoomType[]>;
  getAllGlobalRoomTypes(): Promise<GlobalRoomType[]>;
  createGlobalRoomType(roomType: InsertGlobalRoomType): Promise<GlobalRoomType>;
  updateGlobalRoomType(id: number, roomType: Partial<InsertGlobalRoomType>): Promise<GlobalRoomType | undefined>;
  deleteGlobalRoomType(id: number): Promise<boolean>;

  // Room Allocation operations
  getRoomAllocation(id: number): Promise<RoomAllocation | undefined>;
  getRoomAllocationsByAccommodation(accommodationId: number): Promise<RoomAllocation[]>;
  getRoomAllocationsByGuest(guestId: number): Promise<RoomAllocation[]>;
  createRoomAllocation(roomAllocation: InsertRoomAllocation): Promise<RoomAllocation>;
  updateRoomAllocation(id: number, roomAllocation: Partial<InsertRoomAllocation>): Promise<RoomAllocation | undefined>;

  // Meal operations
  getMealOption(id: number): Promise<MealOption | undefined>;
  getMealOptionsByCeremony(ceremonyId: number): Promise<MealOption[]>;
  createMealOption(mealOption: InsertMealOption): Promise<MealOption>;
  updateMealOption(id: number, mealOption: Partial<InsertMealOption>): Promise<MealOption | undefined>;
  deleteMealOption(id: number): Promise<boolean>;

  // Guest Meal Selection operations
  getGuestMealSelection(id: number): Promise<GuestMealSelection | undefined>;
  getGuestMealSelectionsByGuest(guestId: number): Promise<GuestMealSelection[]>;
  createGuestMealSelection(guestMealSelection: InsertGuestMealSelection): Promise<GuestMealSelection>;
  updateGuestMealSelection(id: number, guestMealSelection: Partial<InsertGuestMealSelection>): Promise<GuestMealSelection | undefined>;

  // Couple Message operations
  createCoupleMessage(coupleMessage: InsertCoupleMessage): Promise<CoupleMessage>;

  // Relationship Type operations
  getRelationshipType(id: number): Promise<RelationshipType | undefined>;
  getAllRelationshipTypes(): Promise<RelationshipType[]>;
  createRelationshipType(relationshipType: InsertRelationshipType): Promise<RelationshipType>;
  updateRelationshipType(id: number, relationshipType: Partial<InsertRelationshipType>): Promise<RelationshipType | undefined>;
  deleteRelationshipType(id: number): Promise<boolean>;

  // WhatsApp Template operations
  getWhatsappTemplate(id: number): Promise<WhatsappTemplate | undefined>;
  getWhatsappTemplatesByEvent(eventId: number): Promise<WhatsappTemplate[]>;
  getWhatsappTemplatesByCategory(eventId: number, category: string): Promise<WhatsappTemplate[]>;
  createWhatsappTemplate(template: InsertWhatsappTemplate): Promise<WhatsappTemplate>;
  updateWhatsappTemplate(id: number, template: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined>;
  deleteWhatsappTemplate(id: number): Promise<boolean>;
  markWhatsappTemplateAsUsed(id: number): Promise<WhatsappTemplate | undefined>;

  // RSVP Follow-up Template operations
  getRsvpFollowupTemplate(id: number): Promise<RsvpFollowupTemplate | undefined>;
  getRsvpFollowupTemplateByType(eventId: number, type: string): Promise<RsvpFollowupTemplate | undefined>;
  getRsvpFollowupTemplatesByEvent(eventId: number): Promise<RsvpFollowupTemplate[]>;
  createRsvpFollowupTemplate(template: InsertRsvpFollowupTemplate): Promise<RsvpFollowupTemplate>;
  updateRsvpFollowupTemplate(id: number, template: Partial<InsertRsvpFollowupTemplate>): Promise<RsvpFollowupTemplate | undefined>;
  deleteRsvpFollowupTemplate(id: number): Promise<boolean>;

  // RSVP Follow-up Log operations
  getRsvpFollowupLogsByGuest(guestId: number): Promise<RsvpFollowupLog[]>;
  createRsvpFollowupLog(log: InsertRsvpFollowupLog): Promise<RsvpFollowupLog>;

  // Transport operations (missing from interface)
  getTransportGroup(id: number): Promise<TransportGroup | undefined>;
  getTransportGroupsByEvent(eventId: number): Promise<TransportGroup[]>;
  createTransportGroup(group: InsertTransportGroup): Promise<TransportGroup>;
  updateTransportGroup(id: number, group: Partial<InsertTransportGroup>): Promise<TransportGroup | undefined>;
  deleteTransportGroup(id: number): Promise<boolean>;

  // Transport Allocation operations
  getTransportAllocation(id: number): Promise<TransportAllocation | undefined>;
  getTransportAllocationsByGroup(groupId: number): Promise<TransportAllocation[]>;
  getTransportAllocationsByGuest(guestId: number): Promise<TransportAllocation[]>;
  createTransportAllocation(allocation: InsertTransportAllocation): Promise<TransportAllocation>;
  updateTransportAllocation(id: number, allocation: Partial<InsertTransportAllocation>): Promise<TransportAllocation | undefined>;
  deleteTransportAllocation(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  private authAdapter: IAuthDatabaseAdapter | null = null;

  constructor() {
    // Lazy initialization to avoid module loading order issues
  }

  private async getAuthAdapter(): Promise<IAuthDatabaseAdapter> {
    if (!this.authAdapter) {
      this.authAdapter = await getGlobalAuthenticationAdapter();
    }
    return this.authAdapter;
  }

  // ====== MULTI-PROVIDER USER OPERATIONS (ENHANCED) ======
  // These methods now use DatabaseAuthAdapter for multi-provider support
  // while maintaining backward compatibility with existing API contracts

  async getUser(id: number): Promise<User | undefined> {
    try {
      // Use multi-provider auth adapter - NO FALLBACKS
      const authAdapter = await this.getAuthAdapter();
      const authUser = await authAdapter.getUserById(id);
      if (!authUser) return undefined;
      
      // Convert AuthUser to schema User format for backward compatibility
      return this.convertAuthUserToSchemaUser(authUser);
    } catch (error) {
      console.error(`❌ Failed to get user by ID ${id}:`, error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      // Use multi-provider auth adapter - NO FALLBACKS
      const authAdapter = await this.getAuthAdapter();
      const authUsers = await authAdapter.getAllUsers();
      
      // Convert AuthUser[] to schema User[] format for backward compatibility
      return authUsers.map(authUser => this.convertAuthUserToSchemaUser(authUser));
    } catch (error) {
      console.error(`❌ Failed to get all users with multi-provider:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      // Use multi-provider auth adapter - NO FALLBACKS
      const authAdapter = await this.getAuthAdapter();
      const authUser = await authAdapter.getUserByUsername(username);
      if (!authUser) return undefined;
      
      // Convert AuthUser to schema User format for backward compatibility
      return this.convertAuthUserToSchemaUser(authUser);
    } catch (error) {
      console.error(`❌ Failed to get user by username ${username}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      // Note: DatabaseAuthAdapter doesn't have getUserByEmail yet, using legacy approach
      const result = await db.select().from(users).where(eq(users.email, email));
      return result[0];
    } catch (error) {
      console.error(`❌ Failed to get user by email ${email}:`, error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      // Convert InsertUser to CreateUserData format for auth adapter
      const createUserData: CreateUserData = {
        username: user.username,
        name: user.name,
        email: user.email,
        password: user.password, // Will be hashed by adapter
        role: user.role || 'staff',
        passwordChangeRequired: user.passwordChangeRequired ?? false,
        emailVerified: user.emailVerified ?? false,
        invitationToken: user.invitationToken || undefined,
        invitationExpiresAt: user.invitationExpiresAt || undefined,
        failedLoginAttempts: user.failedLoginAttempts ?? 0
      };

      // Use multi-provider auth adapter - NO FALLBACKS
      const authAdapter = await this.getAuthAdapter();
      const authUser = await authAdapter.createUser(createUserData);
      
      // Convert AuthUser to schema User format for backward compatibility
      return this.convertAuthUserToSchemaUser(authUser);
    } catch (error) {
      console.error(`❌ Failed to create user ${user.username}:`, error);
      throw error;
    }
  }

  async updateUser(userId: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      // Use multi-provider auth adapter for user updates - NO FALLBACKS
      const authAdapter = await this.getAuthAdapter();
      
      // Convert InsertUser data to User data format, handling nullable fields
      const updateData: Partial<User> = {
        ...userData,
        passwordChangeRequired: userData.passwordChangeRequired ?? false,
        updatedAt: new Date()
      };
      
      const updatedAuthUser = await authAdapter.updateUser(userId, updateData);
      return this.convertAuthUserToSchemaUser(updatedAuthUser);
    } catch (error) {
      console.error(`❌ Failed to update user ${userId}:`, error);
      throw error;
    }
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    try {
      // Use multi-provider auth adapter - NO FALLBACKS
      const authAdapter = await this.getAuthAdapter();
      await authAdapter.updateUserPassword(userId, hashedPassword);
    } catch (error) {
      console.error(`❌ Failed to update password for user ${userId}:`, error);
      throw error;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      // Use multi-provider auth adapter - NO FALLBACKS
      const authAdapter = await this.getAuthAdapter();
      await authAdapter.deleteUser(userId);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete user ${userId}:`, error);
      throw error;
    }
  }

  // ====== UTILITY METHODS FOR BACKWARD COMPATIBILITY ======

  /**
   * Convert AuthUser (from DatabaseAuthAdapter) to schema User format
   * Maintains backward compatibility with existing code
   */
  private convertAuthUserToSchemaUser(authUser: AuthUser): User {
    return {
      id: authUser.id,
      username: authUser.username,
      password: authUser.password,
      name: authUser.name,
      email: authUser.email,
      role: authUser.role,
      passwordChangeRequired: authUser.passwordChangeRequired,
      emailVerified: authUser.emailVerified,
      invitationToken: authUser.invitationToken || null,
      invitationExpiresAt: authUser.invitationExpiresAt || null,
      lastLoginAt: authUser.lastLoginAt || null,
      failedLoginAttempts: authUser.failedLoginAttempts,
      accountLockedUntil: authUser.accountLockedUntil || null,
      passwordChangedAt: authUser.passwordChangedAt || null,
      createdAt: authUser.createdAt,
      updatedAt: authUser.updatedAt
    };
  }

  // Event operations
  async getEvent(id: number): Promise<WeddingEvent | undefined> {
    const result = await db.select().from(weddingEvents).where(eq(weddingEvents.id, id));
    return result[0];
  }

  async eventExists(id: number): Promise<boolean> {
    if (!id) return false;
    try {
      const result = await db.select({ id: weddingEvents.id })
        .from(weddingEvents)
        .where(eq(weddingEvents.id, id))
        .limit(1);
      return result.length > 0;
    } catch (error) {
      
      return false;
    }
  }

  async getAllEvents(): Promise<WeddingEvent[]> {
    return await db.select().from(weddingEvents);
  }

  async getEventsByUser(userId: number): Promise<WeddingEvent[]> {
    return await db.select().from(weddingEvents).where(eq(weddingEvents.createdBy, userId));
  }

  async createEvent(event: InsertWeddingEvent): Promise<WeddingEvent> {
    const result = await db.insert(weddingEvents).values(event).returning();
    return result[0];
  }

  async updateEvent(id: number, event: Partial<InsertWeddingEvent>): Promise<WeddingEvent | undefined> {
    const result = await db.update(weddingEvents)
      .set(event)
      .where(eq(weddingEvents.id, id))
      .returning();
    return result[0];
  }

  async updateEventEmailConfig(id: number, config: EmailConfig): Promise<WeddingEvent | undefined> {
    const result = await db.update(weddingEvents)
      .set(config)
      .where(eq(weddingEvents.id, id))
      .returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(weddingEvents).where(eq(weddingEvents.id, id));
    return !!result;
  }

  // Guest operations
  async getGuest(id: number): Promise<Guest | undefined> {
    const result = await db.select().from(guests).where(eq(guests.id, id));
    return result[0];
  }

  async getGuestByEmail(email: string): Promise<Guest | undefined> {
    const result = await db.select().from(guests).where(eq(guests.email, email));
    return result[0];
  }

  async getGuestsByEvent(eventId: number): Promise<Guest[]> {
    return await db.select().from(guests).where(eq(guests.eventId, eventId));
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const result = await db.insert(guests).values(guest).returning();
    return result[0];
  }

  async updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest | undefined> {
    const result = await db.update(guests)
      .set(guest)
      .where(eq(guests.id, id))
      .returning();
    return result[0];
  }

  async deleteGuest(id: number): Promise<boolean> {
    const result = await db.delete(guests).where(eq(guests.id, id));
    return !!result;
  }

  async updateGuestRsvpStatus(id: number, status: string): Promise<Guest | undefined> {
    const result = await db.update(guests)
      .set({ rsvpStatus: status })
      .where(eq(guests.id, id))
      .returning();
    return result[0];
  }

  async bulkCreateGuests(guestList: InsertGuest[]): Promise<Guest[]> {
    const result = await db.insert(guests).values(guestList).returning();
    return result;
  }

  // Ceremony operations
  async getCeremony(id: number): Promise<Ceremony | undefined> {
    const result = await db.select().from(ceremonies).where(eq(ceremonies.id, id));
    return result[0];
  }

  async getCeremoniesByEvent(eventId: number): Promise<Ceremony[]> {
    return await db.select().from(ceremonies).where(eq(ceremonies.eventId, eventId));
  }

  async createCeremony(ceremony: InsertCeremony): Promise<Ceremony> {
    const result = await db.insert(ceremonies).values(ceremony).returning();
    return result[0];
  }

  async updateCeremony(id: number, ceremony: Partial<InsertCeremony>): Promise<Ceremony | undefined> {
    const result = await db.update(ceremonies)
      .set(ceremony)
      .where(eq(ceremonies.id, id))
      .returning();
    return result[0];
  }

  async deleteCeremony(id: number): Promise<boolean> {
    const result = await db.delete(ceremonies).where(eq(ceremonies.id, id));
    return !!result;
  }

  // Guest Ceremony operations
  async getGuestCeremony(guestId: number, ceremonyId: number): Promise<GuestCeremony | undefined> {
    const result = await db.select().from(guestCeremonies)
      .where(and(
        eq(guestCeremonies.guestId, guestId),
        eq(guestCeremonies.ceremonyId, ceremonyId)
      ));
    return result[0];
  }

  async getGuestCeremoniesByGuest(guestId: number): Promise<GuestCeremony[]> {
    return await db.select().from(guestCeremonies).where(eq(guestCeremonies.guestId, guestId));
  }

  async getGuestCeremoniesByCeremony(ceremonyId: number): Promise<GuestCeremony[]> {
    return await db.select().from(guestCeremonies).where(eq(guestCeremonies.ceremonyId, ceremonyId));
  }

  async createGuestCeremony(guestCeremony: InsertGuestCeremony): Promise<GuestCeremony> {
    const result = await db.insert(guestCeremonies).values(guestCeremony).returning();
    return result[0];
  }

  async updateGuestCeremony(id: number, guestCeremony: Partial<InsertGuestCeremony>): Promise<GuestCeremony | undefined> {
    const result = await db.update(guestCeremonies)
      .set(guestCeremony)
      .where(eq(guestCeremonies.id, id))
      .returning();
    return result[0];
  }

  // Travel operations
  async getTravelInfo(id: number): Promise<TravelInfo | undefined> {
    const result = await db.select().from(travelInfo).where(eq(travelInfo.id, id));
    return result[0];
  }

  async getTravelInfoByGuest(guestId: number): Promise<TravelInfo | undefined> {
    const result = await db.select().from(travelInfo).where(eq(travelInfo.guestId, guestId));
    return result[0];
  }

  async createTravelInfo(info: InsertTravelInfo): Promise<TravelInfo> {
    const result = await db.insert(travelInfo).values(info).returning();
    return result[0];
  }

  async updateTravelInfo(id: number, info: Partial<InsertTravelInfo>): Promise<TravelInfo | undefined> {
    const result = await db.update(travelInfo)
      .set(info)
      .where(eq(travelInfo.id, id))
      .returning();
    return result[0];
  }

  // Hotel operations
  async getHotel(id: number): Promise<Hotel | undefined> {
    const result = await db.select().from(hotels).where(eq(hotels.id, id));
    return result[0];
  }

  async getHotelByName(name: string): Promise<Hotel | undefined> {
    const result = await db.select().from(hotels).where(eq(hotels.name, name));
    return result[0];
  }

  async getHotelsByEvent(eventId: number): Promise<Hotel[]> {
    return await db.select().from(hotels).where(eq(hotels.eventId, eventId));
  }

  async createHotel(hotel: InsertHotel): Promise<Hotel> {
    const result = await db.insert(hotels).values(hotel).returning();
    return result[0];
  }

  async updateHotel(id: number, hotel: Partial<InsertHotel>): Promise<Hotel | undefined> {
    const result = await db.update(hotels)
      .set(hotel)
      .where(eq(hotels.id, id))
      .returning();
    return result[0];
  }

  async deleteHotel(id: number): Promise<boolean> {
    const result = await db.delete(hotels).where(eq(hotels.id, id));
    return !!result;
  }

  // Global Room Type operations
  async getGlobalRoomType(id: number): Promise<GlobalRoomType | undefined> {
    const result = await db.select().from(globalRoomTypes).where(eq(globalRoomTypes.id, id));
    return result[0];
  }

  async getGlobalRoomTypesByHotelName(hotelName: string): Promise<GlobalRoomType[]> {
    return await db.select().from(globalRoomTypes).where(eq(globalRoomTypes.hotelName, hotelName));
  }

  async getAllGlobalRoomTypes(): Promise<GlobalRoomType[]> {
    return await db.select().from(globalRoomTypes);
  }

  async createGlobalRoomType(roomType: InsertGlobalRoomType): Promise<GlobalRoomType> {
    const result = await db.insert(globalRoomTypes).values(roomType).returning();
    return result[0];
  }

  async updateGlobalRoomType(id: number, roomType: Partial<InsertGlobalRoomType>): Promise<GlobalRoomType | undefined> {
    const result = await db.update(globalRoomTypes)
      .set(roomType)
      .where(eq(globalRoomTypes.id, id))
      .returning();
    return result[0];
  }

  async deleteGlobalRoomType(id: number): Promise<boolean> {
    const result = await db.delete(globalRoomTypes).where(eq(globalRoomTypes.id, id));
    return !!result;
  }

  // Performance-optimized batch operations
  async getEventStatistics(eventId: number): Promise<{
    total: number;
    confirmed: number;
    declined: number;
    pending: number;
    plusOnes: number;
    children: number;
  }> {
    const guestList = await db.select().from(guests).where(eq(guests.eventId, eventId));
    
    const stats = {
      total: guestList.length,
      confirmed: 0,
      declined: 0,
      pending: 0,
      plusOnes: 0,
      children: 0
    };
    
    for (const guest of guestList) {
      switch (guest.rsvpStatus) {
        case 'confirmed':
          stats.confirmed++;
          break;
        case 'declined':
          stats.declined++;
          break;
        default:
          stats.pending++;
          break;
      }
      
      if (guest.plusOneName) {
        stats.plusOnes++;
      }
      
      if (guest.numberOfChildren > 0) {
        stats.children += guest.numberOfChildren;
      }
    }
    
    return stats;
  }

  async getCeremoniesForEvent(eventId: number): Promise<Ceremony[]> {
    return await db.select().from(ceremonies).where(eq(ceremonies.eventId, eventId));
  }

  async getWizardProgress(eventId: number): Promise<any> {
    // For now, return empty progress - this would be implemented with a proper progress tracking table
    return {
      currentStep: 'basic_info',
      steps: {}
    };
  }

  async getEvents(): Promise<WeddingEvent[]> {
    return await db.select().from(weddingEvents);
  }

  // Accommodation operations
  async getAccommodation(id: number): Promise<Accommodation | undefined> {
    const result = await db.select().from(accommodations).where(eq(accommodations.id, id));
    return result[0];
  }

  async getAccommodationsByEvent(eventId: number): Promise<Accommodation[]> {
    return await db.select().from(accommodations).where(eq(accommodations.eventId, eventId));
  }

  async getAccommodationsByHotel(hotelId: number): Promise<Accommodation[]> {
    return await db.select().from(accommodations).where(eq(accommodations.hotelId, hotelId));
  }

  async createAccommodation(accommodation: InsertAccommodation): Promise<Accommodation> {
    const result = await db.insert(accommodations).values(accommodation).returning();
    return result[0];
  }

  async updateAccommodation(id: number, accommodation: Partial<InsertAccommodation>): Promise<Accommodation | undefined> {
    const result = await db.update(accommodations)
      .set(accommodation)
      .where(eq(accommodations.id, id))
      .returning();
    return result[0];
  }

  async deleteAccommodation(id: number): Promise<boolean> {
    const result = await db.delete(accommodations).where(eq(accommodations.id, id));
    return !!result;
  }

  // Room Allocation operations
  async getRoomAllocation(id: number): Promise<RoomAllocation | undefined> {
    const result = await db.select().from(roomAllocations).where(eq(roomAllocations.id, id));
    return result[0];
  }

  async getRoomAllocationsByAccommodation(accommodationId: number): Promise<RoomAllocation[]> {
    return await db.select().from(roomAllocations).where(eq(roomAllocations.accommodationId, accommodationId));
  }

  async getRoomAllocationsByGuest(guestId: number): Promise<RoomAllocation[]> {
    return await db.select().from(roomAllocations).where(eq(roomAllocations.guestId, guestId));
  }

  async createRoomAllocation(roomAllocation: InsertRoomAllocation): Promise<RoomAllocation> {
    const result = await db.insert(roomAllocations).values(roomAllocation).returning();
    return result[0];
  }

  async updateRoomAllocation(id: number, roomAllocation: Partial<InsertRoomAllocation>): Promise<RoomAllocation | undefined> {
    const result = await db.update(roomAllocations)
      .set(roomAllocation)
      .where(eq(roomAllocations.id, id))
      .returning();
    return result[0];
  }

  // Meal operations
  async getMealOption(id: number): Promise<MealOption | undefined> {
    const result = await db.select().from(mealOptions).where(eq(mealOptions.id, id));
    return result[0];
  }

  async getMealOptionsByCeremony(ceremonyId: number): Promise<MealOption[]> {
    return await db.select().from(mealOptions).where(eq(mealOptions.ceremonyId, ceremonyId));
  }

  async createMealOption(mealOption: InsertMealOption): Promise<MealOption> {
    const result = await db.insert(mealOptions).values(mealOption).returning();
    return result[0];
  }

  async updateMealOption(id: number, mealOption: Partial<InsertMealOption>): Promise<MealOption | undefined> {
    const result = await db.update(mealOptions)
      .set(mealOption)
      .where(eq(mealOptions.id, id))
      .returning();
    return result[0];
  }

  async deleteMealOption(id: number): Promise<boolean> {
    const result = await db.delete(mealOptions).where(eq(mealOptions.id, id));
    return !!result;
  }

  // Guest Meal Selection operations
  async getGuestMealSelection(id: number): Promise<GuestMealSelection | undefined> {
    const result = await db.select().from(guestMealSelections).where(eq(guestMealSelections.id, id));
    return result[0];
  }

  async getGuestMealSelectionsByGuest(guestId: number): Promise<GuestMealSelection[]> {
    return await db.select().from(guestMealSelections).where(eq(guestMealSelections.guestId, guestId));
  }

  async createGuestMealSelection(guestMealSelection: InsertGuestMealSelection): Promise<GuestMealSelection> {
    const result = await db.insert(guestMealSelections).values(guestMealSelection).returning();
    return result[0];
  }

  async updateGuestMealSelection(id: number, guestMealSelection: Partial<InsertGuestMealSelection>): Promise<GuestMealSelection | undefined> {
    const result = await db.update(guestMealSelections)
      .set(guestMealSelection)
      .where(eq(guestMealSelections.id, id))
      .returning();
    return result[0];
  }

  // Couple Message operations
  async createCoupleMessage(coupleMessage: InsertCoupleMessage): Promise<CoupleMessage> {
    const result = await db.insert(coupleMessages).values(coupleMessage).returning();
    return result[0];
  }

  // Relationship Type operations
  async getRelationshipType(id: number): Promise<RelationshipType | undefined> {
    const result = await db.select().from(relationshipTypes).where(eq(relationshipTypes.id, id));
    return result[0];
  }

  async getAllRelationshipTypes(): Promise<RelationshipType[]> {
    return await db.select().from(relationshipTypes);
  }

  async createRelationshipType(relationshipType: InsertRelationshipType): Promise<RelationshipType> {
    const result = await db.insert(relationshipTypes).values(relationshipType).returning();
    return result[0];
  }

  async updateRelationshipType(id: number, relationshipType: Partial<InsertRelationshipType>): Promise<RelationshipType | undefined> {
    const result = await db.update(relationshipTypes)
      .set(relationshipType)
      .where(eq(relationshipTypes.id, id))
      .returning();
    return result[0];
  }

  async deleteRelationshipType(id: number): Promise<boolean> {
    const result = await db.delete(relationshipTypes).where(eq(relationshipTypes.id, id));
    return !!result;
  }

  // WhatsApp Template operations
  async getWhatsappTemplate(id: number): Promise<WhatsappTemplate | undefined> {
    const result = await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.id, id));
    return result[0];
  }

  async getWhatsappTemplatesByEvent(eventId: number): Promise<WhatsappTemplate[]> {
    return await db.select().from(whatsappTemplates).where(eq(whatsappTemplates.eventId, eventId));
  }

  async getWhatsappTemplatesByCategory(eventId: number, category: string): Promise<WhatsappTemplate[]> {
    return await db.select().from(whatsappTemplates)
      .where(and(
        eq(whatsappTemplates.eventId, eventId),
        eq(whatsappTemplates.category, category)
      ));
  }

  async createWhatsappTemplate(template: InsertWhatsappTemplate): Promise<WhatsappTemplate> {
    const result = await db.insert(whatsappTemplates).values(template).returning();
    return result[0];
  }

  async updateWhatsappTemplate(id: number, template: Partial<InsertWhatsappTemplate>): Promise<WhatsappTemplate | undefined> {
    const result = await db.update(whatsappTemplates)
      .set(template)
      .where(eq(whatsappTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteWhatsappTemplate(id: number): Promise<boolean> {
    const result = await db.delete(whatsappTemplates).where(eq(whatsappTemplates.id, id));
    return !!result;
  }

  async markWhatsappTemplateAsUsed(id: number): Promise<WhatsappTemplate | undefined> {
    const result = await db.update(whatsappTemplates)
      .set({ lastUsed: new Date() })
      .where(eq(whatsappTemplates.id, id))
      .returning();
    return result[0];
  }

  // RSVP Follow-up Template operations
  async getRsvpFollowupTemplate(id: number): Promise<RsvpFollowupTemplate | undefined> {
    const result = await db.select().from(rsvpFollowupTemplates).where(eq(rsvpFollowupTemplates.id, id));
    return result[0];
  }

  async getRsvpFollowupTemplateByType(eventId: number, type: string): Promise<RsvpFollowupTemplate | undefined> {
    const result = await db.select().from(rsvpFollowupTemplates)
      .where(and(
        eq(rsvpFollowupTemplates.eventId, eventId),
        eq(rsvpFollowupTemplates.type, type)
      ));
    return result[0];
  }

  async getRsvpFollowupTemplatesByEvent(eventId: number): Promise<RsvpFollowupTemplate[]> {
    return await db.select().from(rsvpFollowupTemplates).where(eq(rsvpFollowupTemplates.eventId, eventId));
  }

  async createRsvpFollowupTemplate(template: InsertRsvpFollowupTemplate): Promise<RsvpFollowupTemplate> {
    const result = await db.insert(rsvpFollowupTemplates).values(template).returning();
    return result[0];
  }

  async updateRsvpFollowupTemplate(id: number, template: Partial<InsertRsvpFollowupTemplate>): Promise<RsvpFollowupTemplate | undefined> {
    const result = await db.update(rsvpFollowupTemplates)
      .set(template)
      .where(eq(rsvpFollowupTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteRsvpFollowupTemplate(id: number): Promise<boolean> {
    const result = await db.delete(rsvpFollowupTemplates).where(eq(rsvpFollowupTemplates.id, id));
    return !!result;
  }

  // Guest Communication Contact Helper
  // Returns the effective contact information based on RSVP contact preference
  getEffectiveGuestContact(guest: any): {
    email: string | null;
    phone: string | null;
    name: string;
    contactType: 'guest' | 'plus_one';
  } {
    const usePlusOneContact = guest.plusOneRsvpContact && guest.plusOneConfirmed && guest.plusOneName;
    
    if (usePlusOneContact) {
      return {
        email: guest.plusOneEmail || null,
        phone: guest.plusOnePhone || null,
        name: guest.plusOneName,
        contactType: 'plus_one'
      };
    }
    
    return {
      email: guest.email || null,
      phone: guest.phone || null,
      name: `${guest.firstName || ''} ${guest.lastName || ''}`.trim(),
      contactType: 'guest'
    };
  }

  // RSVP Follow-up Log operations
  async getRsvpFollowupLogsByGuest(guestId: number): Promise<RsvpFollowupLog[]> {
    return await db.select().from(rsvpFollowupLogs).where(eq(rsvpFollowupLogs.guestId, guestId));
  }

  async createRsvpFollowupLog(log: InsertRsvpFollowupLog): Promise<RsvpFollowupLog> {
    const result = await db.insert(rsvpFollowupLogs).values(log).returning();
    return result[0];
  }

  // Transport Group operations
  async getTransportGroup(id: number): Promise<TransportGroup | undefined> {
    const result = await db.select().from(transportGroups).where(eq(transportGroups.id, id));
    return result[0];
  }

  async getTransportGroupsByEvent(eventId: number): Promise<TransportGroup[]> {
    return await db.select().from(transportGroups).where(eq(transportGroups.eventId, eventId));
  }

  async createTransportGroup(group: InsertTransportGroup): Promise<TransportGroup> {
    const result = await db.insert(transportGroups).values(group).returning();
    return result[0];
  }

  async updateTransportGroup(id: number, group: Partial<InsertTransportGroup>): Promise<TransportGroup | undefined> {
    const result = await db.update(transportGroups)
      .set(group)
      .where(eq(transportGroups.id, id))
      .returning();
    return result[0];
  }

  async deleteTransportGroup(id: number): Promise<boolean> {
    const result = await db.delete(transportGroups).where(eq(transportGroups.id, id));
    return !!result;
  }

  // Transport Allocation operations
  async getTransportAllocation(id: number): Promise<TransportAllocation | undefined> {
    const result = await db.select().from(transportAllocations).where(eq(transportAllocations.id, id));
    return result[0];
  }

  async getTransportAllocationsByGroup(groupId: number): Promise<TransportAllocation[]> {
    return await db.select().from(transportAllocations).where(eq(transportAllocations.transportGroupId, groupId));
  }

  async getTransportAllocationsByGuest(guestId: number): Promise<TransportAllocation[]> {
    return await db.select().from(transportAllocations).where(eq(transportAllocations.guestId, guestId));
  }

  async createTransportAllocation(allocation: InsertTransportAllocation): Promise<TransportAllocation> {
    const result = await db.insert(transportAllocations).values(allocation).returning();
    return result[0];
  }

  async updateTransportAllocation(id: number, allocation: Partial<InsertTransportAllocation>): Promise<TransportAllocation | undefined> {
    const result = await db.update(transportAllocations)
      .set(allocation)
      .where(eq(transportAllocations.id, id))
      .returning();
    return result[0];
  }

  async deleteTransportAllocation(id: number): Promise<boolean> {
    const result = await db.delete(transportAllocations).where(eq(transportAllocations.id, id));
    return !!result;
  }
  
  // Transaction support for atomic operations
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return await db.transaction(async (tx: any) => {
      // Create a new storage instance using the transaction
      const txStorage = new DatabaseStorage();
      (txStorage as any).db = tx; // Override db with transaction
      
      // Execute callback with transaction-aware storage
      return await callback.call(txStorage);
    });
  }
}

export const storage = new DatabaseStorage();

// Standard database operations - no analytics overhead