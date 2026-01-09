/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------------
 * Theme Configuration for TeleTwin Application
 * Color Scheme: Dark Grey, White, and Blue
 * Easily configurable - modify colors here to change the entire app theme
 *--------------------------------------------------------------------------------------------*/

export interface Theme {
  colors: {
    // Primary Colors
    primary: string;        // Main blue color
    primaryLight: string;   // Lighter blue
    primaryDark: string;    // Darker blue
    
    // Neutral Colors
    background: string;     // Main background (white)
    surface: string;        // Card/surface backgrounds
    surfaceHover: string;   // Hover state for surfaces
    
    // Text Colors
    textPrimary: string;    // Main text (black/dark)
    textSecondary: string;  // Secondary text (grey)
    textOnPrimary: string;  // Text on blue backgrounds (white)
    
    // Border Colors
    border: string;         // Light borders
    borderHover: string;    // Hover state borders
    
    // Status Colors
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  shadows: {
    small: string;
    medium: string;
    large: string;
  };
  
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
}

// Main Theme Configuration - EDIT THESE COLORS TO CHANGE THE ENTIRE APP
export const theme: Theme = {
  colors: {
    // Primary Blue Palette
    primary: '#0970b7',           // Main blue
    primaryLight: '#9cc5fb',      // Light blue
    primaryDark: '#0970b7',       // Dark blue
    
    // Neutral Palette - Custom Dark Theme
    background: '#0d1117',        // Main dark background
    surface: '#192533',           // Panels and surfaces
    surfaceHover: 'rgba(20, 43, 66, 1)',      // Hover state (slightly lighter)
    
    // Text Colors
    textPrimary: '#EAEAEA',       // Light grey text for important content
    textSecondary: '#A1A1AA',     // Grey text for secondary content
    textOnPrimary: '#EAEAEA',     // Light text on blue backgrounds

    // Borders
    border: 'rgba(255, 255, 255, 0.08)',   // Subtle transparent border
    borderHover: 'rgba(255, 255, 255, 0.15)', // Lighter border on hover
    
    // Status Colors
    success: '#28a745',           // Green success
    warning: '#ffc107',           // Yellow warning
    error: '#dc3545',             // Red error
    info: '#7bb4f9',              // Blue info (same as primary)
  },
  
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    medium: '0 3px 6px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.12)',
    large: '0 10px 20px rgba(0, 0, 0, 0.15), 0 3px 6px rgba(0, 0, 0, 0.10)',
  },
  
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
};

// CSS Custom Properties Generator
export const generateCSSVariables = (theme: Theme): string => {
  return `
    :root {
      /* Colors */
      --color-primary: ${theme.colors.primary};
      --color-primary-light: ${theme.colors.primaryLight};
      --color-primary-dark: ${theme.colors.primaryDark};
      --color-background: ${theme.colors.background};
      --color-surface: ${theme.colors.surface};
      --color-surface-hover: ${theme.colors.surfaceHover};
      --color-text-primary: ${theme.colors.textPrimary};
      --color-text-secondary: ${theme.colors.textSecondary};
      --color-text-on-primary: ${theme.colors.textOnPrimary};
      --color-border: ${theme.colors.border};
      --color-border-hover: ${theme.colors.borderHover};
      --color-success: ${theme.colors.success};
      --color-warning: ${theme.colors.warning};
      --color-error: ${theme.colors.error};
      --color-info: ${theme.colors.info};
      
      /* Shadows */
      --shadow-small: ${theme.shadows.small};
      --shadow-medium: ${theme.shadows.medium};
      --shadow-large: ${theme.shadows.large};
      
      /* Border Radius */
      --border-radius-small: ${theme.borderRadius.small};
      --border-radius-medium: ${theme.borderRadius.medium};
      --border-radius-large: ${theme.borderRadius.large};
      
      /* Spacing */
      --spacing-xs: ${theme.spacing.xs};
      --spacing-sm: ${theme.spacing.sm};
      --spacing-md: ${theme.spacing.md};
      --spacing-lg: ${theme.spacing.lg};
      --spacing-xl: ${theme.spacing.xl};
      --spacing-xxl: ${theme.spacing.xxl};
    }
  `;
};