import React from "react";
import { 
  ArrowUp, 
  ArrowDown, 
  UserCheck, 
  UserX, 
  Watch, 
  Users 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  change?: {
    value: number;
    text: string;
  } | null;
  icon: "confirmed" | "declined" | "pending" | "total";
  className?: string;
  onClick?: () => void;
}

export default function StatsCard({ title, value, change, icon, className, onClick }: StatsCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "confirmed":
        return <UserCheck className="text-lg" />;
      case "declined":
        return <UserX className="text-lg" />;
      case "pending":
        return <Watch className="text-lg" />;
      case "total":
        return <Users className="text-lg" />;
    }
  };

  const getIconClass = () => {
    switch (icon) {
      case "confirmed":
        return "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "declined":
        return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "pending":
        return "bg-accent/10 text-accent-foreground dark:bg-accent/20 dark:text-accent";
      case "total":
        return "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary";
    }
  };

  const getChangeColor = () => {
    if (!change) return "";
    return change.value > 0 ? "text-green-600" : 
           change.value < 0 ? "text-red-600" : "text-muted-foreground";
  };

  return (
    <div 
      className={cn(
        "glass rounded-lg p-6 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5", 
        onClick && "cursor-pointer", 
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className={cn("p-3 rounded-full", getIconClass())}>
          {getIcon()}
        </div>
        <div className="ml-5">
          <p className="text-muted-foreground text-sm font-medium tracking-wide">{title}</p>
          <h3 className="font-serif text-3xl font-semibold text-foreground">{value}</h3>
        </div>
      </div>

      {change && (
        <div className="mt-4">
          <div className="flex items-center">
            <span className={cn("text-sm font-medium flex items-center", getChangeColor())}>
              {change.value > 0 ? (
                <ArrowUp className="mr-1 h-4 w-4" />
              ) : change.value < 0 ? (
                <ArrowDown className="mr-1 h-4 w-4" />
              ) : null}
              {Math.abs(change.value)}%
            </span>
            <span className="text-muted-foreground text-sm ml-2">{change.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
