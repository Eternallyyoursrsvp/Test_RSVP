import React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateForDisplay } from "@/lib/date-utils";
import { 
  calculateStage1Progress, 
  calculateStage2Progress,
  calculateOverallRsvpProgress,
  getProgressColor,
  getRsvpStatusLabel
} from "@/lib/utils";

interface RsvpStatusDisplayProps {
  guest: any;
  showDetails?: boolean;
}

export default function RsvpStatusDisplay({ guest, showDetails = true }: RsvpStatusDisplayProps) {
  // Use consolidated utility functions to calculate progress
  const stage1Progress = calculateStage1Progress(guest);
  const stage2Progress = calculateStage2Progress(guest);
  const overallProgress = calculateOverallRsvpProgress(guest);
  const statusLabel = getRsvpStatusLabel(guest);
  
  // Get status badges based on status label
  const getStatusBadge = () => {
    switch(statusLabel) {
      case "Not Responded":
        return <Badge variant="outline" className="whitespace-nowrap">Not Responded</Badge>;
      case "Declined":
        return <Badge variant="destructive" className="whitespace-nowrap">Declined</Badge>;
      case "Fully Confirmed":
        return <Badge className="bg-green-500 text-white whitespace-nowrap">Fully Confirmed</Badge>;
      case "Partially Complete":
        return <Badge variant="default" className="whitespace-nowrap">Partially Complete</Badge>;
      case "Basic Confirmation":
        return <Badge variant="secondary" className="whitespace-nowrap">Basic Confirmation</Badge>;
      default:
        return <Badge variant="outline" className="whitespace-nowrap">{statusLabel}</Badge>;
    }
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusBadge()}
          {guest.rsvpDate && (
            <span className="text-xs text-muted-foreground">
              {formatDateForDisplay(guest.rsvpDate)}
            </span>
          )}
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1">
                <span className="text-xs font-medium">{overallProgress}%</span>
                <Progress value={overallProgress} className="w-16 h-2" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Overall RSVP completion: {overallProgress}%</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {showDetails && guest.rsvpStatus !== "pending" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs">Stage 1</span>
              <span className="text-xs font-medium">{stage1Progress}%</span>
            </div>
            <Progress value={stage1Progress} className={`h-1.5 ${getProgressColor(stage1Progress)}`} />
          </div>
          
          {guest.rsvpStatus === "confirmed" && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs">Stage 2</span>
                <span className="text-xs font-medium">{stage2Progress}%</span>
              </div>
              <Progress value={stage2Progress} className={`h-1.5 ${getProgressColor(stage2Progress)}`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}