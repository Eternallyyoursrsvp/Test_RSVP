import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import RsvpStatusDisplay from "./rsvp-status-display";
import { Loader2, Copy, Send, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { post } from "@/lib/api-utils";
import { queryKeys } from "@/lib/query-keys";
import { useCurrentEvent } from "@/hooks/use-current-event";

interface RsvpLinkGeneratorProps {
  guests: any[];
  onSuccess?: () => void;
}

export default function RsvpLinkGenerator({ guests, onSuccess }: RsvpLinkGeneratorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEventId } = useCurrentEvent();
  const eventId = currentEventId;

  const [selectedGuests, setSelectedGuests] = useState<number[]>([]);
  // Important: The base URL should be the domain only, without the /guest-rsvp path
  // This is because the backend will append /guest-rsvp/ to this when generating the links
  const [baseUrl, setBaseUrl] = useState(window.location.origin);
  const [selectedChannel, setSelectedChannel] = useState<string>("email");
  const [isGenerating, setIsGenerating] = useState(false);
  const [guestLinks, setGuestLinks] = useState<any[]>([]);

  // Select/deselect all guests
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGuests(guests.map(guest => guest.id));
    } else {
      setSelectedGuests([]);
    }
  };

  // Toggle individual guest selection
  const handleGuestToggle = (guestId: number, checked: boolean) => {
    if (checked) {
      setSelectedGuests(prev => [...prev, guestId]);
    } else {
      setSelectedGuests(prev => prev.filter(id => id !== guestId));
    }
  };

  // Function to copy link to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Link Copied",
          description: "RSVP link copied to clipboard",
        });
      },
      (err) => {
        // Could not copy text - handled silently
        toast({
          variant: "destructive",
          title: "Failed to Copy",
          description: "Could not copy the link to clipboard",
        });
      }
    );
  };

  // Mutation to generate RSVP links
  const generateLinksMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("No event selected");
      
      setIsGenerating(true);
      
      try {
        const response = await post("/api/admin/rsvp/generate-links", {
          eventId,
          baseUrl,
        });
        
        return response.data;
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (data) => {
      setGuestLinks(data.guests);
      toast({
        title: "Links Generated",
        description: `Successfully generated RSVP links for ${data.guests.length} guests`,
      });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Generate Links",
        description: error.message,
      });
    },
  });

  // Mutation to send RSVP invitations
  const sendInvitesMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("No event selected");
      if (selectedGuests.length === 0) throw new Error("No guests selected");
      
      const response = await post("/api/admin/rsvp/send-invites", {
        eventId,
        guestIds: selectedGuests,
        baseUrl,
        channel: selectedChannel,
      });
      
      return response.data;
    },
    onSuccess: (data) => {
      const successCount = data.results.filter((r: any) => r.success).length;
      
      toast({
        title: "Invitations Sent",
        description: `Successfully sent ${successCount} invitations out of ${data.results.length} selected guests`,
      });
      
      // Invalidate guests query to refresh status
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all(eventId || 0) });
      
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Send Invitations",
        description: error.message,
      });
    },
  });

  // We've removed the getGuestStageStatus function and now use the RsvpStatusDisplay component
  // for consistent RSVP status display across the application

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate RSVP Links</CardTitle>
          <CardDescription>
            Create personalized links for guests to RSVP using the two-stage process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="baseUrl">Base URL for RSVP Form</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                This will be combined with a unique token for each guest
              </p>
            </div>
            
            <div>
              <Label htmlFor="channel">Invitation Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger id="channel" className="mt-1">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="both">Both Email & WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how you want to send RSVP invitations to guests
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => generateLinksMutation.mutate()}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Generate Links
              </>
            )}
          </Button>
          
          <Button
            onClick={() => sendInvitesMutation.mutate()}
            disabled={sendInvitesMutation.isPending || selectedGuests.length === 0}
            className="gold-gradient"
          >
            {sendInvitesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" /> Send Invitations
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Guest Selection</CardTitle>
          <CardDescription>
            Select guests to send RSVP invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border mb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedGuests.length === guests.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>RSVP Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guests.map(guest => (
                  <TableRow key={guest.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedGuests.includes(guest.id)}
                        onCheckedChange={(checked) => handleGuestToggle(guest.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      {guest.firstName} {guest.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs">
                        {guest.email && <span>{guest.email}</span>}
                        {guest.phone && <span>{guest.phone}</span>}
                        {!guest.email && !guest.phone && <span className="text-muted-foreground">No contact info</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <RsvpStatusDisplay guest={guest} showDetails={false} />
                    </TableCell>
                    <TableCell>
                      {guestLinks.length > 0 && (
                        <div className="flex space-x-2">
                          {guestLinks.find((g: any) => g.id === guest.id)?.rsvpLink && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(guestLinks.find((g: any) => g.id === guest.id)?.rsvpLink)}
                            >
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Copy Link
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              sendInvitesMutation.mutate();
                            }}
                            disabled={sendInvitesMutation.isPending || !selectedGuests.includes(guest.id)}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Send
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}