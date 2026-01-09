/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/



/*---------------------------------------------------------------------------------------------
 * IoT Integration Widget
 *
 * Provides user interface for controlling IoT telemetry synchronization and viewing
 * real-time equipment status. Features start/stop controls, element filtering, and
 * live telemetry data display with health indicators.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useCallback } from 'react';
import {
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
  useActiveIModelConnection,
  Widget,
  WidgetState,
} from "@itwin/appui-react";
import { Button, Alert } from "@itwin/itwinui-react";
import { IoTIntegrationManager } from './IoTIntegrationManager';
import { CustomTooltipProvider } from './CustomTooltipProvider';
import { TelemetryHistoryManager } from './TelemetryHistoryManager';
import { SyncStatus, TooltipTelemetryData } from './types';

const IoTWidget: React.FC = () => {
  const iModelConnection = useActiveIModelConnection();
  const [manager] = useState(() => IoTIntegrationManager.getInstance());
  const [tooltipProvider] = useState(() => CustomTooltipProvider.getInstance());
  const [historyManager] = useState(() => TelemetryHistoryManager.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | undefined>();
  const [telemetryData, setTelemetryData] = useState<TooltipTelemetryData[]>([]);
  const [error, setError] = useState<string>('');

  /**
   * Initialize IoT integration when iModel becomes available
   */
  useEffect(() => {
    const initializeIoT = async () => {
      if (!iModelConnection || isInitialized || isInitializing) {
        return;
      }

      setIsInitializing(true);
      setError('');

      try {
        await manager.initialize(iModelConnection);
        setIsInitialized(true);

        // Update telemetry data from manager
        setTelemetryData(manager.getAllTelemetry());

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setIsInitialized(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeIoT();
  }, [iModelConnection, manager, isInitialized, isInitializing]);

  /**
   * Listen for telemetry updates
   */
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const updateListener = () => {
      const allTelemetry = manager.getAllTelemetry();
      setTelemetryData(allTelemetry);

      // Update tooltip provider with latest telemetry data
      tooltipProvider.updateTelemetryData(allTelemetry);

      // Store telemetry in history for graphing
      historyManager.addReadings(allTelemetry);
    };

    const statusListener = (status: SyncStatus) => {
      setSyncStatus(status);

      // Update tooltip provider IoT active status
      tooltipProvider.setIoTActive(status.isRunning);
    };

    manager.addUpdateListener(updateListener);
    manager.addStatusListener(statusListener);

    // Initial status and data
    setSyncStatus(manager.getSyncStatus());
    const initialTelemetry = manager.getAllTelemetry();
    setTelemetryData(initialTelemetry);
    tooltipProvider.updateTelemetryData(initialTelemetry);
    tooltipProvider.setIoTActive(manager.getSyncStatus()?.isRunning || false);
    historyManager.addReadings(initialTelemetry);

    return () => {
      manager.removeUpdateListener(updateListener);
      manager.removeStatusListener(statusListener);
    };
  }, [isInitialized, manager, tooltipProvider, historyManager]);

  /**
   * Toggle synchronization on/off
   */
  const toggleSync = useCallback(async () => {
    if (!isInitialized) {
      return;
    }

    try {
      setError('');
      if (syncStatus?.isRunning) {
        manager.stopSync();
      } else {
        await manager.startSync();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync operation failed');
    }
  }, [isInitialized, manager, syncStatus]);

  /**
   * Trigger manual synchronization
   */
  const triggerManualSync = useCallback(async () => {
    if (!isInitialized) {
      return;
    }

    try {
      setError('');
      await manager.triggerManualSync();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Manual sync failed');
    }
  }, [isInitialized, manager]);

  /**
   * Get status color for UI indicators
   */
  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'OPERATIONAL': return '#2e7d32';
      case 'DEGRADED': return '#ed6c02';
      case 'ALARM': return '#d32f2f';
      case 'OVERHEATING': return '#c62828';
      case 'HIGH_POWER': return '#d84315';
      default: return '#757575';
    }
  };

  /**
   * Get health score color
   */
  const getHealthColor = (score?: number): string => {
    if (!score) return '#757575';
    if (score >= 90) return '#2e7d32';
    if (score >= 70) return '#689f38';
    if (score >= 50) return '#ed6c02';
    if (score >= 30) return '#d84315';
    return '#d32f2f';
  };

  // Loading state
  if (!isInitialized) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        {error ? (
          <Alert type="negative">{error}</Alert>
        ) : isInitializing ? (
          <div>
            <div style={{ marginBottom: '10px', fontWeight: '600' }}>
              Initializing IoT Integration...
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Extracting model elements and setting up telemetry sync
            </div>
          </div>
        ) : (
          <div style={{ color: '#666' }}>Waiting for model connection...</div>
        )}
      </div>
    );
  }

  const isRunning = syncStatus?.isRunning || false;

  return (
    <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', color: '#EAEAEA' }}>
  <style>
    {`
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.5;
          transform: scale(0.95);
        }
      }
    `}
  </style>
  {/* Header */}
  <div style={{ marginBottom: '16px' }}>

    <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span
        title={isRunning ? 'Active' : 'Inactive'}
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isRunning ? '#10B981' : '#EF4444',
          boxShadow: isRunning ? '0 0 8px #10B981' : '0 0 8px #EF4444',
          animation: isRunning ? 'pulse 2s infinite' : 'none',
        }}
      ></span>
      IoT Telemetry

    </h3>
    <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
      Real-time equipment monitoring
    </div>
  </div>

  {error && (
    <Alert type="negative" style={{ marginBottom: '12px', backgroundColor: '#F87171', color: 'white', borderRadius: '6px' }}>{error}</Alert>
  )}

  {/* Control Panel */}
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <Button
        style={{
          backgroundColor: isRunning ? '#DC2626' : '#22C55E',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          padding: '8px 16px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
        onClick={toggleSync}
        size="large"
      >
        {isRunning ? 'Stop Collection' : 'Start Collection'}
      </Button>

      <div style={{ fontSize: '13px', flex: 1 }}>
        Status:{' '}
        <span style={{
          color: isRunning ? '#22C55E' : '#F87171',
          fontWeight: '600'
        }}>
          {isRunning ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>

    {syncStatus && syncStatus.lastSync && (
      <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
        Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
        {' • '}
        Updates: {syncStatus.elementsUpdated}
        {' • '}
        Errors: {syncStatus.errorCount}
      </div>
    )}

    {isRunning && (
      <div style={{
        backgroundColor: 'rgba(34,197,94,0.15)',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#22C55E',
        border: '1px solid rgba(34,197,94,0.3)',
        fontWeight: '500'
      }}>
        Live telemetry collection active – Syncing every 15 seconds
      </div>
    )}
  </div>

  {/* Telemetry Data List */}
  <div style={{
    flex: 1,
    overflowY: 'auto',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
  }}>
    {telemetryData.length === 0 ? (
      <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
        {isRunning ? 'Waiting for telemetry data...' : 'Start data collection to see telemetry'}
      </div>
    ) : (
      telemetryData.map((data) => (
        <div
          key={data.elementId}
          style={{
            padding: '14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',   // text stays aligned at top
  gap: '12px'
}}>
  {/* Left: Label + Info */}
  <div style={{ flex: 1 }}>
    <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
      {data.displayLabel}
    </div>
    <div style={{ fontSize: '12px', color: '#aaa' }}>
      {data.vendor} {data.model} • Platform {data.platform} • Sector {data.sector}
    </div>
  </div>

  {/* Right: Status + Circle stacked */}
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',   // ✅ force right alignment
    gap: '16px',
    minWidth: '70px'
  }}>
    {data.status && (
      <div style={{
        padding: '4px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: '600',
        color: 'white',
        backgroundColor: getStatusColor(data.status),
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        textAlign: 'center',
        minWidth: '80px'
      }}>
        {data.status}
      </div>
    )}

    {data.healthScore !== undefined && (
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: `3px solid ${getHealthColor(data.healthScore)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: '700',
        color: getHealthColor(data.healthScore),
        backgroundColor: 'rgba(255,255,255,0.05)',
      }}>
        {data.healthScore.toFixed(0)}%
      </div>
    )}
  </div>



          </div>

          {(data.temperature || data.powerConsumption || data.signalStrength) && (
            <div style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#9CA3AF',
              display: 'flex',
              gap: '16px'
            }}>
              {data.temperature !== undefined && <span>🌡 Temp: {data.temperature.toFixed(1)}°C</span>}
              {data.powerConsumption !== undefined && <span>⚡ Power: {data.powerConsumption.toFixed(1)}W</span>}
              {data.signalStrength !== undefined && <span>📶 Signal: {data.signalStrength.toFixed(1)}dBm</span>}
            </div>
          )}

          {data.lastUpdate && (
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
              Last update: {new Date(data.lastUpdate).toLocaleTimeString()}
            </div>
          )}
        </div>
      ))
    )}
  </div>

    </div>
  );
};

/**
 * Widget provider for registering with iTwin.js UI
 */
export class IoTWidgetProvider implements UiItemsProvider {
  public readonly id: string = "IoTWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Left) {
      widgets.push({
        id: "IoTTelemetryWidget",
        label: "Telemetry Control",
        defaultState: WidgetState.Open,
        canPopout: false,
        priority: 150,
        content: <IoTWidget />
      });
    }
    return widgets;
  }
}
