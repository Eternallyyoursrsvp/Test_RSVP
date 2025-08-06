# Design System Documentation

## Overview

The Wedding RSVP Platform implements a luxury design system inspired by Apple iOS 18, featuring heavy glassmorphism, minimal aesthetics, and sophisticated visual hierarchy. This design system ensures consistency across all components while maintaining the elegance expected of a premium wedding platform.

## 🎨 Design Philosophy

### Core Principles
- **Luxury Minimal**: Clean, spacious layouts with purposeful white space
- **Apple iOS 18 Inspired**: Modern glassmorphism with depth and sophistication  
- **Heavy Glassmorphism**: All cards, panels, and containers use glass effects
- **Strict Color Discipline**: Purple (#7A51E1) and gold (#E3C76F) accents only
- **Typography Hierarchy**: Inter for UI, Cormorant Garamond for decorative elements

### Visual Identity
- **Pure Backgrounds**: Light mode #FFFFFF, dark mode #121212 - no additional fills
- **Glass Effects**: rgba(255,255,255,0.6) + backdrop-blur(12px) in light, rgba(30,30,30,0.5) + blur(10px) in dark
- **Accent Usage**: Purple for active states, borders, focus rings; Gold for logo text and decorative elements
- **Hover Effects**: Scale(1.02) + deeper shadows - NO background color changes

## 📁 File Structure

```
/client/src/design-system/
├── tokens.ts          # Master design tokens (colors, typography, spacing)
├── components.ts      # Component style utilities and generators
└── index.ts          # Unified exports
```

## 🔧 Implementation

### Design Tokens (`tokens.ts`)
- **Single Source of Truth**: All styling decisions centralized
- **Color System**: Exact brand colors with proper HSL variants
- **Typography Scale**: Consistent font sizes, weights, and line heights
- **Spacing System**: 4px grid-based spacing scale
- **Component Patterns**: Reusable style patterns for consistency

### CSS Variables (`/client/src/index.css`)
- **Theme-Aware Variables**: Automatic light/dark mode switching
- **HSL Color Space**: Proper color calculations and transparency
- **Glass Utilities**: Pre-built glassmorphism classes
- **Component Classes**: Consistent styling for common patterns

### Tailwind Integration (`tailwind.config.ts`)
- **Design System Variables**: Tailwind uses design system tokens
- **Custom Utilities**: Extended Tailwind with brand-specific utilities
- **Component Classes**: Pre-styled component classes
- **Chart Colors**: Consistent data visualization colors

## 📖 Documentation Structure

- **[Color System](./colors.md)** - Complete color palette, usage guidelines, and accessibility
- **[Typography](./typography.md)** - Font families, scales, and text styling
- **[Components](./components.md)** - UI component specifications and variants
- **[Layout & Spacing](./layout.md)** - Grid system, spacing, and responsive design
- **[Glassmorphism](./glassmorphism.md)** - Glass effect implementation and guidelines
- **[Theme System](./themes.md)** - Light/dark mode implementation
- **[Icons & Assets](./icons.md)** - Icon usage and brand assets

## 🚀 Usage Examples

### Applying Design Tokens in Components
```typescript
import { getCardClasses, getButtonClasses } from '@/design-system';

// Card with glassmorphism
<div className={getCardClasses('default')}>
  Content
</div>

// Primary button with brand styling
<button className={getButtonClasses('primary')}>
  Action
</button>
```

### Using CSS Variables
```css
.custom-component {
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--card-foreground));
}
```

## ✅ Design Compliance

### Current Status
- ✅ **Zero Hardcoded Colors**: All components use design system tokens
- ✅ **Glassmorphism Implementation**: Consistent glass effects throughout
- ✅ **Brand Color Compliance**: Strict purple/gold accent usage
- ✅ **Typography Consistency**: Proper font families and scales
- ✅ **Theme Support**: Perfect light/dark mode switching
- ✅ **Component Consistency**: Unified styling across all UI elements

### Quality Assurance
- **Automated Audits**: Regular checks for hardcoded colors and inconsistencies
- **Design Token Enforcement**: All styling goes through centralized system
- **Theme Testing**: Verify all components in both light and dark modes
- **Accessibility Compliance**: WCAG AA contrast ratios maintained
- **Brand Guidelines**: Strict adherence to luxury aesthetic principles

## 🔄 Maintenance

### Adding New Colors
1. Add to `colors` object in `tokens.ts`
2. Define CSS variables in `index.css`
3. Update Tailwind config if needed
4. Document usage guidelines

### Creating New Components
1. Define style utilities in `components.ts`
2. Follow glassmorphism patterns
3. Use design system tokens only
4. Test in both themes
5. Document component specifications

### Design System Evolution
All changes to the design system must:
- Maintain luxury aesthetic
- Preserve glassmorphism effects
- Follow Apple iOS 18 principles
- Update documentation
- Pass accessibility standards