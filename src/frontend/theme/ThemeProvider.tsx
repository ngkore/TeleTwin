/*---------------------------------------------------------------------------------------------
 * Theme Provider Component
 * Applies global theme styles and provides theme context
 *--------------------------------------------------------------------------------------------*/

import React, { createContext, useContext, useEffect } from 'react';
import { theme, generateCSSVariables, type Theme } from './theme';

interface ThemeContextType {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType>({ theme });

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  useEffect(() => {
    // Inject CSS custom properties
    const styleId = 'teletwin-theme-variables';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = generateCSSVariables(theme);
    
    // Inject global styles
    const globalStyleId = 'teletwin-global-styles';
    let globalStyleElement = document.getElementById(globalStyleId) as HTMLStyleElement;
    
    if (!globalStyleElement) {
      globalStyleElement = document.createElement('style');
      globalStyleElement.id = globalStyleId;
      document.head.appendChild(globalStyleElement);
    }
    
    globalStyleElement.textContent = `
      /* Global theme styles */
      * {
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: var(--color-background);
        color: var(--color-text-primary);
        margin: 0;
        padding: 0;
        line-height: 1.5;
      }
      
      /* Scrollbar styles */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: var(--color-surface);
      }
      
      ::-webkit-scrollbar-thumb {
        background: var(--color-border-hover);
        border-radius: var(--border-radius-small);
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: var(--color-text-secondary);
      }
      
      /* Button base styles */
      .teletwin-button-primary {
        background-color: var(--color-primary);
        color: var(--color-text-on-primary);
        border: none;
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--border-radius-medium);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: var(--shadow-small);
      }
      
      .teletwin-button-primary:hover {
        background-color: var(--color-primary-dark);
        box-shadow: var(--shadow-medium);
        transform: translateY(-1px);
      }
      
      .teletwin-button-secondary {
        background-color: var(--color-surface);
        color: var(--color-text-primary);
        border: 1px solid var(--color-border);
        padding: var(--spacing-sm) var(--spacing-md);
        border-radius: var(--border-radius-medium);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .teletwin-button-secondary:hover {
        background-color: var(--color-surface-hover);
        border-color: var(--color-border-hover);
        transform: translateY(-1px);
      }
      
      /* Card styles */
      .teletwin-card {
        background-color: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-medium);
        box-shadow: var(--shadow-small);
        padding: var(--spacing-lg);
        transition: all 0.2s ease;
      }
      
      .teletwin-card:hover {
        box-shadow: var(--shadow-medium);
        border-color: var(--color-border-hover);
      }
      
      .teletwin-card-interactive {
        cursor: pointer;
      }
      
      .teletwin-card-interactive:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-large);
      }
      
      /* Header styles */
      .teletwin-header {
        background-color: var(--color-background);
        border-bottom: 1px solid var(--color-border);
        box-shadow: var(--shadow-small);
        z-index: 1000;
      }
      
      /* Input styles */
      .teletwin-input {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-medium);
        font-size: 14px;
        transition: all 0.2s ease;
        background-color: var(--color-background);
        color: var(--color-text-primary);
      }
      
      .teletwin-input:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
      }
      
      /* Text styles */
      .teletwin-text-primary {
        color: var(--color-text-primary);
      }
      
      .teletwin-text-secondary {
        color: var(--color-text-secondary);
      }
      
      .teletwin-text-on-primary {
        color: var(--color-text-on-primary);
      }
      
      /* Utility classes */
      .teletwin-shadow-small { box-shadow: var(--shadow-small); }
      .teletwin-shadow-medium { box-shadow: var(--shadow-medium); }
      .teletwin-shadow-large { box-shadow: var(--shadow-large); }
      
      .teletwin-bg-primary { background-color: var(--color-primary); }
      .teletwin-bg-surface { background-color: var(--color-surface); }
      .teletwin-bg-background { background-color: var(--color-background); }
      
      .teletwin-border { border: 1px solid var(--color-border); }
      .teletwin-border-hover { border: 1px solid var(--color-border-hover); }
      
      .teletwin-rounded-sm { border-radius: var(--border-radius-small); }
      .teletwin-rounded-md { border-radius: var(--border-radius-medium); }
      .teletwin-rounded-lg { border-radius: var(--border-radius-large); }
    `;
  }, []);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
};