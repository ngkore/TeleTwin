/*---------------------------------------------------------------------------------------------
 * TeleTwin Logo Component
 * Configurable logo that adapts to the current theme
 * Colors are controlled by the theme system
 *--------------------------------------------------------------------------------------------*/

import React from 'react';
import { theme } from '../theme/theme';

interface TeleTwinLogoProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'full' | 'compact' | 'icon-only';
  className?: string;
}

export const TeleTwinLogo: React.FC<TeleTwinLogoProps> = ({
  size = 'medium',
  variant = 'full',
  className = ''
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      iconSize: 32,
      circleSize: 12,
      fontSize: 18,
      gap: 8,
    },
    medium: {
      iconSize: 48,
      circleSize: 18,
      fontSize: 24,
      gap: 12,
    },
    large: {
      iconSize: 64,
      circleSize: 24,
      fontSize: 32,
      gap: 16,
    },
  };

  const config = sizeConfig[size];

  const logoIconStyle: React.CSSProperties = {
    position: 'relative',
    width: config.iconSize,
    height: config.iconSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: variant === 'icon-only' ? 0 : config.gap,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const textStyle: React.CSSProperties = {
    fontSize: config.fontSize,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    color: theme.colors.textPrimary,
  };

  const teleStyle: React.CSSProperties = {
    color: theme.colors.primary,
  };

  const twinStyle: React.CSSProperties = {
    color: theme.colors.textPrimary,
  };

  // Circle styles with theme colors
  const circleBaseStyle: React.CSSProperties = {
    position: 'absolute',
    width: config.circleSize,
    height: config.circleSize,
    borderRadius: '50%',
    border: `2px solid`,
  };

  const circle1Style: React.CSSProperties = {
    ...circleBaseStyle,
    top: 6,
    left: 6,
    borderColor: theme.colors.primary,
    animation: 'pulse1 2s ease-in-out infinite',
  };

  const circle2Style: React.CSSProperties = {
    ...circleBaseStyle,
    top: 6,
    right: 6,
    borderColor: theme.colors.primaryDark,
    animation: 'pulse2 2s ease-in-out infinite',
  };

  const connectionLineStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '25%',
    right: '25%',
    height: 2,
    background: `linear-gradient(90deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
    transform: 'translateY(-50%)',
    animation: 'flow 1.5s ease-in-out infinite',
  };

  // Animation keyframes (inject into head if not already present)
  React.useEffect(() => {
    const styleId = 'teletwin-logo-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes pulse1 {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes pulse2 {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes flow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const renderIcon = () => (
    <div style={logoIconStyle}>
      <div style={circle1Style} />
      <div style={circle2Style} />
      <div style={connectionLineStyle} />
    </div>
  );

  const renderText = () => {
    if (variant === 'icon-only') return null;
    
    return (
      <div style={textStyle}>
        <span style={teleStyle}>Tele</span>
        <span style={twinStyle}>Twin</span>
      </div>
    );
  };

  return (
    <div className={className} style={containerStyle}>
      {renderIcon()}
      {renderText()}
    </div>
  );
};

// Compact version for headers
export const TeleTwinLogoCompact: React.FC<{ className?: string }> = ({ className }) => (
  <TeleTwinLogo size="small" variant="compact" className={className} />
);

// Icon only version
export const TeleTwinLogoIcon: React.FC<{ className?: string; size?: 'small' | 'medium' | 'large' }> = ({ 
  className, 
  size = 'medium' 
}) => (
  <TeleTwinLogo size={size} variant="icon-only" className={className} />
);