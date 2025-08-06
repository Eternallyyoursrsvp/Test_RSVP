import React, { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api-utils";
import { queryKeys } from "@/lib/query-keys";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Heart, Users } from "lucide-react";

interface BrandedRsvpLayoutProps {
  eventId: number;
  children: ReactNode;
  eventData?: {
    title: string;
    coupleNames: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
    venues: Array<{
      name: string;
      address: string;
      type: string;
    }>;
  };
  ceremonies?: Array<{
    id: number;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
  }>;
}

export default function BrandedRsvpLayout({ 
  eventId, 
  children, 
  eventData, 
  ceremonies = [] 
}: BrandedRsvpLayoutProps) {
  // Fetch brand assets and event branding from communication step
  const { data: brandAssets } = useQuery({
    queryKey: queryKeys.communication.providers(eventId),
    queryFn: async () => {
      const response = await get(`/api/events/${eventId}/brand-assets`);
      return response.data;
    },
    enabled: !!eventId
  });

  const { data: eventSettings } = useQuery({
    queryKey: queryKeys.events.byId(eventId),
    queryFn: async () => {
      const response = await get(`/api/events/${eventId}`);
      return response.data;
    },
    enabled: !!eventId
  });

  // Generate dynamic styles based on brand assets
  const brandColors = brandAssets?.colorPalette || {
    primary: "#7A51E1",
    secondary: "#E3C76F",
    accent: "#F8FAFC"
  };

  const logoUrl = brandAssets?.logoUrl;
  const bannerUrl = brandAssets?.bannerUrl;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Brand Assets */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>
        
        {/* Wedding Illustration Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-10 left-10 w-16 h-16 text-primary/20">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          <div className="absolute top-20 right-20 w-12 h-12 text-accent/20">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/>
            </svg>
          </div>
          <div className="absolute bottom-20 left-20 w-14 h-14 text-primary/15">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
        </div>
        
        {/* Banner Image if available */}
        {bannerUrl && (
          <div className="absolute inset-0 opacity-10">
            <img 
              src={bannerUrl} 
              alt="Wedding Banner" 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            {/* Logo */}
            {logoUrl && (
              <div className="flex justify-center mb-6">
                <img 
                  src={logoUrl} 
                  alt={`${eventData?.coupleNames} Wedding Logo`}
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}

            {/* Wedding Title */}
            <div className="space-y-2">
              <h1 className="text-5xl md:text-6xl font-playfair font-bold text-primary">
                {eventData?.coupleNames || "Wedding Celebration"}
              </h1>
              <p className="text-xl text-muted-foreground">
                You're Invited to Our Special Day
              </p>
            </div>

            {/* Date & Location */}
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <Badge variant="outline" className="px-4 py-2 text-base bg-card/50 backdrop-blur-sm">
                <Calendar className="w-4 h-4 mr-2" />
                {eventData?.weddingDate ? new Date(eventData.weddingDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : ""}
              </Badge>
              {eventData?.venues?.[0] && (
                <Badge variant="outline" className="px-4 py-2 text-base bg-card/50 backdrop-blur-sm">
                  <MapPin className="w-4 h-4 mr-2" />
                  {eventData.venues[0].name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Ceremony Schedule */}
        {ceremonies.length > 0 && (
          <Card className="mb-8 bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-playfair font-semibold text-primary mb-2">
                  Celebration Schedule
                </h2>
                <p className="text-muted-foreground">Join us for these special moments</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ceremonies.map((ceremony, index) => (
                  <div key={ceremony.id} className="group relative">
                    <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                    <div className="pl-6 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-primary font-playfair">
                          {ceremony.name}
                        </h4>
                        <Heart className="w-4 h-4 text-accent" />
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(ceremony.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {ceremony.startTime} - {ceremony.endTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {ceremony.location}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{ceremony.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* RSVP Form Content */}
        <div className="space-y-8">
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            We can't wait to celebrate with you! ✨
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            If you have any questions, please contact us at{" "}
            <a href={`mailto:${eventSettings?.contactEmail || 'hello@wedding.com'}`} 
               className="text-primary hover:underline">
              {eventSettings?.contactEmail || 'hello@wedding.com'}
            </a>
          </p>
        </div>
      </div>

      {/* Custom CSS for brand colors */}
      <style>{`
        :root {
          --brand-primary: ${brandColors.primary};
          --brand-secondary: ${brandColors.secondary};
          --brand-accent: ${brandColors.accent};
        }
      `}</style>
    </div>
  );
}