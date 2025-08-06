import React, { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AppleFormCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  variant?: "default" | "elegant" | "minimal";
}

export default function AppleFormCard({ 
  title, 
  subtitle, 
  icon, 
  children, 
  className,
  variant = "default"
}: AppleFormCardProps) {
  
  const cardVariants = {
    default: "bg-card/60 backdrop-blur-xl border-border/50 shadow-lg hover:shadow-xl transition-all duration-300",
    elegant: "bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl border-border/30 shadow-2xl hover:shadow-3xl transition-all duration-500",
    minimal: "bg-card/40 backdrop-blur-md border-border/20 shadow-sm hover:shadow-md transition-all duration-200"
  };

  return (
    <Card className={cn(
      cardVariants[variant],
      "overflow-hidden group",
      className
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          {icon && (
            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-lg font-playfair font-semibold text-primary group-hover:text-primary/90 transition-colors duration-300">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-inter">
                {subtitle}
              </p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  );
}