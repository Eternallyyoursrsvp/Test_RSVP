# LUXURY WEDDING RSVP APP - COMPLETE UI DESIGN SPECIFICATION

## OVERVIEW
This document defines the complete visual design system for the luxury wedding RSVP application, inspired by elegant wedding aesthetics with modern sophistication.

## COLOR PALETTE

### Primary Colors
- **Background Light**: `#FFFFFF` (Pure white)
- **Background Dark**: `#1A1A1A` (Deep charcoal, not brown)
- **Card Background Light**: `#FFFFFF` (Pure white)
- **Card Background Dark**: `#2A2A2A` (Charcoal gray)

### Text Colors
- **Primary Text Light**: `#1F1F1F` (Near black)
- **Primary Text Dark**: `#FFFFFF` (Pure white)
- **Secondary Text Light**: `#6B7280` (Medium gray)
- **Secondary Text Dark**: `#9CA3AF` (Light gray)
- **Muted Text Light**: `#9CA3AF` (Light gray)
- **Muted Text Dark**: `#6B7280` (Medium gray)

### Accent Colors
- **Primary Purple**: `#8B5CF6` (Elegant violet)
- **Secondary Purple**: `#A78BFA` (Light violet)
- **Gold Accent**: `#F59E0B` (Warm gold)
- **Success Green**: `#10B981` (Emerald)
- **Warning Orange**: `#F59E0B` (Amber)
- **Error Red**: `#EF4444` (Red)

### Border Colors
- **Light Mode Borders**: `#E5E7EB` (Light gray)
- **Dark Mode Borders**: `#374151` (Dark gray)
- **Accent Borders**: `#8B5CF6` (Primary purple)

## TYPOGRAPHY

### Font Families
- **Primary Font**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Decorative Font**: `'Cormorant Garamond', serif` (for couple names, event titles)

### Font Weights
- **Light**: 300 (for large headings)
- **Regular**: 400 (body text)
- **Medium**: 500 (subheadings, buttons)
- **Semibold**: 600 (important headings)
- **Bold**: 700 (emphasis only)

### Typography Scale
- **Hero Title**: 3rem (48px), weight 300, line-height 1.1
- **Page Title**: 2.25rem (36px), weight 600, line-height 1.2
- **Section Title**: 1.5rem (24px), weight 600, line-height 1.3
- **Subsection**: 1.25rem (20px), weight 500, line-height 1.4
- **Body Large**: 1.125rem (18px), weight 400, line-height 1.6
- **Body**: 1rem (16px), weight 400, line-height 1.6
- **Body Small**: 0.875rem (14px), weight 400, line-height 1.5
- **Caption**: 0.75rem (12px), weight 500, line-height 1.4

### Special Typography Classes
- **Couple Names**: Cormorant Garamond, 2rem, weight 400, color gold
- **Event Titles**: Cormorant Garamond, 1.5rem, weight 600
- **Decorative Text**: Cormorant Garamond with letter-spacing 0.025em

## SPACING SYSTEM

### Padding/Margin Scale
- **xs**: 0.25rem (4px)
- **sm**: 0.5rem (8px)
- **md**: 1rem (16px)
- **lg**: 1.5rem (24px)
- **xl**: 2rem (32px)
- **2xl**: 3rem (48px)
- **3xl**: 4rem (64px)

### Component Spacing
- **Card Padding**: 1.5rem (24px)
- **Button Padding**: 0.75rem 1.5rem (12px 24px)
- **Form Field Spacing**: 1rem (16px) between fields
- **Section Spacing**: 3rem (48px) between major sections

## SHADOWS AND EFFECTS

### Shadow Definitions
- **Shadow XS**: `0 1px 2px rgba(0, 0, 0, 0.05)`
- **Shadow SM**: `0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)`
- **Shadow MD**: `0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)`
- **Shadow LG**: `0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)`
- **Shadow XL**: `0 20px 25px rgba(0, 0, 0, 0.1), 0 8px 10px rgba(0, 0, 0, 0.04)`

### Dark Mode Shadows
- **Shadow XS Dark**: `0 1px 2px rgba(0, 0, 0, 0.3)`
- **Shadow SM Dark**: `0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.3)`
- **Shadow MD Dark**: `0 4px 6px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.4)`
- **Shadow LG Dark**: `0 10px 15px rgba(0, 0, 0, 0.6), 0 4px 6px rgba(0, 0, 0, 0.5)`
- **Shadow XL Dark**: `0 20px 25px rgba(0, 0, 0, 0.7), 0 8px 10px rgba(0, 0, 0, 0.6)`

