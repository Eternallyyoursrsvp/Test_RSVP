# Color System

## Brand Color Palette

### Primary Brand Colors

#### Purple (#7A51E1)
**Usage**: Active states, focus rings, primary buttons, progress indicators
- **Primary**: `#7A51E1` - Main brand purple (exact specification)
- **Light**: `#A78BFF` - Hover states and light variants
- **Dark**: `#5832A3` - Pressed states and dark variants

#### Gold (#E3C76F)  
**Usage**: Logo text, decorative elements, accent highlights
- **Primary**: `#E3C76F` - Main brand gold (exact specification)
- **Light**: `#F0D988` - Light accent elements
- **Dark**: `#B0923E` - Deep gold for contrast

### Background Colors

#### Light Mode
- **Background**: `#FFFFFF` - Pure white, no tints or fills
- **Card**: `rgba(255,255,255,0.6)` - Glass effect background
- **Muted**: `#F9FAFB` - Very subtle background for inactive areas

#### Dark Mode  
- **Background**: `#121212` - Deep charcoal (exact specification)
- **Card**: `rgba(30,30,30,0.5)` - Dark glass effect background
- **Muted**: `#262626` - Subtle dark background

### Text Colors

#### Light Mode
- **Primary**: `#1F1F1F` - Near black for main text
- **Secondary**: `#6B7280` - Medium gray for secondary text  
- **Muted**: `#9CA3AF` - Light gray for muted text

#### Dark Mode
- **Primary**: `#FAFAFA` - Clean white for main text
- **Secondary**: `#A3A3A3` - Light gray for secondary text
- **Muted**: `#6B7280` - Medium gray for muted text

### Border Colors

#### Light Mode
- **Default**: `#E5E7EB` - Light gray borders
- **Focus**: `#7A51E1` - Purple focus rings
- **Hover**: `#D1D5DB` - Slightly darker on hover

#### Dark Mode
- **Default**: `#2A2A2A` - Dark gray borders  
- **Focus**: `#7A51E1` - Purple focus rings (same as light)
- **Hover**: `#374151` - Lighter on hover

### Status Colors

#### Success
- **Primary**: `#22C55E` - Green for success states
- **Background**: `rgba(34,197,94,0.1)` - Success background tint
- **Border**: `rgba(34,197,94,0.2)` - Success border tint

#### Warning
- **Primary**: `#F59E0B` - Amber for warning states
- **Background**: `rgba(245,158,11,0.1)` - Warning background tint
- **Border**: `rgba(245,158,11,0.2)` - Warning border tint

#### Error
- **Primary**: `#EF4444` - Red for error states
- **Background**: `rgba(239,68,68,0.1)` - Error background tint
- **Border**: `rgba(239,68,68,0.2)` - Error border tint

## CSS Variables

```css
/* Light Mode */
:root {
  --background: 0 0% 100%;           /* #FFFFFF */
  --foreground: 224 71% 4%;          /* #1F1F1F */
  --card: 0 0% 100%;                 /* #FFFFFF */
  --card-foreground: 224 71% 4%;     /* #1F1F1F */
  --primary: 252 56% 57%;            /* #7A51E1 */
  --primary-foreground: 0 0% 100%;   /* #FFFFFF */
  --secondary: 45 54% 68%;           /* #E3C76F */
  --secondary-foreground: 224 71% 4%; /* #1F1F1F */
  --muted: 220 14% 96%;              /* #F9FAFB */
  --muted-foreground: 220 9% 46%;    /* #6B7280 */
  --accent: 252 56% 57%;             /* #7A51E1 */
  --accent-foreground: 0 0% 100%;    /* #FFFFFF */
  --destructive: 0 84% 60%;          /* #EF4444 */
  --destructive-foreground: 0 0% 100%; /* #FFFFFF */
  --border: 220 13% 91%;             /* #E5E7EB */
  --input: 220 13% 91%;              /* #E5E7EB */
  --ring: 252 56% 57%;               /* #7A51E1 */
}

/* Dark Mode */
.dark {
  --background: 0 0% 7%;             /* #121212 */
  --foreground: 0 0% 98%;            /* #FAFAFA */
  --card: 0 0% 12%;                  /* #1E1E1E */
  --card-foreground: 0 0% 98%;       /* #FAFAFA */
  --primary: 252 56% 57%;            /* #7A51E1 */
  --primary-foreground: 0 0% 100%;   /* #FFFFFF */
  --secondary: 45 54% 68%;           /* #E3C76F */
  --secondary-foreground: 0 0% 7%;   /* #121212 */
  --muted: 0 0% 15%;                 /* #262626 */
  --muted-foreground: 0 0% 64%;      /* #A3A3A3 */
  --accent: 252 56% 57%;             /* #7A51E1 */
  --accent-foreground: 0 0% 100%;    /* #FFFFFF */
  --destructive: 0 84% 60%;          /* #EF4444 */
  --destructive-foreground: 0 0% 100%; /* #FFFFFF */
  --border: 0 0% 16%;                /* #2A2A2A */
  --input: 0 0% 16%;                 /* #2A2A2A */
  --ring: 252 56% 57%;               /* #7A51E1 */
}
```

## Usage Guidelines

### Brand Color Usage
- **Purple (#7A51E1)**: 
  - ✅ Active states, focus rings, primary buttons, progress bars
  - ❌ Large background areas, text color
  
- **Gold (#E3C76F)**:
  - ✅ Logo text, decorative elements, accent highlights
  - ❌ Primary buttons, large UI elements

### Background Principles
- **Pure Backgrounds**: Always use exact #FFFFFF (light) or #121212 (dark)
- **No Tints**: Never add color tints to background areas
- **Glass Effects**: Cards and panels use glassmorphism, not solid backgrounds

### Accessibility
- **WCAG AA Compliance**: All text maintains 4.5:1 contrast ratio minimum
- **Focus Indicators**: Purple focus rings with 2px offset
- **Status Colors**: High contrast for clear communication

### Color Combinations

#### Recommended Pairings
```css
/* Primary button */
background: hsl(var(--primary));
color: hsl(var(--primary-foreground));

/* Glass card */
background: rgba(255,255,255,0.6);
backdrop-filter: blur(12px);
border: 1px solid hsl(var(--border));

/* Status success */
background: rgba(34,197,94,0.1);
border: 1px solid rgba(34,197,94,0.2);
color: #22C55E;
```

#### Avoid These Combinations
- ❌ Purple background with gold text
- ❌ Gold backgrounds in large areas  
- ❌ Multiple accent colors in single component
- ❌ Hardcoded hex values in components

## Design Token Implementation

All colors must be used through the design system:

```typescript
// ✅ Correct - Using design tokens
import { colors } from '@/design-system/tokens';

const buttonStyle = {
  backgroundColor: colors.primary[500],
  borderColor: colors.primary[600],
};

// ❌ Incorrect - Hardcoded values
const buttonStyle = {
  backgroundColor: '#7A51E1',
  borderColor: '#5832A3',
};
```