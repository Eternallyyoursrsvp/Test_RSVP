# Typography System

## Font Families

### Primary Font: Inter
**Usage**: All UI elements, body text, navigation, forms
- **Family**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Characteristics**: Clean, readable, modern sans-serif optimized for UI
- **Weights Available**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### Decorative Font: Cormorant Garamond  
**Usage**: Couple names, event titles, ceremonial elements
- **Family**: `'Cormorant Garamond', serif`
- **Characteristics**: Elegant serif with sophisticated personality
- **Weights Available**: 400 (Regular), 600 (Semibold), 700 (Bold)

## Typography Scale

### Heading Hierarchy

#### H1 - Page Titles
```css
font-family: 'Inter', sans-serif;
font-size: 2.25rem;      /* 36px */
font-weight: 600;        /* Semibold */
line-height: 1.2;        /* 43.2px */
letter-spacing: -0.025em;
color: hsl(var(--foreground));
```

#### H2 - Section Titles  
```css
font-family: 'Inter', sans-serif;
font-size: 1.875rem;     /* 30px */
font-weight: 600;        /* Semibold */
line-height: 1.25;       /* 37.5px */
letter-spacing: -0.025em;
color: hsl(var(--foreground));
```

#### H3 - Subsection Titles
```css
font-family: 'Inter', sans-serif;
font-size: 1.5rem;       /* 24px */
font-weight: 600;        /* Semibold */
line-height: 1.3;        /* 31.2px */
color: hsl(var(--foreground));
```

#### H4 - Component Titles
```css
font-family: 'Inter', sans-serif;
font-size: 1.25rem;      /* 20px */
font-weight: 500;        /* Medium */
line-height: 1.4;        /* 28px */
color: hsl(var(--foreground));
```

### Body Text

#### Large Body
```css
font-family: 'Inter', sans-serif;
font-size: 1.125rem;     /* 18px */
font-weight: 400;        /* Regular */
line-height: 1.6;        /* 28.8px */
color: hsl(var(--foreground));
```

#### Regular Body
```css
font-family: 'Inter', sans-serif;
font-size: 1rem;         /* 16px */
font-weight: 400;        /* Regular */
line-height: 1.6;        /* 25.6px */
color: hsl(var(--foreground));
```

#### Small Body
```css
font-family: 'Inter', sans-serif;
font-size: 0.875rem;     /* 14px */
font-weight: 400;        /* Regular */
line-height: 1.5;        /* 21px */
color: hsl(var(--muted-foreground));
```

#### Caption
```css
font-family: 'Inter', sans-serif;
font-size: 0.75rem;      /* 12px */
font-weight: 500;        /* Medium */
line-height: 1.4;        /* 16.8px */
color: hsl(var(--muted-foreground));
```

### UI Elements

#### Buttons
```css
font-family: 'Inter', sans-serif;
font-size: 0.875rem;     /* 14px */
font-weight: 500;        /* Medium */
line-height: 1;          /* 14px */
letter-spacing: 0.025em;
```

#### Form Labels
```css
font-family: 'Inter', sans-serif;
font-size: 0.875rem;     /* 14px */
font-weight: 500;        /* Medium */
line-height: 1.2;        /* 16.8px */
color: hsl(var(--foreground));
```

#### Form Inputs
```css
font-family: 'Inter', sans-serif;
font-size: 0.875rem;     /* 14px */
font-weight: 400;        /* Regular */
line-height: 1.5;        /* 21px */
color: hsl(var(--foreground));
```

#### Navigation
```css
font-family: 'Inter', sans-serif;
font-size: 0.875rem;     /* 14px */
font-weight: 500;        /* Medium */
line-height: 1.2;        /* 16.8px */
color: hsl(var(--muted-foreground));
```

## Decorative Typography

### Couple Names
```css
font-family: 'Cormorant Garamond', serif;
font-size: 2rem;         /* 32px */
font-weight: 400;        /* Regular */
line-height: 1.2;        /* 38.4px */
letter-spacing: 0.025em;
color: hsl(var(--secondary)); /* Gold color */
```

