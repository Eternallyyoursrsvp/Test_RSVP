// Wizard step IDs
export const WIZARD_STEPS = {
  BASIC_INFO: "basic_info",
  VENUES: "venues",
  RSVP_CONFIG: "rsvp_config",
  HOTELS: "hotels",
  TRANSPORT: "transport",
  COMMUNICATION: "communication",
  AI_ASSISTANT: "ai_assistant",
};

// Ceremony types for Indian weddings
export const CEREMONY_TYPES = [
  "Main Wedding Ceremony",
  "Sangeet",
  "Mehndi",
  "Haldi",
  "Engagement",
  "Reception",
  "Baraat",
  "Vidaai",
  "Puja",
  "Cocktail Party",
  "Grihapravesh",
  "Tilak",
  "Welcome Dinner",
  "Farewell Brunch",
  "Other"
];

// Attire codes for venues
export const ATTIRE_CODES = [
  "Indian Traditional",
  "Western Formal",
  "Indian Fusion",
  "Black Tie",
  "Cocktail Attire",
  "Formal",
  "Semi-Formal",
  "Smart Casual",
  "Casual",
  "Theme Specific",
];

// Room types for hotels
export const ROOM_TYPES = [
  "Standard",
  "Deluxe",
  "Suite",
  "Executive",
  "Family",
  "Accessible",
  "Presidential",
  "Villa",
  "Cottage",
];

// Bed types for hotel rooms
export const BED_TYPES = [
  "King",
  "Queen",
  "Twin",
  "Double",
  "Single",
  "California King",
  "Sofa Bed",
  "Bunk Bed",
];

// Vehicle types for transport
export const VEHICLE_TYPES = [
  "Sedan",
  "SUV",
  "Minivan",
  "Luxury Car",
  "Bus",
  "Coach",
  "Limousine",
  "Classic Car",
  "Electric Vehicle",
];

// Communication channel types
export const COMMUNICATION_CHANNELS = [
  "Email",
  "WhatsApp",
  "SMS",
  "Phone Call",
  "Mobile App",
  "Web Portal",
];

// Email providers
export const EMAIL_PROVIDERS = [
  "SMTP",
  "Gmail",
  "Outlook",
  "SendGrid",
  "Mailchimp",
  "Custom",
];

// Font families for design
export const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Poppins",
  "Playfair Display",
  "Montserrat",
  "Raleway",
  "Lato",
  "Open Sans",
  "Merriweather",
  "Source Sans Pro",
  "Libre Baskerville",
  "Dancing Script",
  "Great Vibes",
];

// Color themes for design
export const COLOR_THEMES = [
  { name: "Classic Elegance", primary: "#8B0000", secondary: "#F5F5DC", accent: "#FFD700" },
  { name: "Royal Indian", primary: "#9C27B0", secondary: "#FFEB3B", accent: "#4CAF50" },
  { name: "Modern Minimalist", primary: "#212121", secondary: "#FFFFFF", accent: "#00BCD4" },
  { name: "Romantic Blush", primary: "#E91E63", secondary: "#F8BBD0", accent: "#9E9E9E" },
  { name: "Traditional Maroon", primary: "#800000", secondary: "#FFC107", accent: "#FFFFFF" },
  { name: "Garden Fresh", primary: "#4CAF50", secondary: "#F1F8E9", accent: "#FF5722" },
  { name: "Ocean Breeze", primary: "#03A9F4", secondary: "#E1F5FE", accent: "#FF9800" },
  { name: "Sunset Glow", primary: "#FF9800", secondary: "#FFF3E0", accent: "#3F51B5" },
];

// AI Model options for the assistant
export const AI_MODELS = [
  { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", provider: "Anthropic" },
  { id: "claude-3-5-sonnet-20240620", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google" },
];