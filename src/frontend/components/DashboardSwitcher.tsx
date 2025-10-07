/*---------------------------------------------------------------------------------------------
 * Dashboard Switcher
 *
 * Side panel with buttons to switch between different dashboard views
 * Controls which widgets are visible based on selected dashboard mode
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useCallback } from 'react';
import { UiFramework, StagePanelLocation } from '@itwin/appui-react';
import { Home, Radio, BarChart3, Rotate3D } from "lucide-react"


export type DashboardMode = 'home' | 'telemetry' | 'analysis' | 'simulation';

interface DashboardSwitcherProps {
  onModeChange?: (mode: DashboardMode) => void;
}

export const DashboardSwitcher: React.FC<DashboardSwitcherProps> = ({ onModeChange }) => {
  const [activeMode, setActiveMode] = useState<DashboardMode>('home');

  const switchDashboard = useCallback(async (mode: DashboardMode) => {
    console.log(`[DashboardSwitcher] 🎯 Switching to ${mode} dashboard...`);

    setActiveMode(mode);

    // Close all widgets first
    const frontstageProvider = UiFramework.frontstages.activeFrontstageDef;
    if (!frontstageProvider) {
      console.warn('[DashboardSwitcher] No active frontstage found');
      return;
    }

    // Get all widget IDs
    const allWidgets = [
      // Home widgets
      'HierarchyWidget',
      'PropertiesWidget',
      // 'MetadataWidget',

      // Telemetry widgets
      'IoTTelemetryWidget',
      'IoTDataWidget',
      'TelemetryGraphWidget',

      // Analysis widgets
      'StructuralAnalysisWidget',
      'StructuralResultsWidget',
      'SimulationComparisonWidget',
    ];

    // Close all widgets
    try {
      for (const widgetId of allWidgets) {
        try {
          await UiFramework.frontstages.setWidgetState(widgetId, 2); // 2 = Hidden
        } catch (error) {
          // Widget might not exist, ignore
        }
      }

      // Small delay to ensure widgets are closed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Open widgets based on mode
      let widgetsToOpen: string[] = [];

      switch (mode) {
        case 'home':
          widgetsToOpen = [
            'HierarchyWidget',
            'PropertiesWidget',
            // 'MetadataWidget',
          ];
          break;

        case 'telemetry':
          widgetsToOpen = [
            'IoTTelemetryWidget',
            'IoTDataWidget',
            'TelemetryGraphWidget',
          ];
          break;

        case 'analysis':
          widgetsToOpen = [
            'StructuralAnalysisWidget',
            'StructuralResultsWidget',
          ];
          break;

        case 'simulation':
          widgetsToOpen = [
            'StructuralAnalysisWidget',
            'StructuralResultsWidget',
            'SimulationComparisonWidget',
          ];
          break;
      }

      // Open selected widgets in their designated locations
      for (const widgetId of widgetsToOpen) {
        try {
          // Determine the target location for each widget
          let targetLocation: StagePanelLocation | undefined = undefined;

          // Telemetry widgets
          if (widgetId === 'IoTTelemetryWidget') {
            targetLocation = StagePanelLocation.Left;
          } else if (widgetId === 'IoTDataWidget') {
            targetLocation = StagePanelLocation.Right;
          } else if (widgetId === 'TelemetryGraphWidget') {
            targetLocation = StagePanelLocation.Bottom;
          }
          // Home widgets
          else if (widgetId === 'HierarchyWidget') {
            targetLocation = StagePanelLocation.Left;
          } else if (widgetId === 'PropertiesWidget') {
            targetLocation = StagePanelLocation.Right;
          }
          // Analysis widgets
          else if (widgetId === 'StructuralAnalysisWidget') {
            targetLocation = StagePanelLocation.Left;
          } else if (widgetId === 'StructuralResultsWidget') {
            targetLocation = StagePanelLocation.Right;
          } else if (widgetId === 'SimulationComparisonWidget') {
            targetLocation = StagePanelLocation.Bottom;
          }

          // If widget needs to be moved to a specific location
          if (targetLocation !== undefined) {
            await UiFramework.frontstages.setWidgetState(widgetId, 1);
          } else {
            await UiFramework.frontstages.setWidgetState(widgetId, 1);
          }
        } catch (error) {
          console.warn(`[DashboardSwitcher] Could not open widget: ${widgetId}`, error);
        }
      }

      console.log(`[DashboardSwitcher] ✅ Switched to ${mode} dashboard`);
      onModeChange?.(mode);

    } catch (error) {
      console.error('[DashboardSwitcher] Error switching dashboard:', error);
    }
  }, [onModeChange]);

  const buttonStyle = (mode: DashboardMode) => ({
    width: '50px',
    height: '50px',
    marginBottom: '10px',
    backgroundColor: activeMode === mode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
    border: activeMode === mode ? '2px solid #10B981' : '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    color: activeMode === mode ? '#10B981' : '#9CA3AF',
    fontWeight: activeMode === mode ? '700' : '500',
    fontSize: '10px',
    textAlign: 'center' as const,
    padding: '4px',
  });

  const iconStyle = {
    fontSize: '20px',
    marginBottom: '2px',
  };

  // switchDashboard('home');

  return (
    <div style={{
      position: 'fixed',
      left: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px',
      backgroundColor: 'rgba(13, 17, 23, 0.95)',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      {/* Home Button */}
      <button
        onClick={() => switchDashboard('home')}
        style={buttonStyle('home')}
        title="Home Dashboard"
        onMouseEnter={(e) => {
          if (activeMode !== 'home') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (activeMode !== 'home') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
      >
        {/* <div style={iconStyle}>🏠</div> */}
        <Home size={18} strokeWidth={2} />
        {/* <div>Home</div> */}
      </button>

      {/* Telemetry Button */}
      <button
        onClick={() => switchDashboard('telemetry')}
        style={buttonStyle('telemetry')}
        title="Telemetry Dashboard"
        onMouseEnter={(e) => {
          if (activeMode !== 'telemetry') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (activeMode !== 'telemetry') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
      >
        {/* <div style={iconStyle}>📡</div>
        <div>IoT</div> */}
        <Radio size={18} strokeWidth={2} />

      </button>

      {/* Analysis Button */}
      <button
        onClick={() => switchDashboard('analysis')}
        style={buttonStyle('analysis')}
        title="Structural Analysis Dashboard"
        onMouseEnter={(e) => {
          if (activeMode !== 'analysis') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (activeMode !== 'analysis') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
      >
        {/* <div style={iconStyle}>📊</div>
        <div>Analysis</div> */}

        <BarChart3 size={18} strokeWidth={2} />

      </button>

      {/* Simulation Button */}
      <button
        onClick={() => switchDashboard('simulation')}
        style={buttonStyle('simulation')}
        title="Simulation Dashboard"
        onMouseEnter={(e) => {
          if (activeMode !== 'simulation') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (activeMode !== 'simulation') {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          }
        }}
      >
        {/* <div style={iconStyle}>📊</div>
        <div>Simulation</div> */}
        <Rotate3D size={18} strokeWidth={2} />

      </button>

      {/* Mode Indicator */}
      <div style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '8px',
        color: '#6B7280',
        textAlign: 'center',
        width: '100%',
      }}>
        {activeMode === 'home' && 'MODEL VIEW'}
        {activeMode === 'telemetry' && 'IOT DATA'}
        {activeMode === 'analysis' && 'STRUCTURAL'}
      </div>
    </div>
  );
};
