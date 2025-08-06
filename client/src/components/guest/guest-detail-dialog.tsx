import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import { formatDateForDisplay } from "@/lib/date-utils";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Utensils, 
  AlertTriangle,
  Car, 
  Bed, 
  Gift, 
  FileText, 
  Users, 
  UserPlus,
  Home,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface GuestDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  guest: any;
  onEdit: (guestId: number) => void;
}

export default function GuestDetailDialog({
  isOpen,
  onClose,
  guest,
  onEdit,
}: GuestDetailDialogProps) {
  if (!guest) return null;
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Confirmed</Badge>;
      case "declined":
        return <Badge className="bg-red-100 text-red-800 border-red-300">Declined</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
    }
  };
  
  const getTravelModeIcon = (mode: string) => {
    switch (mode) {
      case "air":
        return <span className="text-blue-500">✈️</span>;
      case "train":
        return <span className="text-green-500">🚄</span>;
      case "road":
        return <span className="text-amber-500">🚗</span>;
      default:
        return <Car className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Guest Details {getStatusBadge(guest.rsvpStatus)}
          </DialogTitle>
          <DialogDescription>
            View and manage guest information
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 py-4">
          <Avatar className="h-16 w-16 text-lg bg-gradient-to-br from-purple-700 to-purple-900">
            <AvatarFallback>{getInitials(`${guest.firstName} ${guest.lastName}`)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold font-playfair">
              {guest.salutation ? `${guest.salutation} ` : ""}{guest.firstName} {guest.lastName}
            </h2>
            <p className="text-muted-foreground">
              {guest.relationship || (guest.isFamily ? "Family Member" : "Guest")}
              {guest.gender && ` • ${guest.gender.charAt(0).toUpperCase() + guest.gender.slice(1)}`}
            </p>
          </div>
        </div>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="basic">Info</TabsTrigger>
            <TabsTrigger value="relationship">Relation</TabsTrigger>
            <TabsTrigger value="rsvp">RSVP</TabsTrigger>
            <TabsTrigger value="companions">Companions</TabsTrigger>
            <TabsTrigger value="travel">Travel</TabsTrigger>
            <TabsTrigger value="stay">Stay</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="space-y-2">
              {guest.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{guest.email}</span>
                </div>
              )}
              
              {guest.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {guest.countryCode ? `${guest.countryCode} ` : ""}{guest.phone}
                    {guest.whatsappAvailable && (
                      <Badge variant="outline" className="ml-2 bg-green-50">WhatsApp</Badge>
                    )}
                  </span>
                </div>
              )}
              
              {guest.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <span>{guest.address}</span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Guest Association</p>
                <p className="capitalize">{guest.side === 'bride' ? "Bride's Guest" : "Groom's Guest"}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Created Date</p>
                <p>{formatDateForDisplay(guest.createdAt)}</p>
              </div>
            </div>
            
            {(guest.dietaryRestrictions || guest.allergies) && (
              <>
                <Separator />
                {guest.dietaryRestrictions && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center">
                      <Utensils className="h-4 w-4 mr-1" /> Dietary Restrictions
                    </p>
                    <p className="text-sm">{guest.dietaryRestrictions}</p>
                  </div>
                )}
                {guest.allergies && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground mb-1 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" /> Allergies
                    </p>
                    <p className="text-sm">{guest.allergies}</p>
                  </div>
                )}
              </>
            )}
            
            {guest.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    <FileText className="h-4 w-4 mr-1" /> Notes
                  </p>
                  <p className="text-sm">{guest.notes}</p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="relationship" className="space-y-6 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Guest Association</p>
                <Badge variant="outline" className="capitalize">
                  {guest.side === 'bride' ? "Bride's Guest" : "Groom's Guest"}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Family Member</p>
                <Badge variant={guest.isFamily ? "default" : "outline"}>
                  {guest.isFamily ? "Yes" : "No"}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="capitalize">{guest.gender || "Not specified"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Salutation</p>
                <p>{guest.salutation || "Not specified"}</p>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Relationship</p>
                <p>{guest.relationship || "Not specified"}</p>
              </div>

              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">WhatsApp Available</p>
                <Badge variant={guest.whatsappAvailable ? "default" : "outline"}>
                  {guest.whatsappAvailable ? "Yes" : "No"}
                </Badge>
                {guest.whatsappAvailable && !guest.whatsappSame && guest.whatsappNumber && (
                  <p className="mt-1 text-sm">
                    WhatsApp Number: {guest.whatsappCountryCode || ""} {guest.whatsappNumber}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="rsvp" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">RSVP Status</p>
                <p className="capitalize">{guest.rsvpStatus}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Table Assignment</p>
                <p>{guest.tableAssignment || "Not assigned"}</p>
              </div>
              
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">RSVP Contact</p>
                {guest.plusOneRsvpContact && guest.plusOneName ? (
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2 bg-purple-50 border-purple-200">Plus One</Badge>
                    <span>{guest.plusOneName}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Badge variant="outline" className="mr-2 bg-blue-50 border-blue-200">Primary Guest</Badge>
                    <span>{guest.firstName} {guest.lastName}</span>
                  </div>
                )}
              </div>
            </div>
            
            {guest.dietaryRestrictions && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    <Utensils className="h-4 w-4 mr-1" /> Dietary Restrictions
                  </p>
                  <p className="text-sm">{guest.dietaryRestrictions}</p>
                </div>
              </>
            )}
            
            {guest.giftTracking && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1 flex items-center">
                    <Gift className="h-4 w-4 mr-1" /> Gift Tracking
                  </p>
                  <p className="text-sm">{guest.giftTracking}</p>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="companions" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium flex items-center mb-2">
                  <UserPlus className="h-4 w-4 mr-2" /> Plus One Information
                </h3>
                
                {guest.plusOneAllowed ? (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p>{guest.plusOneName || "Not specified"}</p>
                        </div>
                        
                        {guest.plusOneGender && (
                          <div>
                            <p className="text-sm text-muted-foreground">Gender</p>
                            <p className="capitalize">{guest.plusOneGender}</p>
                          </div>
                        )}
                        
                        {guest.plusOneSalutation && (
                          <div>
                            <p className="text-sm text-muted-foreground">Salutation</p>
                            <p>{guest.plusOneSalutation}</p>
                          </div>
                        )}
                        
                        {guest.plusOneEmail && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p>{guest.plusOneEmail}</p>
                          </div>
                        )}
                        
                        {guest.plusOnePhone && (
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p>{guest.plusOneCountryCode || ""} {guest.plusOnePhone}</p>
                          </div>
                        )}
                        
                        {guest.plusOneRelationship && (
                          <div>
                            <p className="text-sm text-muted-foreground">Relationship to Main Guest</p>
                            <p>{guest.plusOneRelationship}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-sm text-muted-foreground">Primary RSVP Contact</p>
                          <Badge variant={guest.plusOneRsvpContact ? "default" : "outline"}>
                            {guest.plusOneRsvpContact ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <p className="text-sm text-muted-foreground">No plus one allowed</p>
                )}
              </div>
              
              <div>
                <h3 className="text-md font-medium flex items-center mb-2">
                  <Users className="h-4 w-4 mr-2" /> Children Information
                </h3>
                
                {guest.childrenDetails && guest.childrenDetails.length > 0 ? (
                  <div className="space-y-4">
                    {guest.childrenDetails.map((child: any, index: number) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <h4 className="font-medium mb-2">Child {index + 1}</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Name</p>
                              <p>{child.name || "Not specified"}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm text-muted-foreground">Age</p>
                              <p>{child.age !== undefined ? child.age : "Not specified"}</p>
                            </div>
                            
                            {child.gender && (
                              <div>
                                <p className="text-sm text-muted-foreground">Gender</p>
                                <p className="capitalize">{child.gender}</p>
                              </div>
                            )}
                            
                            {child.salutation && (
                              <div>
                                <p className="text-sm text-muted-foreground">Salutation</p>
                                <p>{child.salutation}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {guest.childrenNotes && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground mb-1">Special Notes for Children</p>
                        <p className="text-sm">{guest.childrenNotes}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No children accompanying</p>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="travel" className="space-y-4 pt-4">
            {guest.travel ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Travel Mode</p>
                    <p className="capitalize flex items-center gap-2">
                      {getTravelModeIcon(guest.travel.travelMode)}
                      {guest.travel.travelMode || "Not specified"}
                    </p>
                  </div>

                  {guest.travel.flightNumber && (
                    <div>
                      <p className="text-sm text-muted-foreground">Flight Number</p>
                      <p>{guest.travel.flightNumber}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Arrival</p>
                    <div>
                      <p>{guest.travel.arrivalDate ? formatDateForDisplay(guest.travel.arrivalDate) : "Not specified"}</p>
                      <p className="text-sm text-muted-foreground">
                        {guest.travel.arrivalTime} {guest.travel.arrivalLocation ? `at ${guest.travel.arrivalLocation}` : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Departure</p>
                    <div>
                      <p>{guest.travel.departureDate ? formatDateForDisplay(guest.travel.departureDate) : "Not specified"}</p>
                      <p className="text-sm text-muted-foreground">
                        {guest.travel.departureTime} {guest.travel.departureLocation ? `at ${guest.travel.departureLocation}` : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Needs Transportation</p>
                    <Badge variant={guest.travel.needsTransportation ? "default" : "outline"}>
                      {guest.travel.needsTransportation ? "Yes" : "No"}
                    </Badge>
                  </div>

                  {guest.travel.needsTransportation && guest.travel.transportationType && (
                    <div>
                      <p className="text-sm text-muted-foreground">Transportation Type</p>
                      <p className="capitalize">{guest.travel.transportationType}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Car className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No travel information available</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="stay" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-md font-medium flex items-center mb-2">
                  <Home className="h-4 w-4 mr-2" /> Accommodation Needed
                </h3>
                <Badge variant={guest.needsAccommodation ? "default" : "outline"}>
                  {guest.needsAccommodation ? "Yes" : "No"}
                </Badge>
              </div>
            
              {guest.accommodation ? (
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Hotel</p>
                        <p>{guest.accommodation.name}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Room Type</p>
                        <p>{guest.accommodation.roomType}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Room Number</p>
                        <p>{guest.accommodation.roomNumber || "Not assigned"}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Check-in/Check-out</p>
                        <p>
                          {guest.accommodation.checkIn ? formatDateForDisplay(guest.accommodation.checkIn) : "TBD"} - {" "}
                          {guest.accommodation.checkOut ? formatDateForDisplay(guest.accommodation.checkOut) : "TBD"}
                        </p>
                      </div>
                    </div>
                    
                    {guest.accommodation.specialRequests && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Special Requests</p>
                        <p className="text-sm">{guest.accommodation.specialRequests}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Bed className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No accommodation information available</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button 
            onClick={() => onEdit(guest.id)}
            className="bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-800 hover:to-purple-950"
          >
            Edit Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}