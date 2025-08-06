# Wedding RSVP Application UI/UX Style Guide

## Table of Contents
1. [Brand Identity](#brand-identity)
2. [Typography](#typography)
3. [Color Palette](#color-palette)
4. [Layout & Grid System](#layout--grid-system)
5. [Components](#components)
6. [Icons & Imagery](#icons--imagery)
7. [Interaction Patterns](#interaction-patterns)
8. [Responsive Design](#responsive-design)
9. [Accessibility Standards](#accessibility-standards)
10. [Voice & Tone](#voice--tone)

## Brand Identity

### Core Values
- **Elegant**: The application should feel refined and sophisticated
- **Joyful**: Celebrating the happy occasion
- **Trustworthy**: Users are entrusting important event data
- **Efficient**: Streamlining complex planning processes

### Logo
- The primary logo features a stylized representation of a wedding invitation
- Minimum size: 40px height
- Clear space: Allow at least 20px of padding around the logo
- Logo should never be stretched, distorted, or altered in color

## Typography

### Font Families
- **Primary Font**: Inter (Sans-serif)
  - Used for all UI elements, body text, and non-heading content
  - Weights used: 400 (Regular), 500 (Medium), 600 (Semibold)

- **Display Font**: Playfair Display (Serif)
  - Used for headings and ceremonial elements
  - Weights used: 400 (Regular), 700 (Bold)

### Type Scale
- Base size: 16px (1rem)
- Scale ratio: 1.25 (major third)

| Element               | Size         | Weight     | Line Height | Font Family       |
|-----------------------|--------------|------------|-------------|-------------------|
| Display Large         | 3.052rem     | 700        | 1.1         | Playfair Display  |
| Display Medium        | 2.441rem     | 700        | 1.1         | Playfair Display  |
| Display Small         | 1.953rem     | 700        | 1.2         | Playfair Display  |
| Heading 1             | 1.563rem     | 600        | 1.2         | Inter             |
| Heading 2             | 1.25rem      | 600        | 1.3         | Inter             |
| Heading 3             | 1rem         | 600        | 1.4         | Inter             |
| Body Large            | 1rem         | 400        | 1.5         | Inter             |
| Body Medium           | 0.875rem     | 400        | 1.5         | Inter             |
| Body Small            | 0.8rem       | 400        | 1.5         | Inter             |
| Caption               | 0.75rem      | 400        | 1.4         | Inter             |
| Button                | 0.875rem     | 500        | 1           | Inter             |
| Input                 | 0.875rem     | 400        | 1.5         | Inter             |
| Label                 | 0.75rem      | 500        | 1.2         | Inter             |

## Color Palette

### Primary Colors
- **Gold**: #D4AF37
  - Used for primary actions, highlights, and important UI elements
  - Represents celebration and prosperity in Indian weddings
  
- **Deep Burgundy**: #800020
  - Used for secondary actions and supporting UI elements
  - Represents tradition and richness

### Neutral Colors
- **Background Light**: #FFFFFF
- **Background Subtle**: #F8F8F8
- **Border Light**: #EEEEEE
- **Border Medium**: #DDDDDD
- **Border Dark**: #CCCCCC
- **Text Subtle**: #767676
- **Text Medium**: #424242
- **Text Dark**: #212121

### Semantic Colors
- **Success**: #2E7D32
- **Success Light**: #EDF7ED
- **Warning**: #ED6C02
- **Warning Light**: #FFF4E5
- **Error**: #D32F2F
- **Error Light**: #FDEDED
- **Info**: #0288D1
- **Info Light**: #E5F6FD

### Gradients
- **Gold Gradient**: Linear-gradient(135deg, #D4AF37 0%, #FFDF70 100%)
  - Used for primary CTAs and celebration-related elements
  
- **Burgundy Gradient**: Linear-gradient(135deg, #800020 0%, #B22222 100%)
  - Used for secondary actions and traditional elements

### Color Usage
- **Text on Light Backgrounds**: Text Dark (#212121)
- **Text on Dark Backgrounds**: White (#FFFFFF)
- **Primary Buttons**: Gold Gradient
- **Secondary Buttons**: White with Burgundy border
- **Destructive Actions**: Error (#D32F2F)
- **Links**: Burgundy (#800020)
- **Focus States**: Gold (#D4AF37) with 2px outline

## Layout & Grid System

### Grid
- Base unit: 8px
- Column system: 12-column grid
- Gutters: 16px on desktop, 8px on mobile
- Margins: 24px on desktop, 16px on mobile

### Spacing Scale
- 4px - Extra Small (0.25rem)
- 8px - Small (0.5rem)
- 16px - Medium (1rem)
- 24px - Large (1.5rem)
- 32px - Extra Large (2rem)
- 48px - 2X Large (3rem)
- 64px - 3X Large (4rem)
- 96px - 4X Large (6rem)

### Page Templates
1. **Dashboard Layout**
   - Left sidebar navigation (collapsible on mobile)
   - Header with breadcrumbs and actions
   - Main content area with card-based components
   - Right sidebar for context-sensitive information (collapses on smaller screens)

2. **Form Layout**
   - Single-column forms with grouped sections
   - 2/3 page width on desktop
   - Full width on mobile

3. **RSVP Guest Layout**
   - Full width hero section
   - Centered content (max-width: 800px)
   - Footer with couple information

4. **Data Table Layout**
   - Full width tables with fixed headers
   - Pagination below table
   - Action bar above table

## Components

### Buttons

#### Primary Button
- Gold gradient background
- White text
- 8px border radius
- 16px vertical padding, 24px horizontal padding
- Hover: Slightly darker gradient
- Disabled: Grayscale with reduced opacity

#### Secondary Button
- White background
- Burgundy border (1px)
- Burgundy text
- 8px border radius
- 16px vertical padding, 24px horizontal padding
- Hover: Light gold background
- Disabled: Gray border and text with reduced opacity

#### Text Button
- No background
- Burgundy text
- No border
- 8px vertical padding, 16px horizontal padding
- Hover: Light gold background
- Disabled: Gray text with reduced opacity

#### Icon Button
- Circular shape
- 40px diameter
- Centered icon
- Hover: Light background
- Disabled: Reduced opacity

### Form Elements

#### Text Input
- Full width container
- 1px border (Border Medium)
- 8px border radius
- 12px padding
- Label positioned above input
- Error state: Error color border with error message below
- Focus state: Gold border with subtle shadow

#### Select Dropdown
- Same styling as text input
- Custom dropdown icon (chevron)
- Options panel with consistent styling

#### Checkbox & Radio
- Custom styled elements
- Gold accent for selected state
- Animated transitions

#### Date & Time Pickers
- Custom calendar interface
- Gold highlight for selected dates
- Clear today indication
- Standardized date display format throughout application
- Consistent date formatting using date utility functions
- Localized date presentation based on user preferences
- Clear distinction between input and display formats

#### Text Area
- Similar to text input
- Auto-growing height based on content
- Minimum 3 lines

### Cards
- White background
- Subtle shadow (0 2px 4px rgba(0, 0, 0, 0.1))
- 8px border radius
- 24px padding
- Optional header with title and actions
- Optional footer with actions

### Tables
- Full width
- Thin borders between rows
- Sticky headers
- Zebra striping (subtle alternating row colors)
- Hover state for rows
- Pagination controls below
- Consistent implementation using DataTable component
- Support for search functionality
- Configurable items per page
- Customizable cell rendering with consistent styling
- Standardized action buttons for row operations

### Tabs
- Underline style for active tab
- Gold indicator for active tab
- Equal spacing between tabs
- Scrollable on mobile

### Alerts & Notifications
- Color-coded based on type (success, warning, error, info)
- 8px border radius
- 16px padding
- Icon indicating type
- Optional close button
- Optional action button

### Modals & Dialogs
- Centered on screen
- White background
- 8px border radius
- Drop shadow
- Header with title
- Footer with actions
- Backdrop with 50% opacity black

### Progress Indicators
- Linear progress bar for overall progress
- Gold fill color
- Smooth animation
- Optional text percentage

## Icons & Imagery

### Icons
- **System**: Lucide React icon set
- **Size**: 24px default, 16px for compact UI, 32px for emphasis
- **Style**: Outline style with 1.5px stroke width
- **Color**: Inherits from text color by default

### Imagery
- **Photos**: High-quality, bright, celebration-focused
- **Illustrations**: Minimal, elegant line art style
- **Backgrounds**: Subtle patterns or solid colors
- **Image Treatment**: Rounded corners (8px) for contained images

### Decorative Elements
- **Patterns**: Traditional Indian patterns for decorative elements
- **Motifs**: Mandala designs, floral elements
- **Dividers**: Elegant separators with gold accents

## Interaction Patterns

### Loading States
- Skeleton screens for content loading
- Spinner for actions (gold color)
- Button loading state with spinner replacing text

### Transitions & Animations
- Page transitions: Subtle fade (150ms)
- Element transitions: Ease-in-out (250ms)
- Attention-grabbing animations: Gentle bounce
- Loading animations: Smooth, continuous motion

### Hover & Focus States
- Hover: Subtle background change or scale
- Focus: Gold outline (2px) with slight glow

### Error Handling
- Inline validation with clear error messages
- Form-level errors displayed at top of form
- Destructive actions require confirmation

### Empty States
- Illustrated empty state designs
- Clear messaging about what's missing
- Action button to resolve empty state

### Success Confirmation
- Success messages with checkmark icon
- Temporary toast notifications for actions
- Clear next steps provided

## Responsive Design

### Breakpoints
- **Extra Small**: < 576px (Mobile)
- **Small**: 576px - 767px (Large mobile, small tablet)
- **Medium**: 768px - 991px (Tablet)
- **Large**: 992px - 1199px (Desktop)
- **Extra Large**: >= 1200px (Large desktop)

### Mobile Adaptations
- Single column layouts
- Stacked navigation (hamburger menu)
- Larger touch targets (min 44px)
- Reduced padding and margins
- Simplified tables with horizontal scroll or card view

### Tablet Adaptations
- Sidebar navigation collapses to icons
- Reduced whitespace
- Simplified multi-column layouts
- Optimized for touch and mouse input

### Desktop Optimizations
- Full navigation with text labels
- Multi-column layouts
- Hover-enabled interactions
- Keyboard shortcuts
- Information density balanced with whitespace

## Accessibility Standards

### Color Contrast
- Text meets WCAG AA standard minimum (4.5:1 for normal text, 3:1 for large text)
- Interactive elements have sufficient contrast from background
- Color is not the only means of conveying information

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus states are clearly visible
- Logical tab order follows visual layout
- Keyboard shortcuts for power users

### Screen Reader Support
- Semantic HTML structure
- ARIA labels where appropriate
- Alternative text for images
- Appropriate heading hierarchy

### Motion & Animation
- Reduced motion option for vestibular disorders
- No autoplay videos or excessive animation
- No flashing content that could trigger seizures

## Voice & Tone

### Writing Style
- **Clear**: Simple, straightforward language
- **Warm**: Friendly and inviting
- **Concise**: Brief but complete information
- **Helpful**: Anticipating user needs

### Content Guidelines
- Avoid technical jargon
- Use consistent terminology
- Active voice preferred
- Sentence case for most UI text
- Ceremonial language for wedding-specific terms

### Message Types
- **Instructional**: Clear guidance on what to do
- **Success**: Positive, celebratory
- **Error**: Empathetic, solution-oriented
- **Empty State**: Encouraging, action-oriented

### Specific Examples
- Error: "We couldn't save your changes. Please try again."
- Success: "Great! Your RSVP has been submitted."
- Empty State: "No guests added yet. Start building your guest list."
- Confirmation: "Are you sure you want to remove this guest from the list?"