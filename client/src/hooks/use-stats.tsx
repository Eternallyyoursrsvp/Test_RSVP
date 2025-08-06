import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get } from "@/lib/api-utils";
import { format, subDays, subMonths } from "date-fns";

export interface EventStats {
  total: number;
  confirmed: number;
  declined: number;
  pending: number;
  plusOnes: number;
  children: number;
  rsvpRate: number;
}

export interface ChartData {
  date: string;
  value: number;
}

export function useEventStats(eventId: number) {
  // Get event statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery<EventStats>({
    queryKey: [`/api/events/${eventId}/statistics`],
    enabled: !!eventId,
  });

  // Generate RSVP progress data (simulated over time)
  const generateRsvpProgressData = (period: "weekly" | "monthly" = "monthly"): ChartData[] => {
    if (!stats) return [];

    const today = new Date();
    const dataPoints = period === "weekly" ? 7 : 30;
    const result: ChartData[] = [];

    // Rate of change (simplified model)
    const finalRate = stats.rsvpRate;
    const initialRate = Math.max(0, finalRate - (finalRate * 0.8)); // Start at 20% of final rate
    const rateIncrement = (finalRate - initialRate) / dataPoints;

    for (let i = 0; i < dataPoints; i++) {
      const date = period === "weekly" 
        ? format(subDays(today, dataPoints - 1 - i), "MMM dd")
        : format(subDays(today, (dataPoints - 1 - i)), "MMM dd");
      
      // Calculate a progressive increase in RSVP rate
      const value = Math.round(initialRate + (rateIncrement * i));
      
      result.push({
        date,
        value,
      });
    }

    return result;
  };

  return {
    stats,
    isLoadingStats,
    generateRsvpProgressData,
  };
}
