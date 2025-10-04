/*---------------------------------------------------------------------------------------------
 * Viewport Header Component for TeleTwin
 * Modern header with navigation, tools, and branding for the 3D viewer
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  SvgHome, 
  SvgDownload,
} from "@itwin/itwinui-icons-react";
import { theme } from '../theme/theme';
import { TowerManager, TowerData } from '../../common/TowerManager';
import { LocationIcon, HeightIcon, SvgLatticeTower, Logo } from './icons';

interface ViewportHeaderProps {
  modelName?: string;
  onSaveScreenshot?: () => void;
  onToggleFullscreen?: () => void;
  onShowSettings?: () => void;
  onUploadCSV?: () => void;
  onUploadTowerCSV?: () => void;
  hasAutoLoadedFiles?: boolean; // New prop to indicate files are auto-loaded
  className?: string;
}

export const ViewportHeader: React.FC<ViewportHeaderProps> = ({
  modelName = 'Untitled Model',
  onToggleFullscreen,
  className = ''
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [towerData, setTowerData] = useState<TowerData[]>([]);
  const [selectedTowerIndex, setSelectedTowerIndex] = useState(0);

  useEffect(() => {
    const towerManager = TowerManager.getInstance();
    const updateTowers = (towers: TowerData[]) => {
      setTowerData(towers);
      // Reset selected index if it's out of bounds
      if (selectedTowerIndex >= towers.length) {
        setSelectedTowerIndex(0);
      }
    };
    
    towerManager.addListener(updateTowers);
    updateTowers(towerManager.getAllTowers());
    
    return () => {
      towerManager.removeListener(updateTowers);
    };
  }, [selectedTowerIndex]);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    onToggleFullscreen?.();
  };

  const currentTower = towerData.length > 0 ? towerData[selectedTowerIndex] : null;

  const generateTowerReport = () => {
    if (!currentTower) return;
    
    const reportContent = `
TOWER REPORT
============

Tower Name: ${currentTower.name}
Type: ${currentTower.type}
Height: ${currentTower.height}m
Coordinates: ${currentTower.latitude.toFixed(6)}, ${currentTower.longitude.toFixed(6)}
${currentTower.location ? `Location: ${currentTower.location}` : ''}
${currentTower.status ? `Status: ${currentTower.status}` : ''}
${currentTower.operator ? `Operator: ${currentTower.operator}` : ''}
${currentTower.installDate ? `Installation Date: ${currentTower.installDate}` : ''}
${currentTower.description ? `Description: ${currentTower.description}` : ''}

Generated on: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTower.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nextTower = () => {
    if (towerData.length > 1) {
      setSelectedTowerIndex((prev) => (prev + 1) % towerData.length);
    }
  };

  const prevTower = () => {
    if (towerData.length > 1) {
      setSelectedTowerIndex((prev) => (prev - 1 + towerData.length) % towerData.length);
    }
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: theme.colors.background,
    borderBottom: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.small,
    position: 'relative',
    zIndex: 1000,
    minHeight: '60px',
    height: '70px',
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.lg,
  };

  const centerSectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: '400px',
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  };

  const modelInfoStyle: React.CSSProperties = {
    textAlign: 'center',
  };

  const modelNameStyle: React.CSSProperties = {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: theme.colors.textPrimary,
    margin: 0,
    lineHeight: 1.2,
  };

  const breadcrumbStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: theme.colors.textSecondary,
    margin: 0,
    lineHeight: 1,
    marginTop: '2px',
  };

  const iconButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    backgroundColor: 'transparent',
    border: `1px solid transparent`,
    borderRadius: theme.borderRadius.medium,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: theme.colors.textSecondary,
    minWidth: '36px',
    height: '36px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...iconButtonStyle,
    backgroundColor: theme.colors.primary,
    color: theme.colors.textOnPrimary,
    fontWeight: 500,
    gap: theme.spacing.xs,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    minWidth: 'auto',
    border: `1px solid ${theme.colors.primary}`,
    opacity: 1,
  };

  const toolGroupStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.medium,
    border: `1px solid ${theme.colors.border}`,
  };

  const separatorStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    backgroundColor: theme.colors.border,
    margin: `0 ${theme.spacing.xs}`,
  };

  const IconButton: React.FC<{
    icon: React.ReactNode;
    onClick?: () => void;
    title: string;
    isActive?: boolean;
    variant?: 'default' | 'primary';
  }> = ({ icon, onClick, title, isActive, variant = 'default' }) => {
    const style = variant === 'primary' ? primaryButtonStyle : iconButtonStyle;
    
    return (
      <button
        style={{
          ...style,
          backgroundColor: isActive 
            ? theme.colors.primaryDark 
            : variant === 'primary' 
            ? theme.colors.primaryDark 
            : 'transparent',
          color: theme.colors.textPrimary, // Always white foreground
        }}
        onClick={onClick}
        title={title}
        onMouseEnter={(e) => {
          if (!isActive && variant !== 'primary') {
            e.currentTarget.style.backgroundColor = theme.colors.surface;
            e.currentTarget.style.borderColor = theme.colors.border;
            e.currentTarget.style.color = theme.colors.textPrimary; // Keep white
          } else if (variant === 'primary' || isActive) {
            e.currentTarget.style.backgroundColor = theme.colors.primary; // Hover to lighter primary
            e.currentTarget.style.color = theme.colors.textPrimary; // Keep white
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive && variant !== 'primary') {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = theme.colors.textPrimary; // Keep white
          } else if (variant === 'primary' || isActive) {
            e.currentTarget.style.backgroundColor = theme.colors.primaryDark; // Use primaryDark for primary buttons
            e.currentTarget.style.color = theme.colors.textPrimary; // Keep white
          }
        }}
      >
        {icon}
      </button>
    );
  };

  const BreadcrumbButton: React.FC<{ label: string; onClick?: () => void }> = ({ label, onClick }) => (
    <button
      style={{
        background: 'none',
        border: 'none',
        color: theme.colors.primary,
      cursor: 'pointer',
        fontSize: '0.8rem',
        textDecoration: 'underline',
        padding: 0,
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );

  const TowerInfoBar: React.FC = () => {
    if (!currentTower) return null;

    const infoBarStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.lg,
      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
      backgroundColor: theme.colors.surface,
      borderBottom: `1px solid ${theme.colors.border}`,
      fontSize: '0.9rem',
      color: theme.colors.textPrimary,
      justifyContent: 'flex-end',
    };

    const infoItemStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing.xs,
      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.small,
      border: `1px solid ${theme.colors.border}`,
    };

    const labelStyle: React.CSSProperties = {
      fontWeight: 600,
      color: theme.colors.textSecondary,
    };

    const valueStyle: React.CSSProperties = {
      color: theme.colors.textPrimary,
    };

    return (
      <div style={infoBarStyle}>
        {/* Tower navigation buttons */}
        {towerData.length > 1 && (
          <>
            <IconButton
              icon={<span style={{ fontSize: '14px' }}>◀</span>}
              onClick={prevTower}
              title="Previous Tower"
            />
            <div style={{ 
              ...infoItemStyle,
              backgroundColor: theme.colors.primary,
              color: theme.colors.textOnPrimary
            }}>
              <span style={{ fontSize: '12px' }}>
                {selectedTowerIndex + 1} of {towerData.length}
              </span>
            </div>
            <IconButton
              icon={<span style={{ fontSize: '14px' }}>▶</span>}
              onClick={nextTower}
              title="Next Tower"
            />
            <div style={separatorStyle} />
          </>
        )}

        <div style={infoItemStyle}>
          <span style={valueStyle}>{currentTower.name}</span>
        </div>
        
        <div style={infoItemStyle}>
          <SvgLatticeTower width="20" height="20"/>
          <span style={valueStyle}>{currentTower.type}</span>
        </div>
        
        <div style={infoItemStyle}>
          <HeightIcon />
          <span style={valueStyle}>{currentTower.height}m</span>
        </div>
        
        <div style={infoItemStyle}>
          <LocationIcon />
          <span style={valueStyle}>
            {currentTower.latitude.toFixed(6)}, {currentTower.longitude.toFixed(6)}
          </span>
        </div>
        
        <IconButton
          icon={<SvgDownload />}
          onClick={generateTowerReport}
          title="Download Tower Report"
          variant="primary"
        />
      </div>
    );
  };

  return (
    <div className={className}>
      <header style={headerStyle}>
        {/* Left Section - Logo & Navigation */}
        <div style={leftSectionStyle}>
          <Logo width={150}/>
          
          <div style={separatorStyle} />
          
          <IconButton
            icon={<SvgHome />}
            onClick={() => navigate('/')}
            title="Home"
          />
        </div>

        {/* Center Section - Model Info */}
        <div style={centerSectionStyle}>
          <div style={modelInfoStyle}>
            <h1 style={modelNameStyle}>{modelName}</h1>
            <p style={breadcrumbStyle}>
              <BreadcrumbButton label="Home" onClick={() => navigate('/')} />
              {' › '}
              <span>3D Viewer</span>
            </p>
          </div>
        </div>

        {/* Right Section - Tools & Actions */}
        <div style={rightSectionStyle}>
          {/* CSV Upload Buttons - Only show if files are not auto-loaded */}
          
              {/* <div style={toolGroupStyle}>
                <IconButton
                  icon={<SvgUpload />}
                  onClick={onUploadCSV}
                  title="Upload Metadata CSV"
                />
                <IconButton
                  icon={<SvgUpload />}
                  onClick={onUploadTowerCSV}
                  title="Upload Tower CSV"
                />
              </div> */}
              
              {/* <div style={separatorStyle} /> */}
          
          {/* Viewer Tools */}
          {/* <div style={toolGroupStyle}>
            <IconButton
              icon={<SvgMeasure />}
              title="Measurement Tools"
            />
            <IconButton
              icon={<SvgLayers />}
              title="Layers"
            />
            <IconButton
              icon={<SvgCamera />}
              onClick={onSaveScreenshot}
              title="Screenshot"
            />
          </div> */}
          
          {/* <div style={separatorStyle} /> */}
          
          {/* <IconButton
            icon={<SvgWindowFullScreen />}
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            isActive={isFullscreen}
          />
          
          <IconButton
            icon={<SvgSettings />}
            onClick={onShowSettings}
            title="Settings"
          />
          
          <IconButton
            icon={<SvgInfo />}
            title="Help"
          /> */}
        </div>
      </header>
      
      {/* Tower Information Bar */}
      <TowerInfoBar />
    </div>
  );
};