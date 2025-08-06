import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface Step {
  id: string;
  label: string;
  isCompleted: boolean;
  isActive: boolean;
}

interface StepsProps {
  steps: Step[];
  onStepClick: (stepId: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Steps({
  steps,
  onStepClick,
  orientation = "horizontal",
  className
}: StepsProps) {
  const isVertical = orientation === "vertical";
  
  return (
    <div 
      className={cn(
        "flex gap-2",
        isVertical ? "flex-col" : "flex-row overflow-x-auto pb-2",
        className
      )}
    >
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* Step */}
          <div className={cn(
            "flex",
            isVertical ? "items-start" : "flex-col items-center",
            "gap-2"
          )}>
            <button
              onClick={() => onStepClick(step.id)}
              className={cn(
                "flex items-center gap-3 group transition-all",
                isVertical && "flex-1",
                step.isActive && "font-medium"
              )}
            >
              {/* Step circle */}
              <div className={cn(
                "h-8 w-8 min-w-8 rounded-full flex items-center justify-center border-2 transition-all",
                step.isCompleted 
                  ? "bg-primary border-primary text-white" 
                  : step.isActive 
                    ? "border-primary text-primary" 
                    : "border-muted-foreground/20 text-muted-foreground",
                "group-hover:border-primary/70"
              )}>
                {step.isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="text-sm">{index + 1}</span>
                )}
              </div>
              
              {/* Step label */}
              <span className={cn(
                "text-sm transition-colors",
                isVertical ? "text-left" : "mt-1 text-center",
                step.isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground",
                "group-hover:text-primary/70"
              )}>
                {step.label}
              </span>
            </button>
          </div>
          
          {/* Connector (not for the last step) */}
          {index < steps.length - 1 && (
            <div className={cn(
              "bg-border/30",
              isVertical 
                ? "w-0.5 ml-4 my-1 h-4" 
                : "h-0.5 mt-4 flex-1"
            )}></div>
          )}
        </div>
      ))}
    </div>
  );
}