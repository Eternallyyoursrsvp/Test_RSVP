import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { touchAccessibility, useReducedMotion } from "@/utils/accessibility"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg rounded-lg",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg rounded-lg focus:ring-destructive",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-lg",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-lg",
        link: "text-primary underline-offset-4 hover:underline focus:ring-offset-0",
        luxury: "bg-primary text-primary-foreground font-semibold shadow-lg hover:bg-primary/90 hover:shadow-xl rounded-lg",
      },
      size: {
        default: "h-11 px-6 py-2 min-h-[44px]",
        sm: "h-9 px-4 py-1 text-xs min-h-[36px]",
        lg: "h-13 px-8 py-3 text-base min-h-[52px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  "aria-describedby"?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false, 
    loadingText,
    disabled,
    children,
    onClick,
    ...props 
  }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const [isPressed, setIsPressed] = React.useState(false)
    
    // Ensure minimum touch target size
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    
    React.useEffect(() => {
      const button = buttonRef.current || (ref as React.RefObject<HTMLButtonElement>)?.current
      if (button && size !== 'lg') {
        touchAccessibility.ensureTouchTarget(button)
      }
    }, [size, ref])

    // Enhanced click handler with accessibility considerations
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        event.preventDefault()
        return
      }
      onClick?.(event)
    }, [loading, disabled, onClick])

    // Keyboard interaction handling
    const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        setIsPressed(true)
      }
      props.onKeyDown?.(event)
    }, [props])

    const handleKeyUp = React.useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === ' ' || event.key === 'Enter') {
        setIsPressed(false)
      }
      props.onKeyUp?.(event)
    }, [props])

    const Comp = asChild ? Slot : "button"
    
    const computedClassName = cn(
      buttonVariants({ variant, size }),
      // Conditional motion based on user preference
      !prefersReducedMotion && "hover:scale-[1.02] active:scale-[0.98]",
      prefersReducedMotion && "hover:brightness-110 active:brightness-90",
      // Loading state styles
      loading && "cursor-not-allowed",
      // Pressed state for keyboard interaction
      isPressed && "scale-[0.98]",
      className
    )

    if (asChild) {
      // When using asChild, we must return exactly one child element
      // The Slot component will merge button props with the child element
      return (
        <Comp
          ref={buttonRef}
          className={computedClassName}
          disabled={disabled || loading}
          aria-disabled={disabled || loading}
          aria-busy={loading}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    // Regular button rendering (not asChild)
    return (
      <Comp
        ref={buttonRef}
        className={computedClassName}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        aria-busy={loading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        {...props}
      >
        {loading && (
          <span 
            className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"
            aria-hidden="true"
          />
        )}
        <span className={loading && !loadingText ? 'sr-only' : undefined}>
          {loading && loadingText ? loadingText : children}
        </span>
        {loading && !loadingText && (
          <span aria-live="polite" className="sr-only">
            Loading
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