### Event Titles
```css
font-family: 'Cormorant Garamond', serif;
font-size: 1.5rem;       /* 24px */
font-weight: 600;        /* Semibold */
line-height: 1.3;        /* 31.2px */
letter-spacing: 0.025em;
color: hsl(var(--foreground));
```

### Ceremonial Text
```css
font-family: 'Cormorant Garamond', serif;
font-size: 1.125rem;     /* 18px */
font-weight: 400;        /* Regular */
line-height: 1.4;        /* 25.2px */
letter-spacing: 0.05em;
color: hsl(var(--muted-foreground));
```

## Design Tokens

### Font Weights
```typescript
export const typography = {
  fontWeight: {
    light: 300,     // Large headings only
    regular: 400,   // Body text, most content
    medium: 500,    // Subheadings, buttons, labels
    semibold: 600,  // Important headings
    bold: 700,      // Emphasis only, rarely used
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px - Captions
    sm: '0.875rem',   // 14px - Small text, buttons
    base: '1rem',     // 16px - Base body text
    lg: '1.125rem',   // 18px - Large body text
    xl: '1.25rem',    // 20px - H4
    '2xl': '1.5rem',  // 24px - H3
    '3xl': '1.875rem', // 30px - H2
    '4xl': '2.25rem', // 36px - H1
    '5xl': '3rem',    // 48px - Hero text
  },
  
  lineHeight: {
    none: 1,
    tight: 1.1,      // Hero text
    snug: 1.2,       // Headings
    normal: 1.5,     // UI elements
    relaxed: 1.6,    // Body text
  },
  
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',  // Headings
    normal: '0',
    wide: '0.025em',    // Buttons, decorative
    wider: '0.05em',    // Ceremonial text
  }
};
```

## Usage Guidelines

### Hierarchy Rules
1. **Page Title (H1)**: One per page, largest size
2. **Section Titles (H2)**: Major page sections
3. **Subsections (H3)**: Content groupings
4. **Component Titles (H4)**: Cards, panels, forms

### Font Family Selection
- **Inter**: All functional UI elements, navigation, forms, body text
- **Cormorant Garamond**: Couple names, event titles, ceremonial elements only

### Weight Guidelines
- **Light (300)**: Large hero text only
- **Regular (400)**: All body text and readable content
- **Medium (500)**: Buttons, labels, navigation, small headings
- **Semibold (600)**: Important headings, page titles
- **Bold (700)**: Emphasis within text only (rarely used)

### Color Application
- **Primary Text**: `hsl(var(--foreground))` for main content
- **Secondary Text**: `hsl(var(--muted-foreground))` for supporting info
- **Brand Text**: `hsl(var(--secondary))` for couple names (gold)
- **UI Text**: Contextual colors based on component state

## Responsive Typography

### Mobile Scaling
```css
/* Mobile adjustments */
@media (max-width: 768px) {
  .text-4xl { font-size: 1.875rem; } /* H1: 36px → 30px */
  .text-3xl { font-size: 1.5rem; }   /* H2: 30px → 24px */
  .text-2xl { font-size: 1.25rem; }  /* H3: 24px → 20px */
  .text-xl { font-size: 1.125rem; }  /* H4: 20px → 18px */
}
```

### Line Height Adjustments
- **Headings**: Tighter line height (1.1-1.3) for visual impact
- **Body Text**: Relaxed line height (1.6) for readability
- **UI Elements**: Normal line height (1.5) for compact layout

## Implementation Examples

### CSS Classes
```css
/* Primary heading */
.heading-1 {
  font-family: 'Inter', sans-serif;
  font-size: 2.25rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.025em;
  color: hsl(var(--foreground));
}

/* Couple name decorative */
.couple-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 2rem;
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.025em;
  color: hsl(var(--secondary));
}

/* Body text */
.body-text {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  color: hsl(var(--foreground));
}
```

### Tailwind Classes
```html
<!-- Page title -->
<h1 class="font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground">

<!-- Couple names -->
<span class="font-serif text-2xl text-secondary tracking-wide">

<!-- Body text -->
<p class="text-base leading-relaxed text-foreground">

<!-- Button text -->
<button class="text-sm font-medium tracking-wide">
```