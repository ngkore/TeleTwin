/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/



/*---------------------------------------------------------------------------------------------
 * Telemetry Graph Dashboard Widget
 *
 * Professional dashboard displaying real-time graphs for telecom tower metrics.
 * Auto-selects equipment when clicked in 3D model and shows appropriate chart types
 * for each metric. Designed for bottom panel with horizontal layout.
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
import { Presentation } from "@itwin/presentation-frontend";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { IoTIntegrationManager } from './IoTIntegrationManager';
import { TelemetryHistoryManager, TelemetryHistoryPoint } from './TelemetryHistoryManager';
import { SyncStatus } from './types';

const TelemetryGraphWidget: React.FC = () => {
  const iModelConnection = useActiveIModelConnection();
  const [manager] = useState(() => IoTIntegrationManager.getInstance());
  const [historyManager] = useState(() => TelemetryHistoryManager.getInstance());

  const [selectedElementId, setSelectedElementId] = useState<string>('');
  const [selectedElementLabel, setSelectedElementLabel] = useState<string>('');
  const [historyData, setHistoryData] = useState<TelemetryHistoryPoint[]>([]);
  const [currentValues, setCurrentValues] = useState<{
    temperature?: number;
    powerConsumption?: number;
    signalStrength?: number;
    healthScore?: number;
  }>({});
  const [isIoTActive, setIsIoTActive] = useState<boolean>(false);

  /**
   * Listen for IoT sync status changes
   */
  useEffect(() => {
    const statusListener = (status: SyncStatus) => {
      setIsIoTActive(status.isRunning);
    };

    manager.addStatusListener(statusListener);

    // Initial status
    setIsIoTActive(manager.getSyncStatus()?.isRunning || false);

    return () => {
      manager.removeStatusListener(statusListener);
    };
  }, [manager]);

  /**
   * Update history data when selection changes
   */
  useEffect(() => {
    if (!selectedElementId) return;

    const updateHistory = () => {
      const history = historyManager.getHistory(selectedElementId);
      setHistoryData(history);

      // Update current values
      if (history.length > 0) {
        const latest = history[history.length - 1];
        setCurrentValues({
          temperature: latest.temperature,
          powerConsumption: latest.powerConsumption,
          signalStrength: latest.signalStrength,
          healthScore: latest.healthScore
        });
      }
    };

    historyManager.addListener(updateHistory);
    updateHistory();

    return () => {
      historyManager.removeListener(updateHistory);
    };
  }, [selectedElementId, historyManager]);

  /**
   * Handle model element selection - auto-select equipment
   */
  useEffect(() => {
    if (!iModelConnection) return;

    const handleSelectionChange = async () => {
      try {
        const selection = Presentation.selection.getSelection(iModelConnection);

        if (selection.isEmpty) return;

        const instanceKeysIterator = selection.instanceKeys.values();
        const firstInstanceKeys = instanceKeysIterator.next().value;
        if (!firstInstanceKeys || firstInstanceKeys.size === 0) return;

        const elementId = Array.from(firstInstanceKeys)[0];

        // Check if this is IoT equipment
        const telemetry = manager.getTelemetryForElement(elementId);
        if (telemetry) {
          setSelectedElementId(elementId);
          setSelectedElementLabel(telemetry.displayLabel);
        }
      } catch (error) {
        console.warn('Error handling selection:', error);
      }
    };

    const removeListener = Presentation.selection.selectionChange.addListener((evt) => {
      if (evt.imodel === iModelConnection) {
        handleSelectionChange();
      }
    });

    return removeListener;
  }, [iModelConnection, manager]);

  /**
   * Format chart data for display
   */
  const getChartData = useCallback(() => {
    return historyData.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...point
    }));
  }, [historyData]);

  /**
   * Get status for metric value
   */
  const getMetricStatus = (value: number, metric: 'temperature' | 'power' | 'signal' | 'health') => {
    switch (metric) {
      case 'temperature':
        if (value > 45) return { color: '#EF4444', status: 'CRITICAL' };
        if (value > 35) return { color: '#F59E0B', status: 'WARNING' };
        return { color: '#10B981', status: 'NORMAL' };
      case 'power':
        if (value > 300) return { color: '#EF4444', status: 'CRITICAL' };
        if (value > 250) return { color: '#F59E0B', status: 'WARNING' };
        return { color: '#10B981', status: 'NORMAL' };
      case 'signal':
        if (value < -90) return { color: '#EF4444', status: 'CRITICAL' };
        if (value < -80) return { color: '#F59E0B', status: 'WARNING' };
        return { color: '#10B981', status: 'NORMAL' };
      case 'health':
        if (value < 50) return { color: '#EF4444', status: 'CRITICAL' };
        if (value < 70) return { color: '#F59E0B', status: 'WARNING' };
        return { color: '#10B981', status: 'EXCELLENT' };
      default:
        return { color: '#6B7280', status: 'UNKNOWN' };
    }
  };

  /**
   * Custom tooltip for charts
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div style={{
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
      }}>
        <div style={{ color: '#E5E7EB', fontSize: '11px', marginBottom: '6px', fontWeight: '600' }}>
          {label}
        </div>
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ color: entry.color, fontSize: '13px', fontWeight: '600' }}>
            {entry.value?.toFixed(1)} {entry.unit || ''}
          </div>
        ))}
      </div>
    );
  };

  const chartData = getChartData();

  // No equipment selected
  if (!selectedElementId) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: '14px',
        background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>No Equipment Selected</div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>
            Click on IoT equipment in the 3D model to view telemetry graphs
          </div>
        </div>
      </div>
    );
  }

  // No data yet
  if (historyData.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#9CA3AF',
        fontSize: '14px',
        background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>⏳</div>
          <div style={{ fontWeight: '600', marginBottom: '8px' }}>{selectedElementLabel}</div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>
            Waiting for telemetry data... Start IoT collection to see graphs
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      background: 'linear-gradient(135deg, #1F2937 0%, #111827 100%)',
      padding: '20px 24px',
      overflowX: 'auto',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '700',
            color: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
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
            {selectedElementLabel}
          </h3>
          
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px',
        width: '100%',
        paddingBottom: '20px'
      }}>
        {/* Temperature - Area Chart with Gradient */}
        {currentValues.temperature !== undefined && (
          <div style={{
            background: 'rgba(17, 24, 39, 0.6)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            minWidth: '300px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '4px' }}>
                  TEMPERATURE
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#F9FAFB', lineHeight: 1 }}>
                  {currentValues.temperature.toFixed(1)}
                  <span style={{ fontSize: '16px', color: '#9CA3AF', marginLeft: '4px' }}>°C</span>
                </div>
              </div>
              <div style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                backgroundColor: getMetricStatus(currentValues.temperature, 'temperature').color + '20',
                color: getMetricStatus(currentValues.temperature, 'temperature').color,
                border: `1px solid ${getMetricStatus(currentValues.temperature, 'temperature').color}40`
              }}>
                {getMetricStatus(currentValues.temperature, 'temperature').status}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={35} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={1} />
                <ReferenceLine y={45} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1} />
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#tempGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Power Consumption - Bar Chart */}
        {currentValues.powerConsumption !== undefined && (
          <div style={{
            background: 'rgba(17, 24, 39, 0.6)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            minWidth: '300px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '4px' }}>
                  POWER CONSUMPTION
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#F9FAFB', lineHeight: 1 }}>
                  {currentValues.powerConsumption.toFixed(1)}
                  <span style={{ fontSize: '16px', color: '#9CA3AF', marginLeft: '4px' }}>W</span>
                </div>
              </div>
              <div style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                backgroundColor: getMetricStatus(currentValues.powerConsumption, 'power').color + '20',
                color: getMetricStatus(currentValues.powerConsumption, 'power').color,
                border: `1px solid ${getMetricStatus(currentValues.powerConsumption, 'power').color}40`
              }}>
                {getMetricStatus(currentValues.powerConsumption, 'power').status}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                  domain={['dataMin - 20', 'dataMax + 20']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={250} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={1} />
                <ReferenceLine y={300} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1} />
                <Bar
                  dataKey="powerConsumption"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      (entry.powerConsumption ?? 0) > 300 ? '#EF4444' :
                      (entry.powerConsumption ?? 0) > 250 ? '#F59E0B' : '#3B82F6'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Signal Strength - Line Chart */}
        {currentValues.signalStrength !== undefined && (
          <div style={{
            background: 'rgba(17, 24, 39, 0.6)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            minWidth: '300px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '4px' }}>
                  SIGNAL STRENGTH
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#F9FAFB', lineHeight: 1 }}>
                  {currentValues.signalStrength.toFixed(1)}
                  <span style={{ fontSize: '16px', color: '#9CA3AF', marginLeft: '4px' }}>dBm</span>
                </div>
              </div>
              <div style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                backgroundColor: getMetricStatus(currentValues.signalStrength, 'signal').color + '20',
                color: getMetricStatus(currentValues.signalStrength, 'signal').color,
                border: `1px solid ${getMetricStatus(currentValues.signalStrength, 'signal').color}40`
              }}>
                {getMetricStatus(currentValues.signalStrength, 'signal').status}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                  domain={['dataMin - 5', 'dataMax + 5']}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={-80} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={1} />
                <ReferenceLine y={-90} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="signalStrength"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={{ fill: '#06B6D4', r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Health Score - Area Chart with gradient */}
        {currentValues.healthScore !== undefined && (
          <div style={{
            background: 'rgba(17, 24, 39, 0.6)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            minWidth: '300px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '4px' }}>
                  HEALTH SCORE
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#F9FAFB', lineHeight: 1 }}>
                  {currentValues.healthScore.toFixed(0)}
                  <span style={{ fontSize: '16px', color: '#9CA3AF', marginLeft: '4px' }}>%</span>
                </div>
              </div>
              <div style={{
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '10px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                backgroundColor: getMetricStatus(currentValues.healthScore, 'health').color + '20',
                color: getMetricStatus(currentValues.healthScore, 'health').color,
                border: `1px solid ${getMetricStatus(currentValues.healthScore, 'health').color}40`
              }}>
                {getMetricStatus(currentValues.healthScore, 'health').status}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="time"
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  stroke="#6B7280"
                  style={{ fontSize: '10px' }}
                  tick={{ fill: '#6B7280' }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="3 3" strokeWidth={1} />
                <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="3 3" strokeWidth={1} />
                <Area
                  type="monotone"
                  dataKey="healthScore"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#healthGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Custom Scrollbar Styles */
        div::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        div::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.5);
          border-radius: 5px;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.8);
          border-radius: 5px;
          border: 2px solid rgba(17, 24, 39, 0.5);
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.9);
        }

        /* Firefox scrollbar */
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(75, 85, 99, 0.8) rgba(17, 24, 39, 0.5);
        }
      `}</style>
    </div>
  );
};

/**
 * Widget provider for registering with iTwin.js UI - Bottom Panel Only
 */
export class TelemetryGraphWidgetProvider implements UiItemsProvider {
  public readonly id: string = "TelemetryGraphWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Bottom) {
      widgets.push({
        id: "TelemetryGraphWidget",
        label: "Telemetry Dashboard",
        defaultState: WidgetState.Open,
        canPopout: false,
        allowedPanels: [StagePanelLocation.Bottom],
        priority: 100,
        content: <TelemetryGraphWidget />
      });
    }
    return widgets;
  }
}
