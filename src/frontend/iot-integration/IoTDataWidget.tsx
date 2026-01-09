/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/



/*---------------------------------------------------------------------------------------------
 * IoT Telemetry Data Widget
 *
 * Displays detailed telemetry data for selected equipment from the 3D model.
 * Retrieves real-time data from the IoT Integration Manager which manages telemetry
 * synchronization with the IoT simulator. This widget automatically updates when
 * telemetry data is refreshed by the IoT Telemetry widget.
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
import { Button, Table, ProgressLinear, Alert } from "@itwin/itwinui-react";
import { Presentation } from "@itwin/presentation-frontend";
import { IoTIntegrationManager } from './IoTIntegrationManager';
import { TooltipTelemetryData, iTwinPropertyUpdate, SyncStatus } from './types';

interface TelemetryDataRow {
  category: string;
  parameter: string;
  value: string;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
}

interface SelectedEquipment {
  elementId: string;
  displayLabel: string;
  category: string;
  isIoTEnabled: boolean;
}

interface TelemetryStatistics {
  totalParameters: number;
  lastUpdate: string;
  normalCount: number;
  warningCount: number;
  criticalCount: number;
  dataAge: string;
}

const IoTDataWidget: React.FC = () => {
  const iModelConnection = useActiveIModelConnection();
  const [manager] = useState(() => IoTIntegrationManager.getInstance());
  const [selectedEquipment, setSelectedEquipment] = useState<SelectedEquipment | null>(null);
  const [telemetryData, setTelemetryData] = useState<TelemetryDataRow[]>([]);
  const [rawTelemetry, setRawTelemetry] = useState<TooltipTelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [statistics, setStatistics] = useState<TelemetryStatistics>({
    totalParameters: 0,
    lastUpdate: '',
    normalCount: 0,
    warningCount: 0,
    criticalCount: 0,
    dataAge: ''
  });
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isIoTActive, setIsIoTActive] = useState<boolean>(false);

  /**
   * Fetch telemetry data for selected equipment from IoT Integration Manager
   */
  const fetchTelemetryForEquipment = useCallback(async (elementId: string, displayLabel: string) => {
    if (!elementId) return;

    setIsLoading(true);
    setError('');

    try {
      // Get telemetry data from IoT Integration Manager
      const telemetryInfo = manager.getTelemetryForElement(elementId);

      if (!telemetryInfo) {
        throw new Error('No telemetry data available for this equipment');
      }

      setRawTelemetry(telemetryInfo);

      // Convert telemetry to display format
      const telemetryRows = processTelemetryData(telemetryInfo);
      setTelemetryData(telemetryRows);

      // Update statistics
      updateStatistics(telemetryRows, telemetryInfo.lastUpdate || new Date().toISOString());

    } catch (err) {
      console.warn('Could not fetch telemetry data:', err);
      
      
      setError('Unable to fetch telemetry data. Make sure IoT data collection is active in the IoT Telemetry widget.');
      setTelemetryData([]);
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  /**
   * Listen for telemetry updates from IoT Integration Manager
   */
  useEffect(() => {
    const updateListener = (updates: iTwinPropertyUpdate[]) => {
      // If we have a selected equipment, refresh its telemetry data
      if (selectedEquipment && selectedEquipment.isIoTEnabled) {
        const telemetryInfo = manager.getTelemetryForElement(selectedEquipment.elementId);
        if (telemetryInfo) {
          setRawTelemetry(telemetryInfo);
          const telemetryRows = processTelemetryData(telemetryInfo);
          setTelemetryData(telemetryRows);
          updateStatistics(telemetryRows, telemetryInfo.lastUpdate || new Date().toISOString());
        }
      }
    };

    const statusListener = (status: SyncStatus) => {
      setIsIoTActive(status.isRunning);
    };

    manager.addUpdateListener(updateListener);
    manager.addStatusListener(statusListener);

    // Initial status
    setIsIoTActive(manager.getSyncStatus()?.isRunning || false);

    return () => {
      manager.removeUpdateListener(updateListener);
      manager.removeStatusListener(statusListener);
    };
  }, [manager, selectedEquipment]);

  /**
   * Handle iTwin model selection changes
   */
  useEffect(() => {
    if (!iModelConnection) return;

    const handleSelectionChange = async () => {
      try {
        const selection = Presentation.selection.getSelection(iModelConnection);

        if (selection.isEmpty) {
          setSelectedEquipment(null);
          setTelemetryData([]);
          setError('');
          return;
        }

        // Get the first selected element
        const instanceKeysIterator = selection.instanceKeys.values();
        const firstInstanceKeys = instanceKeysIterator.next().value;
        if (!firstInstanceKeys || firstInstanceKeys.size === 0) return;

        // Get the first element ID from the set
        const elementId = Array.from(firstInstanceKeys)[0];

        // Query element details
        const query = `
          SELECT ECInstanceId, UserLabel, CodeValue
          FROM BisCore.Element
          WHERE ECInstanceId = ${elementId}
        `;

        const result = iModelConnection.createQueryReader(query);
        for await (const row of result) {
          const displayLabel = row.userLabel || row.codeValue || `Element_${elementId}`;

          // Check if this is IoT equipment (has VF- prefix)
          const isIoTEquipment = displayLabel.match(/^VF-(ANT|RRU|MW)-\d{3}-/);

          if (isIoTEquipment) {
            const category = displayLabel.startsWith('VF-ANT-') ? 'Antenna' :
                           displayLabel.startsWith('VF-RRU-') ? 'RRU' :
                           displayLabel.startsWith('VF-MW-') ? 'Microlink' : 'Unknown';

            setSelectedEquipment({
              elementId: elementId,
              displayLabel: displayLabel,
              category: category,
              isIoTEnabled: true
            });

            // Fetch telemetry data for this equipment
            await fetchTelemetryForEquipment(elementId, displayLabel);
          } else {
            setSelectedEquipment({
              elementId: elementId,
              displayLabel: displayLabel,
              category: 'Other',
              isIoTEnabled: false
            });
            setTelemetryData([]);
            setError('Selected element is not IoT-enabled equipment. Please select equipment with VF- prefix.');
          }
          break;
        }

      } catch (err) {
        console.error('Error handling selection change:', err);
        setError('Failed to process element selection');
      }
    };

    // Listen to selection changes
    const removeListener = Presentation.selection.selectionChange.addListener((evt) => {
      if (evt.imodel === iModelConnection) {
        handleSelectionChange();
      }
    });

    // Initial check
    handleSelectionChange();

    return removeListener;
  }, [iModelConnection, fetchTelemetryForEquipment]);

  /**
   * Process raw telemetry into categorized display format
   */
  const processTelemetryData = (telemetry: TooltipTelemetryData): TelemetryDataRow[] => {
    const rows: TelemetryDataRow[] = [];

    // Environmental parameters
    if (telemetry.temperature !== undefined) {
      rows.push({
        category: 'Environmental',
        parameter: 'Temperature',
        value: telemetry.temperature.toFixed(1),
        unit: '°C',
        status: getTemperatureStatus(telemetry.temperature)
      });
    }

    // Power parameters
    if (telemetry.powerConsumption !== undefined) {
      rows.push({
        category: 'Power',
        parameter: 'Power Consumption',
        value: telemetry.powerConsumption.toFixed(1),
        unit: 'W',
        status: getPowerStatus(telemetry.powerConsumption)
      });
    }

    // Signal parameters
    if (telemetry.signalStrength !== undefined) {
      rows.push({
        category: 'Signal',
        parameter: 'Signal Strength',
        value: telemetry.signalStrength.toFixed(1),
        unit: 'dBm',
        status: getSignalStatus(telemetry.signalStrength)
      });
    }

    // Status parameters
    if (telemetry.healthScore !== undefined) {
      rows.push({
        category: 'Status',
        parameter: 'Health Score',
        value: telemetry.healthScore.toFixed(0),
        unit: '%',
        status: telemetry.healthScore >= 90 ? 'normal' : telemetry.healthScore >= 70 ? 'warning' : 'critical'
      });
    }

    // Equipment Info
    if (telemetry.vendor) {
      rows.push({
        category: 'Equipment',
        parameter: 'Vendor',
        value: telemetry.vendor,
        unit: '',
        status: 'normal'
      });
    }

    if (telemetry.model) {
      rows.push({
        category: 'Equipment',
        parameter: 'Model',
        value: telemetry.model,
        unit: '',
        status: 'normal'
      });
    }

    if (telemetry.platform !== undefined) {
      rows.push({
        category: 'Equipment',
        parameter: 'Platform',
        value: telemetry.platform.toString(),
        unit: '',
        status: 'normal'
      });
    }

    if (telemetry.sector) {
      rows.push({
        category: 'Equipment',
        parameter: 'Sector',
        value: telemetry.sector,
        unit: '',
        status: 'normal'
      });
    }

    if (telemetry.status) {
      rows.push({
        category: 'Status',
        parameter: 'Operational Status',
        value: telemetry.status,
        unit: '',
        status: telemetry.status === 'OPERATIONAL' ? 'normal' : telemetry.status === 'DEGRADED' ? 'warning' : 'critical'
      });
    }

    return rows;
  };

  /**
   * Status evaluation functions
   */
  const getTemperatureStatus = (temp: number): 'normal' | 'warning' | 'critical' => {
    if (temp > 45) return 'critical';
    if (temp > 35) return 'warning';
    return 'normal';
  };

  const getPowerStatus = (power: number): 'normal' | 'warning' | 'critical' => {
    if (power > 300) return 'critical';
    if (power > 250) return 'warning';
    return 'normal';
  };

  const getSignalStatus = (signal: number): 'normal' | 'warning' | 'critical' => {
    if (signal < -90) return 'critical';
    if (signal < -80) return 'warning';
    return 'normal';
  };

  /**
   * Update telemetry statistics
   */
  const updateStatistics = (rows: TelemetryDataRow[], lastUpdate: string) => {
    const normalCount = rows.filter(r => r.status === 'normal').length;
    const warningCount = rows.filter(r => r.status === 'warning').length;
    const criticalCount = rows.filter(r => r.status === 'critical').length;

    const updateTime = new Date(lastUpdate);
    const now = new Date();
    const ageMinutes = Math.floor((now.getTime() - updateTime.getTime()) / 60000);

    setStatistics({
      totalParameters: rows.length,
      lastUpdate: updateTime.toLocaleTimeString(),
      normalCount,
      warningCount,
      criticalCount,
      dataAge: ageMinutes < 1 ? 'Just now' : `${ageMinutes}m ago`
    });
  };

  /**
   * Manual refresh handler
   */
  const handleManualRefresh = useCallback(() => {
    if (selectedEquipment && selectedEquipment.isIoTEnabled) {
      fetchTelemetryForEquipment(selectedEquipment.elementId, selectedEquipment.displayLabel);
    }
  }, [selectedEquipment, fetchTelemetryForEquipment]);

  /**
   * Get status color
   */
  const getStatusColorForDisplay = (status: 'normal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'normal': return '#2e7d32';
      case 'warning': return '#ed6c02';
      case 'critical': return '#d32f2f';
      default: return '#757575';
    }
  };

  /**
   * Render statistics summary
   */
  const renderStatistics = () => {
    if (statistics.totalParameters === 0) return null;

    return (
      <div 
      style={{
        marginBottom: '16px',
        padding: '12px',
        color: '#9CA3AF',
        fontSize: '13px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)'
      }}>
        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
          Telemetry Statistics
        </h5>
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <div>Parameters: <strong>{statistics.totalParameters}</strong></div>
          <div>Last Update: <strong>{statistics.lastUpdate}</strong> ({statistics.dataAge})</div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>
              <span style={{ color: '#2e7d32', fontSize: '14px' }}>●</span> Normal: <strong>{statistics.normalCount}</strong>
            </span>
            <span>
              <span style={{ color: '#ed6c02', fontSize: '14px' }}>●</span> Warning: <strong>{statistics.warningCount}</strong>
            </span>
            <span>
              <span style={{ color: '#d32f2f', fontSize: '14px' }}>●</span> Critical: <strong>{statistics.criticalCount}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Render categorized telemetry table
   */
  const renderTelemetryTable = () => {
  if (telemetryData.length === 0) return null;

  const categories = Array.from(new Set(telemetryData.map(row => row.category)));

  return (
    <div style={{ marginBottom: '20px', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Section Title */}
      <h5
        style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: 600,
          color: '#58A6FF',
          borderBottom: '1px solid #30363D',
          paddingBottom: '6px'
        }}
      >
        Live Telemetry Data
      </h5>

      {categories.map(category => (
        <div key={category} style={{ marginBottom: '20px' }}>
          {/* Category Header */}
          <h6
            style={{
              margin: '0 0 10px 0',
              color: '#58A6FF',
              fontSize: '14px',
              fontWeight: 600,
              borderBottom: '1px solid #21262D',
              paddingBottom: '4px'
            }}
          >
            {category}
          </h6>

          {/* Table */}
          <Table
            data={telemetryData
              .filter(row => row.category === category)
              .map((row, index) => ({
                id: `${category}-${index}`,
                parameter: row.parameter,
                value: `${row.value} ${row.unit}`,
                status: row.status,
                statusColor: getStatusColorForDisplay(row.status)
              }))}
            columns={[
              {
                Header: 'Parameter',
                accessor: 'parameter' as any,
                width: 160,
                Cell: ({ value }: any) => (
                  <span style={{ fontSize: '13px', color: '#C9D1D9', fontWeight: 600 }}>
                    {value}
                  </span>
                )
              },
              {
                Header: 'Value',
                accessor: 'value' as any,
                width: 120,
                Cell: ({ value }: any) => (
                  <span style={{ fontSize: '13px', color: '#E6EDF3' }}>{value}</span>
                )
              },
              {
                Header: 'Status',
                accessor: 'status' as any,
                width: 100,
                Cell: ({ value, row }: any) => (
                  <div
                    style={{
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      backgroundColor: row.original.statusColor,
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      display: 'inline-block',
                      minWidth: '70px'
                    }}
                  >
                    {value}
                  </div>
                )
              }
            ]}
            density="condensed"
            style={{ fontSize: '13px', backgroundColor: 'transparent', color: '#E6EDF3' }}
            emptyTableContent="No data available"
          />
        </div>
      ))}
    </div>
  );
};


  return (
    <div style={{ padding: '20px', height: '100%', overflowY: 'auto', color: '#EAEAEA' }}>
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
            title={isIoTActive ? 'Active' : 'Inactive'}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isIoTActive ? '#10B981' : '#EF4444',
              boxShadow: isIoTActive ? '0 0 8px #10B981' : '0 0 8px #EF4444',
              animation: isIoTActive ? 'pulse 2s infinite' : 'none',
            }}
          ></span>


          Telemetry Data

        </h3>
        <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
          Real-time sensor readings from IoT simulator
        </div>
      </div>

      {isLoading && (
        <div style={{ marginBottom: '12px' }}>
          <ProgressLinear indeterminate />
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: 'rgba(197, 34, 34, 0.15)',
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#e65454ff',
          border: '1px solid rgba(197, 34, 34, 0.3)',
          fontWeight: '500',
          marginBottom: '12px'
        }}>
          {error}
        </div>
      )}

      {/* Selected Equipment Information */}
      {!selectedEquipment ? (
  // Case 1: Nothing selected
  <div
    style={{
      textAlign: 'center',
      padding: '20px',
      color: '#9CA3AF',
      fontSize: '13px',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      backgroundColor: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)'
    }}
  >
    Select an element to view telemetry data.
  </div>
) : (
  <>
    {!selectedEquipment.isIoTEnabled ? (
      // Case 2: Selected but NOT IoT enabled
      <div
        
        style={{
        marginBottom: '16px',
        padding: '12px',
        color: '#9CA3AF',
        fontSize: '13px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)'
      }}
      >
        <div
          style={{
            fontWeight: '600',
            fontSize: '15px',
            marginBottom: '4px',  
            color: "white"
          }}
        >
          {selectedEquipment.displayLabel.toUpperCase()}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: '#666',
            marginBottom: '8px'
          }}
        >
          Category: {selectedEquipment.category}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#d84315',
            fontWeight: '500'
          }}
        >
          🔴 Not IoT-enabled equipment
        </div>
      </div>
    ) : (
      // Case 3: Selected AND IoT enabled
      <>
        {telemetryData.length > 0 ? (
          // Case 3a: IoT enabled AND data available → Show telemetry
          <>
            {renderStatistics()}
            {renderTelemetryTable()}
          </>
        ) : (
          // Case 3b: IoT enabled BUT no data → Show message
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              color: '#9CA3AF',
              fontSize: '13px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div
              style={{
                fontWeight: '600',
                fontSize: '15px',
                marginBottom: '4px',
                color: 'white'
              }}
            >
              {selectedEquipment.displayLabel.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#666',
                marginBottom: '8px'
              }}
            >
              Category: {selectedEquipment.category}
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#2e7d32',
                fontWeight: '500'
              }}
            >
              🟢 IoT-enabled equipment
            </div>
            <div
              style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#FFA500',
                fontWeight: '500'
              }}
            >
            IoT data collection is not active. Start the IoT Telemetry sync to view live data.
            </div>
          </div>
        )}
      </>
    )}
  </>
)}
    </div>
  );
};

/**
 * Widget provider for registering with iTwin.js UI
 */
export class IoTDataWidgetProvider implements UiItemsProvider {
  public readonly id: string = "IoTDataWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Right) {
      widgets.push({
        id: "IoTDataWidget",
        label: "Equipment Data",
        defaultState: WidgetState.Closed,
        canPopout: true,
        allowedPanels: [StagePanelLocation.Right, StagePanelLocation.Left, StagePanelLocation.Bottom],
        priority: 210,
        content: <IoTDataWidget />
      });
    }
    return widgets;
  }
}