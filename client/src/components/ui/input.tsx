import * as React from "react"
import { cn } from "@/lib/utils"
import { aria, useAccessibilityErrorHandler } from "@/utils/accessibility"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  helperText?: string
  label?: string
  isInvalid?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, helperText, label, isInvalid, id, ...props }, ref) => {
    const handleAccessibilityError = useAccessibilityErrorHandler()
    const inputId = id || aria.generateId('input')
    const errorId = error ? aria.generateId('error') : undefined
    const helperTextId = helperText ? aria.generateId('helper') : undefined
    
    // Build aria-describedby relationship
    const describedBy = React.useMemo(() => {
      const ids = []
      if (errorId) ids.push(errorId)
      if (helperTextId) ids.push(helperTextId)
      return ids.length > 0 ? ids.join(' ') : undefined
    }, [errorId, helperTextId])

    // Handle accessibility validation
    React.useEffect(() => {
      if (error && !isInvalid) {
        handleAccessibilityError(
          'Input has error message but isInvalid prop not set',
          ref?.current || undefined
        )
      }
    }, [error, isInvalid, handleAccessibilityError, ref])

    return (
      <div className="relative">
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            // Enhanced accessibility styles
            "transition-colors duration-200",
            isInvalid && "border-destructive focus-visible:ring-destructive aria-invalid:border-destructive",
            className
          )}
          ref={ref}
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          {...props}
        />
        
        {/* Error message with proper ARIA structure */}
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="mt-1 text-sm text-destructive"
          >
            {error}
          </div>
        )}
        
        {/* Helper text with proper ARIA structure */}
        {helperText && !error && (
          <div
            id={helperTextId}
            className="mt-1 text-sm text-muted-foreground"
          >
            {helperText}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