### Border Radius
- **Small**: 0.375rem (6px) - for small elements
- **Medium**: 0.5rem (8px) - for cards, buttons
- **Large**: 0.75rem (12px) - for large cards
- **XL**: 1rem (16px) - for hero sections
- **Full**: 9999px - for pills, badges

## COMPONENT SPECIFICATIONS

### Cards
- **Background**: Pure white (light) / #2A2A2A (dark)
- **Border**: 1px solid #E5E7EB (light) / #374151 (dark)
- **Border Radius**: 0.5rem (8px)
- **Padding**: 1.5rem (24px)
- **Shadow**: Shadow SM
- **Hover Shadow**: Shadow MD
- **Transition**: all 0.2s ease-out

### Buttons

#### Primary Button
- **Background**: #8B5CF6 (primary purple)
- **Text Color**: #FFFFFF
- **Border**: none
- **Border Radius**: 0.5rem (8px)
- **Padding**: 0.75rem 1.5rem (12px 24px)
- **Font Weight**: 500
- **Shadow**: Shadow SM
- **Hover Background**: #7C3AED (darker purple)
- **Hover Shadow**: Shadow MD
- **Transition**: all 0.2s ease-out

#### Secondary Button
- **Background**: #FFFFFF (light) / #2A2A2A (dark)
- **Text Color**: #1F1F1F (light) / #FFFFFF (dark)
- **Border**: 1px solid #E5E7EB (light) / #374151 (dark)
- **Border Radius**: 0.5rem (8px)
- **Padding**: 0.75rem 1.5rem (12px 24px)
- **Font Weight**: 500
- **Shadow**: Shadow XS
- **Hover Border**: #8B5CF6 (primary purple)
- **Hover Shadow**: Shadow SM
- **Transition**: all 0.2s ease-out

#### Ghost Button
- **Background**: transparent
- **Text Color**: #6B7280 (light) / #9CA3AF (dark)
- **Border**: none
- **Border Radius**: 0.5rem (8px)
- **Padding**: 0.75rem 1.5rem (12px 24px)
- **Font Weight**: 500
- **Hover Background**: #F3F4F6 (light) / #374151 (dark)
- **Transition**: all 0.2s ease-out

### Form Elements

#### Input Fields
- **Background**: #FFFFFF (light) / #2A2A2A (dark)
- **Border**: 1px solid #E5E7EB (light) / #374151 (dark)
- **Border Radius**: 0.5rem (8px)
- **Padding**: 0.75rem 1rem (12px 16px)
- **Font Size**: 1rem (16px)
- **Focus Border**: #8B5CF6 (primary purple)
- **Focus Ring**: 0 0 0 3px rgba(139, 92, 246, 0.1)
- **Transition**: all 0.2s ease-out

#### Labels
- **Font Weight**: 500
- **Font Size**: 0.875rem (14px)
- **Color**: #374151 (light) / #D1D5DB (dark)
- **Margin Bottom**: 0.5rem (8px)

### Status Pills/Badges

#### Confirmed Status
- **Background**: rgba(16, 185, 129, 0.1)
- **Text Color**: #065F46
- **Border**: 1px solid rgba(16, 185, 129, 0.2)
- **Border Radius**: 9999px (full)
- **Padding**: 0.25rem 0.75rem (4px 12px)
- **Font Size**: 0.75rem (12px)
- **Font Weight**: 500

#### Pending Status
- **Background**: rgba(245, 158, 11, 0.1)
- **Text Color**: #92400E
- **Border**: 1px solid rgba(245, 158, 11, 0.2)
- **Border Radius**: 9999px (full)
- **Padding**: 0.25rem 0.75rem (4px 12px)
- **Font Size**: 0.75rem (12px)
- **Font Weight**: 500

#### Declined Status
- **Background**: rgba(239, 68, 68, 0.1)
- **Text Color**: #991B1B
- **Border**: 1px solid rgba(239, 68, 68, 0.2)
- **Border Radius**: 9999px (full)
- **Padding**: 0.25rem 0.75rem (4px 12px)
- **Font Size**: 0.75rem (12px)
- **Font Weight**: 500

### Navigation

#### Sidebar
- **Background**: #FFFFFF (light) / #1A1A1A (dark)
- **Border**: 1px solid #E5E7EB (light) / #374151 (dark)
- **Width**: 16rem (256px)
- **Padding**: 1.5rem (24px)

#### Sidebar Links
- **Inactive Color**: #6B7280 (light) / #9CA3AF (dark)
- **Active Color**: #8B5CF6 (primary purple)
- **Active Background**: rgba(139, 92, 246, 0.1)
- **Border Radius**: 0.375rem (6px)
- **Padding**: 0.5rem 0.75rem (8px 12px)
- **Font Weight**: 500
- **Transition**: all 0.2s ease-out

