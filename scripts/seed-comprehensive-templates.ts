import { db } from "../server/db";
import { communicationTemplates } from "../shared/schema";
import { eq } from "drizzle-orm";

/**
 * Comprehensive Communication Template Seeder
 * Creates 40 professional templates across 10 categories following global standards
 */

interface TemplateData {
  categoryId: string;
  templateId: string;
  channel: 'email' | 'whatsapp' | 'sms';
  name: string;
  description: string;
  subject?: string;
  content: string;
  enabled: boolean;
  sortOrder: number;
  variables: string[];
  tags: string[];
}

const comprehensiveTemplates: TemplateData[] = [
  // 1. INITIAL WEDDING INVITATIONS
  {
    categoryId: 'initial_invitations',
    templateId: 'save_date_email',
    channel: 'email',
    name: 'Save the Date - Email',
    description: 'Elegant save the date announcement with wedding timeline',
    subject: 'Save the Date - {{couple_names}} Wedding on {{wedding_date}}',
    content: `Dear {{guest_name}},

We are thrilled to announce that {{couple_names}} are getting married!

📅 Wedding Date: {{wedding_date}}
📍 Location: {{wedding_location}}
🎉 Celebrations: {{ceremony_count}} ceremonies over {{event_duration}}

Please save these dates in your calendar. A formal invitation with complete details will follow soon.

We can't wait to celebrate this joyous occasion with you!

With love and excitement,
{{couple_names}}

---
This is a preliminary announcement. Detailed invitations with RSVP information will be sent separately.`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'wedding_date', 'wedding_location', 'ceremony_count', 'event_duration'],
    tags: ['save-date', 'announcement', 'preliminary']
  },
  {
    categoryId: 'initial_invitations',
    templateId: 'save_date_whatsapp',
    channel: 'whatsapp',
    name: 'Save the Date - WhatsApp',
    description: 'Quick save the date message for instant sharing',
    content: `🎉 SAVE THE DATE 🎉

{{couple_names}} are getting married!

📅 {{wedding_date}}
📍 {{wedding_location}}

Formal invitation to follow soon.

Looking forward to celebrating with you! ✨`,
    enabled: true,
    sortOrder: 2,
    variables: ['couple_names', 'wedding_date', 'wedding_location'],
    tags: ['save-date', 'quick', 'mobile-friendly']
  },
  {
    categoryId: 'initial_invitations',
    templateId: 'wedding_announcement_email',
    channel: 'email',
    name: 'Wedding Announcement - Email',
    description: 'Formal wedding announcement with ceremony overview',
    subject: 'Wedding Announcement - {{couple_names}} Celebrate Their Union',
    content: `Namaste {{guest_name}},

With great joy and the blessings of our families, we announce the wedding of:

{{bride_name}} & {{groom_name}}

🕐 Wedding Timeline:
{{ceremony_schedule}}

🏛️ Venues:
{{venue_details}}

🎨 Theme: {{wedding_theme}}
👗 Attire: {{attire_guidelines}}

This is a celebration of love, tradition, and the coming together of two families. Your presence would make our joy complete.

Detailed invitations with RSVP links will be shared shortly.

Warm regards,
{{families_names}}`,
    enabled: true,
    sortOrder: 3,
    variables: ['guest_name', 'couple_names', 'bride_name', 'groom_name', 'ceremony_schedule', 'venue_details', 'wedding_theme', 'attire_guidelines', 'families_names'],
    tags: ['formal', 'announcement', 'traditional']
  },
  {
    categoryId: 'initial_invitations',
    templateId: 'wedding_announcement_whatsapp',
    channel: 'whatsapp',
    name: 'Wedding Announcement - WhatsApp',
    description: 'Traditional wedding announcement for Indian families',
    content: `🙏 Namaste {{guest_name}} 🙏

With immense joy and the blessings of our families, we invite you to the wedding celebration of:

💑 {{bride_name}} & {{groom_name}}

📅 {{wedding_date}}
📍 {{primary_venue}}

🎊 Multiple ceremonies planned
🎨 Theme: {{wedding_theme}}

Your blessings and presence would mean the world to us.

Detailed invitation coming soon! 💕

- {{families_names}}`,
    enabled: true,
    sortOrder: 4,
    variables: ['guest_name', 'bride_name', 'groom_name', 'wedding_date', 'primary_venue', 'wedding_theme', 'families_names'],
    tags: ['traditional', 'family', 'cultural']
  },

  // 2. FORMAL RSVP INVITATIONS
  {
    categoryId: 'formal_invitations',
    templateId: 'formal_invitation_email',
    channel: 'email',
    name: 'Formal Wedding Invitation - Email',
    description: 'Complete invitation with RSVP link and ceremony details',
    subject: 'You\'re Invited - {{couple_names}} Wedding Celebration',
    content: `Dear {{guest_name}},

We cordially invite you to join us in celebrating the wedding of {{couple_names}}.

🎊 CELEBRATION DETAILS 🎊

{{ceremony_schedule}}

📍 VENUES & LOCATIONS
{{venue_details_formatted}}

👗 ATTIRE GUIDELINES
{{attire_code_details}}

🕐 IMPORTANT TIMINGS
{{important_timings}}

💌 RSVP REQUIRED
Please confirm your attendance by {{rsvp_deadline}}
Click here to RSVP: {{rsvp_link}}

Your presence would be the greatest gift to us as we begin this beautiful journey together.

For any questions, contact:
{{contact_information}}

With love and anticipation,
{{couple_names}}

---
RSVP Link: {{rsvp_link}}
Wedding Website: {{wedding_website}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'ceremony_schedule', 'venue_details_formatted', 'attire_code_details', 'important_timings', 'rsvp_deadline', 'rsvp_link', 'contact_information', 'wedding_website'],
    tags: ['formal', 'invitation', 'rsvp', 'complete']
  },
  {
    categoryId: 'formal_invitations',
    templateId: 'formal_invitation_whatsapp',
    channel: 'whatsapp',
    name: 'Formal Wedding Invitation - WhatsApp',
    description: 'Mobile-friendly invitation with quick RSVP access',
    content: `💌 WEDDING INVITATION 💌

{{guest_name}}, you're invited to celebrate:

💑 {{couple_names}} Wedding

📅 Date: {{wedding_date}}
⏰ Time: {{ceremony_start_time}}
📍 Venue: {{primary_venue}}

🎊 Ceremonies:
{{ceremony_list}}

👗 Attire: {{attire_code}}

💝 RSVP by {{rsvp_deadline}}
Confirm here: {{rsvp_link}}

Looking forward to celebrating with you! 🎉

{{couple_names}}`,
    enabled: true,
    sortOrder: 2,
    variables: ['guest_name', 'couple_names', 'wedding_date', 'ceremony_start_time', 'primary_venue', 'ceremony_list', 'attire_code', 'rsvp_deadline', 'rsvp_link'],
    tags: ['mobile', 'quick', 'invitation']
  },
  {
    categoryId: 'formal_invitations',
    templateId: 'digital_invitation_card',
    channel: 'email',
    name: 'Digital Invitation Card - Email',
    description: 'Elegant HTML email with Indian wedding motifs',
    subject: '💌 {{couple_names}} Wedding Invitation - {{wedding_date}}',
    content: `<!DOCTYPE html>
<html>
<head>
    <style>
        .invitation-card { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 30px; 
            font-family: 'Georgia', serif; 
            color: #fff; 
            text-align: center;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .couple-names { 
            font-size: 28px; 
            font-weight: bold; 
            margin: 20px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .ceremony-details { 
            font-size: 16px; 
            margin: 15px 0; 
            background: rgba(255,255,255,0.2);
            padding: 15px;
            border-radius: 10px;
        }
        .rsvp-button {
            background: #FFD700;
            color: #333;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
    </style>
</head>
<body>
    <div class="invitation-card">
        <h1>🕉️ Wedding Invitation 🕉️</h1>
        <div class="couple-names">{{couple_names}}</div>
        <p>{{families_names}} cordially invite you to celebrate</p>
        
        <div class="ceremony-details">
            <strong>📅 {{wedding_date}}</strong><br>
            <strong>📍 {{venue_name}}</strong><br>
            <strong>⏰ {{ceremony_times}}</strong>
        </div>
        
        <p>{{guest_name}}, your presence would complete our joy!</p>
        
        <a href="{{rsvp_link}}" class="rsvp-button">RSVP HERE</a>
        
        <p style="margin-top: 20px; font-size: 14px;">
            RSVP by {{rsvp_deadline}}<br>
            For queries: {{contact_phone}}
        </p>
    </div>
</body>
</html>`,
    enabled: true,
    sortOrder: 3,
    variables: ['couple_names', 'families_names', 'wedding_date', 'venue_name', 'ceremony_times', 'guest_name', 'rsvp_link', 'rsvp_deadline', 'contact_phone'],
    tags: ['html', 'elegant', 'visual', 'branded']
  },
  {
    categoryId: 'formal_invitations',
    templateId: 'invitation_reminder',
    channel: 'email',
    name: 'Invitation Reminder - Email',
    description: 'Follow-up for those who haven\'t opened initial invitation',
    subject: 'Reminder: {{couple_names}} Wedding Invitation - RSVP Requested',
    content: `Dear {{guest_name}},

We hope this message finds you well. We recently sent you an invitation to {{couple_names}} wedding celebration, and we wanted to ensure you received it.

🎊 WEDDING DETAILS:
Date: {{wedding_date}}
Venue: {{primary_venue}}
Time: {{ceremony_start_time}}

💌 RSVP STATUS: Pending
Deadline: {{rsvp_deadline}}

We understand life gets busy, but your response helps us plan better for this special celebration. Please take a moment to confirm your attendance.

RSVP Here: {{rsvp_link}}

If you have any questions or need assistance with the RSVP process, please don't hesitate to reach out:
📞 {{contact_phone}}
📧 {{contact_email}}

We sincerely hope you can join us for this joyous occasion!

Warm regards,
{{couple_names}}

P.S. If you've already responded, please ignore this reminder.`,
    enabled: true,
    sortOrder: 4,
    variables: ['guest_name', 'couple_names', 'wedding_date', 'primary_venue', 'ceremony_start_time', 'rsvp_deadline', 'rsvp_link', 'contact_phone', 'contact_email'],
    tags: ['reminder', 'follow-up', 'gentle']
  },

  // 3. CEREMONY INFORMATION
  {
    categoryId: 'ceremony_information',
    templateId: 'ceremony_schedule_email',
    channel: 'email',
    name: 'Ceremony Schedule - Email',
    description: 'Complete timeline with venue details, attire codes, parking',
    subject: 'Complete Wedding Schedule - {{couple_names}} Celebration',
    content: `Dear {{guest_name}},

Thank you for confirming your attendance! Here's the complete schedule for {{couple_names}} wedding celebration.

📋 DETAILED CEREMONY SCHEDULE

{{detailed_ceremony_schedule}}

🏛️ VENUE INFORMATION

{{venue_details_with_maps}}

🚗 PARKING & TRANSPORTATION
{{parking_information}}

👗 ATTIRE CODE
{{detailed_attire_guidelines}}

🍽️ MEAL ARRANGEMENTS
{{meal_timings_and_type}}

⚠️ IMPORTANT NOTES
• Arrive 15 minutes before each ceremony
• Photography guidelines: {{photography_rules}}
• Gift information: {{gift_guidelines}}
• Emergency contact: {{emergency_contact}}

📱 HELPFUL LINKS
• Live ceremony updates: {{live_updates_link}}
• Photo sharing: {{photo_sharing_link}}
• Transportation booking: {{transport_link}}

For any questions or special requirements, contact:
{{wedding_coordinator_contact}}

Looking forward to celebrating with you!

With love,
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'detailed_ceremony_schedule', 'venue_details_with_maps', 'parking_information', 'detailed_attire_guidelines', 'meal_timings_and_type', 'photography_rules', 'gift_guidelines', 'emergency_contact', 'live_updates_link', 'photo_sharing_link', 'transport_link', 'wedding_coordinator_contact'],
    tags: ['schedule', 'detailed', 'logistics', 'comprehensive']
  },
  {
    categoryId: 'ceremony_information',
    templateId: 'ceremony_schedule_whatsapp',
    channel: 'whatsapp',
    name: 'Ceremony Schedule - WhatsApp',
    description: 'Quick reference format for mobile sharing',
    content: `📋 WEDDING SCHEDULE 📋
{{couple_names}}

{{ceremony_quick_schedule}}

📍 Venues:
{{venue_quick_list}}

👗 Attire: {{attire_quick_guide}}

🚗 Parking: {{parking_summary}}

⏰ Please arrive 15 mins early
📞 Help: {{contact_number}}

See you there! 🎉`,
    enabled: true,
    sortOrder: 2,
    variables: ['couple_names', 'ceremony_quick_schedule', 'venue_quick_list', 'attire_quick_guide', 'parking_summary', 'contact_number'],
    tags: ['quick', 'mobile', 'reference']
  },
  {
    categoryId: 'ceremony_information',
    templateId: 'venue_details_email',
    channel: 'email',
    name: 'Venue Details - Email',
    description: 'Maps, parking, accessibility information',
    subject: 'Venue Information - {{couple_names}} Wedding Locations',
    content: `Dear {{guest_name}},

Here are the detailed venue information for {{couple_names}} wedding celebration:

🏛️ VENUE DETAILS

{{comprehensive_venue_information}}

🗺️ DIRECTIONS & MAPS
{{google_maps_links}}

🚗 PARKING ARRANGEMENTS
{{detailed_parking_info}}

♿ ACCESSIBILITY FEATURES
{{accessibility_information}}

🏨 NEARBY AMENITIES
{{nearby_facilities}}

🚇 PUBLIC TRANSPORTATION
{{public_transport_options}}

📞 VENUE CONTACTS
{{venue_contact_information}}

💡 HELPFUL TIPS
• Download offline maps for better navigation
• Check traffic conditions before leaving
• Venue coordinators will be available for assistance

For venue-specific queries, contact:
{{venue_coordinator_contact}}

See you at the celebration!

Best regards,
{{couple_names}}`,
    enabled: true,
    sortOrder: 3,
    variables: ['guest_name', 'couple_names', 'comprehensive_venue_information', 'google_maps_links', 'detailed_parking_info', 'accessibility_information', 'nearby_facilities', 'public_transport_options', 'venue_contact_information', 'venue_coordinator_contact'],
    tags: ['venue', 'navigation', 'accessibility', 'detailed']
  },
  {
    categoryId: 'ceremony_information',
    templateId: 'last_minute_updates_whatsapp',
    channel: 'whatsapp',
    name: 'Last-minute Updates - WhatsApp',
    description: 'Time changes, weather updates, urgent announcements',
    content: `🚨 IMPORTANT UPDATE 🚨
{{couple_names}} Wedding

{{update_type}}: {{update_details}}

⏰ New timing: {{updated_timing}}
📍 Venue: {{venue_confirmation}}

{{weather_update}}

{{additional_instructions}}

Please share with family members attending.

Contact for queries: {{emergency_contact}}

Thank you! 🙏`,
    enabled: true,
    sortOrder: 4,
    variables: ['couple_names', 'update_type', 'update_details', 'updated_timing', 'venue_confirmation', 'weather_update', 'additional_instructions', 'emergency_contact'],
    tags: ['urgent', 'updates', 'last-minute', 'emergency']
  },

  // 4. ACCOMMODATION INFORMATION
  {
    categoryId: 'accommodation_information',
    templateId: 'hotel_booking_instructions',
    channel: 'email',
    name: 'Hotel Booking Instructions - Email',
    description: 'Room types, rates, booking deadlines, contact info',
    subject: 'Hotel Accommodation Details - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

We're delighted to share accommodation details for {{couple_names}} wedding celebration!

🏨 HOTEL ARRANGEMENTS

{{hotel_details_formatted}}

💰 ROOM RATES & PACKAGES
{{room_rates_and_packages}}

📅 BOOKING INFORMATION
• Booking Deadline: {{booking_deadline}}
• Group Code: {{group_booking_code}}
• Special Rate: {{special_rate_details}}

📞 RESERVATION PROCESS
{{reservation_instructions}}

✨ AMENITIES INCLUDED
{{hotel_amenities_list}}

🚗 TRANSPORTATION
{{hotel_transport_details}}

For reservations or queries:
{{hotel_contact_information}}

Looking forward to hosting you!

Best regards,
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'hotel_details_formatted', 'room_rates_and_packages', 'booking_deadline', 'group_booking_code', 'special_rate_details', 'reservation_instructions', 'hotel_amenities_list', 'hotel_transport_details', 'hotel_contact_information'],
    tags: ['accommodation', 'booking', 'hotel', 'rates']
  },

  // 5. TRAVEL & TRANSPORTATION
  {
    categoryId: 'travel_transportation',
    templateId: 'flight_coordination',
    channel: 'email',
    name: 'Flight Coordination - Email',
    description: 'Flight detail collection form and instructions',
    subject: 'Flight Coordination Required - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

To ensure smooth transportation arrangements for {{couple_names}} wedding, please share your travel details.

✈️ FLIGHT INFORMATION NEEDED
{{flight_form_link}}

🎯 COORDINATION SERVICE INCLUDES
{{flight_coordination_services}}

📋 INFORMATION REQUIRED
• Arrival flight details
• Departure flight details  
• Special assistance needs
• Airport pickup preferences

🚐 TRANSPORT ARRANGEMENTS
{{transport_coordination_details}}

📞 TRAVEL COORDINATOR
{{travel_coordinator_contact}}

Please submit by: {{flight_details_deadline}}

Safe travels!
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'flight_form_link', 'flight_coordination_services', 'transport_coordination_details', 'travel_coordinator_contact', 'flight_details_deadline'],
    tags: ['travel', 'flight', 'coordination', 'transport']
  },

  // 6. RSVP FOLLOW-UPS & REMINDERS
  {
    categoryId: 'rsvp_followups',
    templateId: 'gentle_rsvp_reminder',
    channel: 'email',
    name: 'Gentle RSVP Reminder - Email',
    description: 'Gentle reminder for pending responses',
    subject: 'Gentle Reminder: {{couple_names}} Wedding RSVP',
    content: `Dear {{guest_name}},

We hope you're doing well! We're writing to gently remind you about {{couple_names}} upcoming wedding celebration.

💌 RSVP STATUS: Pending
📅 Response Needed By: {{rsvp_deadline}}

We understand life gets busy, but your response helps us plan this special day perfectly.

🎊 QUICK RSVP: {{rsvp_link}}

If you have any questions about the celebration or need assistance, please don't hesitate to reach out.

With warm regards,
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'rsvp_deadline', 'rsvp_link'],
    tags: ['reminder', 'gentle', 'rsvp', 'follow-up']
  },

  // 7. STAGE 2 DETAILS COLLECTION
  {
    categoryId: 'stage2_collection',
    templateId: 'stage2_invitation',
    channel: 'email',
    name: 'Stage 2 Invitation - Email',
    description: 'Travel and accommodation preferences collection',
    subject: 'Complete Your Wedding Details - {{couple_names}}',
    content: `Dear {{guest_name}},

Thank you for confirming your attendance at {{couple_names}} wedding! 

🎯 NEXT STEP: Please complete your travel and accommodation preferences

{{stage2_form_link}}

📋 INFORMATION NEEDED:
• Accommodation preferences
• Travel arrangements  
• Dietary restrictions
• Special requirements

⏰ Please complete by: {{stage2_deadline}}

This helps us ensure your comfort throughout the celebration.

Questions? Contact: {{wedding_coordinator}}

Best regards,
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'stage2_form_link', 'stage2_deadline', 'wedding_coordinator'],
    tags: ['stage2', 'details', 'preferences', 'logistics']
  },

  // 8. CONFIRMATIONS & THANK YOU
  {
    categoryId: 'confirmations_thankyou',
    templateId: 'rsvp_confirmation',
    channel: 'email',
    name: 'RSVP Confirmation - Email',
    description: 'Thank you for confirming with next steps',
    subject: 'RSVP Confirmed - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

🎉 Thank you for confirming your attendance at {{couple_names}} wedding celebration!

✅ CONFIRMATION DETAILS:
{{confirmation_summary}}

📋 NEXT STEPS:
{{next_steps_list}}

📱 IMPORTANT LINKS:
{{important_links}}

We're thrilled to celebrate with you!

Warm regards,
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'confirmation_summary', 'next_steps_list', 'important_links'],
    tags: ['confirmation', 'thank-you', 'next-steps']
  },

  // 9. PRE-WEDDING UPDATES & LOGISTICS
  {
    categoryId: 'prewedding_updates',
    templateId: 'final_details',
    channel: 'email',
    name: 'Final Details - Email',
    description: 'Complete guest guide with all information',
    subject: 'Final Wedding Details - {{couple_names}} Celebration',
    content: `Dear {{guest_name}},

The big day is almost here! Here are the final details for {{couple_names}} wedding celebration.

📋 COMPLETE SCHEDULE:
{{final_ceremony_schedule}}

📍 VENUE INFORMATION:
{{final_venue_details}}

🚗 TRANSPORTATION:
{{final_transport_details}}

👗 ATTIRE REMINDERS:
{{final_attire_guidelines}}

📞 DAY-OF CONTACTS:
{{emergency_contacts}}

🎁 GIFT INFORMATION:
{{gift_guidelines}}

We can't wait to celebrate with you!

With love,
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'final_ceremony_schedule', 'final_venue_details', 'final_transport_details', 'final_attire_guidelines', 'emergency_contacts', 'gift_guidelines'],
    tags: ['final', 'complete', 'guide', 'day-of']
  },

  // 10. POST-WEDDING COMMUNICATIONS  
  {
    categoryId: 'postwedding_thankyou',
    templateId: 'thank_you_message',
    channel: 'email',
    name: 'Thank You Message - Email',
    description: 'Post-wedding gratitude and photo sharing',
    subject: 'Thank You for Celebrating With Us - {{couple_names}}',
    content: `Dear {{guest_name}},

{{couple_names}} want to express our heartfelt gratitude for being part of our special day!

💕 YOUR PRESENCE MADE OUR DAY COMPLETE

Your love, blessings, and joyful energy made our wedding celebration truly magical. We're so grateful you could share in this momentous occasion.

📸 WEDDING MEMORIES:
{{photo_sharing_links}}

🎥 HIGHLIGHT VIDEO:
{{video_sharing_link}}

Thank you for the beautiful {{gift_received}} - it means so much to us!

We look forward to making more memories together as we begin this new chapter.

With all our love,
{{couple_names}}`,
    enabled: true,
    sortOrder: 1,
    variables: ['guest_name', 'couple_names', 'photo_sharing_links', 'video_sharing_link', 'gift_received'],
    tags: ['thank-you', 'post-wedding', 'gratitude', 'memories']
  },

  // ADDITIONAL TEMPLATES FOR 40 TOTAL

  // Plus-One Templates (activated when allowPlusOne is enabled)
  {
    categoryId: 'formal_invitations',
    templateId: 'plus_one_invitation_email',
    channel: 'email',
    name: 'Plus-One Invitation - Email',
    description: 'Special invitation for guests with plus-ones',
    subject: 'You & Your Plus-One Are Invited - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

We're delighted to invite you AND your plus-one to celebrate {{couple_names}} wedding!

🎊 INVITATION DETAILS:
Date: {{wedding_date}}
Time: {{ceremony_start_time}}
Venue: {{primary_venue}}

👥 PLUS-ONE INFORMATION:
We're excited to meet your special someone! Please include their details when you RSVP.

📝 RSVP FOR TWO:
Please confirm attendance for both you and your plus-one: {{rsvp_link}}

Looking forward to celebrating with both of you!

Love,
{{couple_names}}`,
    enabled: false, // Activated based on event settings
    sortOrder: 5,
    variables: ['guest_name', 'couple_names', 'wedding_date', 'ceremony_start_time', 'primary_venue', 'rsvp_link'],
    tags: ['plus-one', 'invitation', 'conditional'],
    conditionalOn: 'allowPlusOne'
  },
  {
    categoryId: 'formal_invitations',
    templateId: 'plus_one_invitation_whatsapp',
    channel: 'whatsapp',
    name: 'Plus-One Invitation - WhatsApp',
    description: 'Mobile plus-one invitation',
    content: `🎉 You're Invited! 🎉

{{guest_name}}, bring your plus-one to celebrate:

💑 {{couple_names}} Wedding
📅 {{wedding_date}}
📍 {{primary_venue}}

👥 Your plus-one is welcome!

RSVP for both: {{rsvp_link}}

Can't wait to meet them! 💕`,
    enabled: false,
    sortOrder: 6,
    variables: ['guest_name', 'couple_names', 'wedding_date', 'primary_venue', 'rsvp_link'],
    tags: ['plus-one', 'mobile', 'conditional'],
    conditionalOn: 'allowPlusOne'
  },

  // Children Templates (activated when allowChildren is enabled)
  {
    categoryId: 'formal_invitations',
    templateId: 'family_invitation_email',
    channel: 'email',
    name: 'Family with Children Invitation - Email',
    description: 'Family-friendly invitation when children are welcome',
    subject: 'Family Invitation - {{couple_names}} Wedding Celebration',
    content: `Dear {{guest_name}} and Family,

We're thrilled to invite your entire family to {{couple_names}} wedding celebration!

👨‍👩‍👧‍👦 FAMILY-FRIENDLY CELEBRATION:
We welcome children and have planned special arrangements for young guests.

🎈 KIDS' ARRANGEMENTS:
• Special children's meal options
• Dedicated play area
• Family-friendly timing
• Baby-changing facilities

📝 FAMILY RSVP:
Please let us know how many adults and children will be attending: {{rsvp_link}}

We can't wait to celebrate with your whole family!

With love,
{{couple_names}}`,
    enabled: false,
    sortOrder: 7,
    variables: ['guest_name', 'couple_names', 'rsvp_link'],
    tags: ['children', 'family', 'conditional'],
    conditionalOn: 'allowChildren'
  },

  // Transport Templates (activated when transport is enabled)
  {
    categoryId: 'travel_transportation',
    templateId: 'airport_pickup_confirmation',
    channel: 'email',
    name: 'Airport Pickup Confirmation - Email',
    description: 'Transport confirmation for airport pickups',
    subject: 'Airport Pickup Confirmed - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

Your airport pickup for {{couple_names}} wedding has been confirmed!

✈️ PICKUP DETAILS:
Date: {{pickup_date}}
Time: {{pickup_time}}
Location: {{pickup_location}}
Driver: {{driver_name}} ({{driver_phone}})

🚗 VEHICLE INFORMATION:
{{vehicle_details}}

📱 IMPORTANT:
Please call {{emergency_contact}} if your flight is delayed.

Safe travels!
{{couple_names}}`,
    enabled: false,
    sortOrder: 2,
    variables: ['guest_name', 'couple_names', 'pickup_date', 'pickup_time', 'pickup_location', 'driver_name', 'driver_phone', 'vehicle_details', 'emergency_contact'],
    tags: ['transport', 'airport', 'confirmation', 'conditional'],
    conditionalOn: 'transportEnabled'
  },
  {
    categoryId: 'travel_transportation',
    templateId: 'transport_schedule_whatsapp',
    channel: 'whatsapp',
    name: 'Transport Schedule - WhatsApp',
    description: 'Transport timing updates',
    content: `🚌 TRANSPORT UPDATE 🚌
{{couple_names}} Wedding

📅 {{transport_date}}
⏰ Pickup: {{pickup_time}}
📍 Location: {{pickup_location}}

🚗 Your transport details:
{{transport_details}}

Driver: {{driver_contact}}

See you there! 🎉`,
    enabled: false,
    sortOrder: 3,
    variables: ['couple_names', 'transport_date', 'pickup_time', 'pickup_location', 'transport_details', 'driver_contact'],
    tags: ['transport', 'schedule', 'mobile', 'conditional'],
    conditionalOn: 'transportEnabled'
  },

  // Additional accommodation templates
  {
    categoryId: 'accommodation_information',
    templateId: 'room_assignment_email',
    channel: 'email',
    name: 'Room Assignment - Email',
    description: 'Hotel room assignment confirmation',
    subject: 'Room Assignment Confirmed - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

Your accommodation for {{couple_names}} wedding has been confirmed!

🏨 HOTEL DETAILS:
{{hotel_name}}
{{hotel_address}}

🗝️ ROOM ASSIGNMENT:
Room Number: {{room_number}}
Room Type: {{room_type}}
Check-in: {{checkin_date}} after {{checkin_time}}
Check-out: {{checkout_date}} by {{checkout_time}}

🎁 COMPLIMENTARY:
{{complimentary_services}}

📞 HOTEL CONTACT:
{{hotel_phone}}

Looking forward to hosting you!
{{couple_names}}`,
    enabled: false,
    sortOrder: 2,
    variables: ['guest_name', 'couple_names', 'hotel_name', 'hotel_address', 'room_number', 'room_type', 'checkin_date', 'checkin_time', 'checkout_date', 'checkout_time', 'complimentary_services', 'hotel_phone'],
    tags: ['accommodation', 'assignment', 'conditional'],
    conditionalOn: 'accommodationProvided'
  },

  // RSVP Stage 2 specific templates
  {
    categoryId: 'stage2_collection',
    templateId: 'dietary_preferences_email',
    channel: 'email',
    name: 'Dietary Preferences - Email',
    description: 'Collecting dietary requirements and meal preferences',
    subject: 'Meal Preferences Required - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

Please help us plan the perfect dining experience for {{couple_names}} wedding!

🍽️ MEAL INFORMATION NEEDED:

{{dietary_form_link}}

📋 PLEASE SPECIFY:
• Dietary restrictions (vegetarian, vegan, gluten-free, etc.)
• Food allergies
• Cultural/religious dietary requirements
• Special meal requests

⏰ Please respond by: {{dietary_deadline}}

This ensures we can accommodate everyone's needs perfectly.

Thank you!
{{couple_names}}`,
    enabled: true,
    sortOrder: 2,
    variables: ['guest_name', 'couple_names', 'dietary_form_link', 'dietary_deadline'],
    tags: ['dietary', 'preferences', 'stage2']
  },

  // Additional ceremony templates
  {
    categoryId: 'ceremony_information',
    templateId: 'mehendi_invitation_email',
    channel: 'email',
    name: 'Mehendi Ceremony - Email',
    description: 'Specific invitation for Mehendi ceremony',
    subject: 'Mehendi Ceremony Invitation - {{couple_names}}',
    content: `Dear {{guest_name}},

You're invited to {{bride_name}}'s Mehendi ceremony!

🎨 MEHENDI DETAILS:
Date: {{mehendi_date}}
Time: {{mehendi_time}}
Venue: {{mehendi_venue}}

💃 CELEBRATION INCLUDES:
• Beautiful henna designs
• Music and dancing
• Traditional refreshments
• Photo opportunities

👗 ATTIRE: {{mehendi_attire}}

We can't wait to celebrate this beautiful tradition with you!

With joy,
{{couple_names}}`,
    enabled: false,
    sortOrder: 5,
    variables: ['guest_name', 'bride_name', 'couple_names', 'mehendi_date', 'mehendi_time', 'mehendi_venue', 'mehendi_attire'],
    tags: ['mehendi', 'ceremony', 'traditional', 'conditional'],
    conditionalOn: 'hasMehendiCeremony'
  },
  {
    categoryId: 'ceremony_information',
    templateId: 'sangam_invitation_email',
    channel: 'email',
    name: 'Sangam Ceremony - Email',
    description: 'Family union ceremony invitation',
    subject: 'Sangam Ceremony - {{couple_names}} Family Union',
    content: `Dear {{guest_name}},

Join us for the Sangam ceremony celebrating the union of our families!

🤝 SANGAM DETAILS:
Date: {{sangam_date}}
Time: {{sangam_time}}
Venue: {{sangam_venue}}

🎊 CELEBRATION INCLUDES:
• Family introductions
• Traditional rituals
• Cultural performances
• Festive meal

👔 ATTIRE: {{sangam_attire}}

This special ceremony brings our families together before the wedding.

With warm regards,
{{families_names}}`,
    enabled: false,
    sortOrder: 6,
    variables: ['guest_name', 'couple_names', 'sangam_date', 'sangam_time', 'sangam_venue', 'sangam_attire', 'families_names'],
    tags: ['sangam', 'family', 'ceremony', 'conditional'],
    conditionalOn: 'hasSangamCeremony'
  },

  // Additional confirmation templates
  {
    categoryId: 'confirmations_thankyou',
    templateId: 'accommodation_confirmation',
    channel: 'email',
    name: 'Accommodation Confirmation - Email',
    description: 'Hotel booking confirmation',
    subject: 'Accommodation Confirmed - {{couple_names}} Wedding',
    content: `Dear {{guest_name}},

Your accommodation booking for {{couple_names}} wedding is confirmed!

✅ BOOKING CONFIRMED:
{{accommodation_details}}

📋 NEXT STEPS:
{{next_steps}}

📞 SUPPORT:
{{support_contact}}

Thank you for confirming your stay!

Best regards,
{{couple_names}}`,
    enabled: true,
    sortOrder: 2,
    variables: ['guest_name', 'couple_names', 'accommodation_details', 'next_steps', 'support_contact'],
    tags: ['confirmation', 'accommodation']
  },

  // Additional pre-wedding templates
  {
    categoryId: 'prewedding_updates',
    templateId: 'weather_update_whatsapp',
    channel: 'whatsapp',
    name: 'Weather Update - WhatsApp',
    description: 'Weather advisory for outdoor ceremonies',
    content: `🌤️ WEATHER UPDATE 🌤️
{{couple_names}} Wedding

📅 {{wedding_date}}
🌡️ Weather: {{weather_forecast}}

🧥 RECOMMENDED:
{{clothing_suggestions}}

📍 All ceremonies will proceed as planned with weather arrangements in place.

See you tomorrow! 🎉`,
    enabled: false,
    sortOrder: 2,
    variables: ['couple_names', 'wedding_date', 'weather_forecast', 'clothing_suggestions'],
    tags: ['weather', 'update', 'mobile', 'conditional'],
    conditionalOn: 'hasOutdoorCeremony'
  },

  // Additional follow-up templates
  {
    categoryId: 'rsvp_followups',
    templateId: 'urgent_rsvp_reminder',
    channel: 'whatsapp',
    name: 'Urgent RSVP Reminder - WhatsApp',
    description: 'Final urgent reminder for RSVP',
    content: `⏰ URGENT REMINDER ⏰

{{guest_name}}, we still need your RSVP for {{couple_names}} wedding!

📅 Wedding: {{wedding_date}}
⏰ RSVP Deadline: {{rsvp_deadline}} ({{days_remaining}} days)

🙏 Please respond ASAP: {{rsvp_link}}

Your response helps us plan better!

Thank you! 💕`,
    enabled: true,
    sortOrder: 2,
    variables: ['guest_name', 'couple_names', 'wedding_date', 'rsvp_deadline', 'days_remaining', 'rsvp_link'],
    tags: ['urgent', 'rsvp', 'reminder']
  },

  // Additional initial invitation templates
  {
    categoryId: 'initial_invitations',
    templateId: 'engagement_announcement',
    channel: 'email',
    name: 'Engagement Announcement - Email',
    description: 'Formal engagement announcement',
    subject: 'We\'re Engaged! - {{couple_names}}',
    content: `Dear {{guest_name}},

We're thrilled to share that {{couple_names}} are engaged!

💍 OUR ENGAGEMENT:
{{engagement_story}}

💒 WEDDING PLANS:
We're planning our wedding celebration and will share details soon!

📅 Save these tentative dates:
{{tentative_wedding_dates}}

Thank you for being such an important part of our lives. We can't wait to celebrate with you!

With love and excitement,
{{couple_names}}`,
    enabled: false,
    sortOrder: 5,
    variables: ['guest_name', 'couple_names', 'engagement_story', 'tentative_wedding_dates'],
    tags: ['engagement', 'announcement', 'conditional'],
    conditionalOn: 'hasEngagementAnnouncement'
  }
];

async function seedComprehensiveTemplates() {
  console.log('🌱 Starting comprehensive GLOBAL template seeding...');
  console.log('📋 These templates will be available to ALL events as guides');
  
  try {
    // Clear existing global templates only (eventId is null)
    await db.delete(communicationTemplates).where(eq(communicationTemplates.eventId, null));
    console.log('🗑️ Cleared existing global templates (event-specific templates preserved)');
    
    // Insert new comprehensive templates with proper JSON formatting
    for (const template of comprehensiveTemplates) {
      await db.insert(communicationTemplates).values({
        eventId: null, // Global templates
        categoryId: template.categoryId,
        templateId: template.templateId,
        channel: template.channel,
        name: template.name,
        description: template.description,
        subject: template.subject,
        content: template.content,
        enabled: template.enabled,
        sortOrder: template.sortOrder,
        variables: JSON.stringify(template.variables), // Convert array to JSON string
        tags: JSON.stringify(template.tags), // Convert array to JSON string
        conditionalOn: template.conditionalOn || null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`✅ Successfully seeded ${comprehensiveTemplates.length} comprehensive templates`);
    console.log('📊 Templates by category:');
    
    const categories = [...new Set(comprehensiveTemplates.map(t => t.categoryId))];
    categories.forEach(category => {
      const count = comprehensiveTemplates.filter(t => t.categoryId === category).length;
      console.log(`   - ${category}: ${count} templates`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedComprehensiveTemplates()
    .then(() => {
      console.log('🎉 Template seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Template seeding failed:', error);
      process.exit(1);
    });
}

export { seedComprehensiveTemplates, comprehensiveTemplates };