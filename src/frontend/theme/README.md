# TeleTwin Theme System

This folder contains the theme configuration for the TeleTwin application. You can easily customize colors, spacing, shadows, and other design elements by modifying the files in this directory.

## Quick Start - Changing Colors

To change the application's color scheme, edit `theme.ts`:

### Main Colors
```typescript
// Edit these colors in src/frontend/theme/theme.ts
export const theme: Theme = {
  colors: {
    // Primary Blue Palette - CHANGE THESE
    primary: '#0066CC',           // Main blue color
    primaryLight: '#3399FF',      // Light blue (buttons hover, accents)
    primaryDark: '#004499',       // Dark blue (button press, emphasis)
    
    // Background Colors - CHANGE THESE
    background: '#FFFFFF',        // Main page background
    surface: '#F8F9FA',           // Cards, panels, surfaces
    surfaceHover: '#E9ECEF',      // Hover states
    
    // Text Colors - CHANGE THESE
    textPrimary: '#212529',       // Main text (almost black)
    textSecondary: '#6C757D',     // Secondary text (grey)
    textOnPrimary: '#FFFFFF',     // Text on blue backgrounds
  }
}
```

## Theme Structure

### Files Overview
- `theme.ts` - **Main configuration file** - Edit this to change colors
- `ThemeProvider.tsx` - Theme system provider (don't modify)
- `README.md` - This documentation file

### Color Scheme Examples

#### Current: Black, White, Blue
```typescript
primary: '#0066CC',           // Professional blue
background: '#FFFFFF',        // Clean white
textPrimary: '#212529',       // Almost black
```

#### Alternative: Dark Theme
```typescript
primary: '#0066CC',           // Keep blue
background: '#1A1A1A',        // Dark background
surface: '#2D2D2D',           // Dark surfaces
textPrimary: '#FFFFFF',       // White text
textSecondary: '#B0B0B0',     // Light grey text
```

#### Alternative: Corporate Theme
```typescript
primary: '#003366',           // Navy blue
primaryLight: '#0066CC',      // Bright blue
background: '#F5F5F5',        // Light grey background
surface: '#FFFFFF',           // Pure white surfaces
```

## Customization Options

### 1. Colors
Edit the `colors` object in `theme.ts`:
- **Primary colors**: Main brand colors for buttons, links, accents
- **Background colors**: Page and surface backgrounds
- **Text colors**: All text colors throughout the app
- **Border colors**: Lines, dividers, card borders
- **Status colors**: Success, warning, error, info states

### 2. Spacing
Control spacing throughout the app:
```typescript
spacing: {
  xs: '4px',     // Tiny gaps
  sm: '8px',     // Small gaps
  md: '16px',    // Medium gaps (default)
  lg: '24px',    // Large gaps
  xl: '32px',    // Extra large gaps
  xxl: '48px',   // Huge gaps
}
```

### 3. Shadows
Modify shadow depth and style:
```typescript
shadows: {
  small: '0 1px 3px rgba(0, 0, 0, 0.12)',   // Subtle shadow
  medium: '0 3px 6px rgba(0, 0, 0, 0.15)',  // Card shadow
  large: '0 10px 20px rgba(0, 0, 0, 0.15)', // Modal shadow
}
```

### 4. Border Radius
Control roundedness of elements:
```typescript
borderRadius: {
  small: '4px',   // Subtle rounding
  medium: '8px',  // Standard rounding
  large: '12px',  // More rounded
}
```

## Logo Customization

The TeleTwin logo automatically adapts to your theme colors. The logo uses:
- `theme.colors.primary` for the first circle and "Tele" text
- `theme.colors.primaryDark` for the second circle
- `theme.colors.textPrimary` for "Twin" text

## CSS Custom Properties

The theme system automatically generates CSS custom properties that you can use in custom styles:

```css
/* These are automatically generated from your theme */
:root {
  --color-primary: #0066CC;
  --color-background: #FFFFFF;
  --color-text-primary: #212529;
  /* ... and many more */
}

/* Use them in your custom CSS */
.my-custom-element {
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-medium);
  box-shadow: var(--shadow-medium);
}
```

## Pre-built CSS Classes

The theme system includes utility classes you can use:

### Buttons
- `.teletwin-button-primary` - Primary blue button
- `.teletwin-button-secondary` - Secondary outlined button

### Cards
- `.teletwin-card` - Basic card with border and shadow
- `.teletwin-card-interactive` - Hover effects for clickable cards

### Backgrounds
- `.teletwin-bg-primary` - Primary blue background
- `.teletwin-bg-surface` - Surface background color
- `.teletwin-bg-background` - Main background color

### Text
- `.teletwin-text-primary` - Primary text color
- `.teletwin-text-secondary` - Secondary text color
- `.teletwin-text-on-primary` - Text for blue backgrounds

### Shadows & Borders
- `.teletwin-shadow-small/medium/large` - Different shadow depths
- `.teletwin-border` - Standard border
- `.teletwin-rounded-sm/md/lg` - Border radius options

## Quick Theme Presets

Here are some ready-to-use color schemes. Replace the colors section in `theme.ts`:

### Professional Corporate
```typescript
colors: {
  primary: '#003366',
  primaryLight: '#0066CC', 
  primaryDark: '#002244',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceHover: '#E9ECEF',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  textOnPrimary: '#FFFFFF',
  // ... rest stays the same
}
```

### Modern Tech
```typescript
colors: {
  primary: '#0080FF',
  primaryLight: '#40A0FF',
  primaryDark: '#0060CC',
  background: '#FAFBFC',
  surface: '#FFFFFF',
  surfaceHover: '#F1F3F4',
  textPrimary: '#1A1A1A',
  textSecondary: '#5F6368',
  textOnPrimary: '#FFFFFF',
  // ... rest stays the same
}
```

## Need Help?

1. **Start with colors**: Most visual changes come from updating the color palette
2. **Test changes**: Save `theme.ts` and see changes instantly in the running app
3. **Use browser dev tools**: Inspect elements to see which CSS custom properties they use
4. **Keep contrast**: Ensure text remains readable on backgrounds

## File Locations

- **Main theme file**: `src/frontend/theme/theme.ts`
- **Logo component**: `src/frontend/components/TeleTwinLogo.tsx`
- **Theme provider**: `src/frontend/theme/ThemeProvider.tsx`

Happy theming! 🎨