#### Header
- **Background**: #FFFFFF (light) / #1A1A1A (dark)
- **Border Bottom**: 1px solid #E5E7EB (light) / #374151 (dark)
- **Height**: 4rem (64px)
- **Padding**: 0 1.5rem (0 24px)
- **Backdrop Filter**: blur(8px) - if transparent

### Tables

#### Table Header
- **Background**: #F9FAFB (light) / #374151 (dark)
- **Border Bottom**: 1px solid #E5E7EB (light) / #4B5563 (dark)
- **Padding**: 0.75rem 1rem (12px 16px)
- **Font Weight**: 600
- **Font Size**: 0.875rem (14px)
- **Color**: #374151 (light) / #F9FAFB (dark)

#### Table Cells
- **Padding**: 1rem (16px)
- **Border Bottom**: 1px solid #E5E7EB (light) / #374151 (dark)
- **Font Size**: 0.875rem (14px)
- **Color**: #1F1F1F (light) / #FFFFFF (dark)

#### Table Hover
- **Background**: #F9FAFB (light) / #2A2A2A (dark)
- **Transition**: all 0.15s ease-out

### Modals/Dialogs

#### Backdrop
- **Background**: rgba(0, 0, 0, 0.5)
- **Backdrop Filter**: blur(4px)

#### Modal Container
- **Background**: #FFFFFF (light) / #1A1A1A (dark)
- **Border Radius**: 0.75rem (12px)
- **Shadow**: Shadow XL
- **Max Width**: 32rem (512px) for standard modals
- **Padding**: 2rem (32px)

## INTERACTIVE STATES

### Hover States
- **Scale Transform**: scale(1.02) for cards
- **Translate Transform**: translateY(-1px) for buttons
- **Shadow Enhancement**: Increase shadow depth by one level
- **Transition Duration**: 0.2s ease-out

### Focus States
- **Outline**: 2px solid #8B5CF6 (primary purple)
- **Outline Offset**: 2px
- **Ring**: 0 0 0 3px rgba(139, 92, 246, 0.1)

### Active States
- **Scale Transform**: scale(0.98) for buttons
- **Shadow Reduction**: Reduce shadow depth by one level

### Disabled States
- **Opacity**: 0.5
- **Cursor**: not-allowed
- **No Hover Effects**: Remove all hover transformations

## RESPONSIVE BREAKPOINTS

### Mobile (0-640px)
- **Sidebar**: Collapsible overlay
- **Card Padding**: 1rem (16px)
- **Font Sizes**: Reduce by 0.125rem (2px) from base
- **Button Padding**: 0.5rem 1rem (8px 16px)

### Tablet (641-1024px)
- **Sidebar**: 14rem (224px) width
- **Card Padding**: 1.25rem (20px)
- **Standard sizing**: Most desktop sizes apply

### Desktop (1025px+)
- **Sidebar**: 16rem (256px) width
- **Card Padding**: 1.5rem (24px)
- **Full sizing**: All specifications apply

## ANIMATION AND TRANSITIONS

### Standard Transitions
- **Duration**: 0.2s for hover effects
- **Duration**: 0.3s for state changes
- **Duration**: 0.4s for modal appearances
- **Easing**: ease-out for all transitions

### Specific Animations
- **Page Transitions**: fade in 0.3s ease-out
- **Modal Entrance**: scale(0.95) to scale(1) + fade in 0.2s ease-out
- **Card Hover**: translateY(-1px) + scale(1.02) 0.2s ease-out
- **Button Press**: scale(0.98) 0.1s ease-out

## ACCESSIBILITY

### Contrast Ratios
- **Body Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Minimum 3:1 contrast ratio

### Focus Indicators
- **Visible Focus**: Always visible, never removed
- **Focus Ring**: 2px solid primary color with offset
- **Skip Links**: For keyboard navigation

## SPECIAL NOTES

### Theme Toggle
- **Light Mode Icon**: Moon symbol
- **Dark Mode Icon**: Sun symbol
- **Position**: Top right header
- **Button Style**: Ghost button variant
- **Transition**: 0.3s ease-out for all color changes

### Loading States
- **Skeleton**: Match component shape with shimmer effect
- **Spinner**: Primary purple color, 1.5rem size
- **Progress Bars**: Primary purple fill, light gray background

### Error States
- **Color**: #EF4444 (error red)
- **Background**: rgba(239, 68, 68, 0.1)
- **Border**: 1px solid rgba(239, 68, 68, 0.2)
- **Icon**: Warning triangle or X symbol

This specification covers every visual element in the application. Implement these exact values without deviation.