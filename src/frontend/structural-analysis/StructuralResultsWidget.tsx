/*---------------------------------------------------------------------------------------------
 * Structural Results Widget
 *
 * Displays detailed structural analysis results including load combinations and utilization
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import {
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
  useActiveIModelConnection,
  Widget,
  WidgetState,
} from '@itwin/appui-react';
import { StructuralAnalysisManager } from './StructuralAnalysisManager';
import { AnalysisResults, LoadCombinations } from './types';

const StructuralResultsWidget: React.FC = () => {
  const iModelConnection = useActiveIModelConnection();
  const [manager] = useState(() => StructuralAnalysisManager.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);

  /**
   * Initialize manager when iModel is available
   */
  useEffect(() => {
    const initialize = async () => {
      if (!iModelConnection || isInitialized) return;

      try {
        await manager.initialize(iModelConnection);
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize structural analysis manager:', error);
      }
    };

    initialize();
  }, [iModelConnection, manager, isInitialized]);

  /**
   * Listen for analysis updates
   */
  useEffect(() => {
    if (!isInitialized) return;

    const listener = (results: AnalysisResults | null) => {
      setAnalysisResults(results);
    };

    manager.addAnalysisListener(listener);

    // Get current results if available
    setAnalysisResults(manager.getCurrentAnalysis());

    return () => {
      manager.removeAnalysisListener(listener);
    };
  }, [isInitialized, manager]);

  if (!isInitialized) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#EAEAEA' }}>
        <div style={{ marginBottom: '10px', fontWeight: '600' }}>
          Initializing Results Viewer...
        </div>
      </div>
    );
  }

  if (!analysisResults) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📊</div>
        <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '5px' }}>
          No Analysis Results
        </div>
        <div style={{ fontSize: '12px' }}>
          Run an analysis to see detailed results here
        </div>
      </div>
    );
  }

  const statusColor = manager.getStatusColor(analysisResults.max_utilization);

  return (
    <div style={{ padding: '20px', color: '#EAEAEA', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '600' }}>
          Analysis Results
        </h3>
        <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
          Detailed structural analysis report
        </div>
      </div>

      {/* Status Banner */}
      <div style={{
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: `${statusColor}20`,
        border: `2px solid ${statusColor}`,
        borderRadius: '8px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: '700', color: statusColor, marginBottom: '8px' }}>
          {analysisResults.status.toUpperCase()}
        </div>
        <div style={{ fontSize: '24px', fontWeight: '700', color: statusColor }}>
          {(analysisResults.max_utilization * 100).toFixed(1)}% Utilized
        </div>
      </div>

      {/* Tower Information */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
          Tower Information
        </h4>
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Tower Height:</span>
            <span style={{ fontWeight: '600' }}>{analysisResults.total_height_m.toFixed(1)} m</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Pole Weight:</span>
            <span style={{ fontWeight: '600' }}>{analysisResults.pole_weight_kg.toFixed(1)} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Crown Equipment:</span>
            <span style={{ fontWeight: '600' }}>{analysisResults.crown_weight_kg.toFixed(1)} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Total Dead Load:</span>
            <span style={{ fontWeight: '600' }}>{analysisResults.total_dead_load_kg.toFixed(1)} kg</span>
          </div>
        </div>
      </div>

      {/* Wind Load */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
          Wind Loading
        </h4>
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Wind Force:</span>
            <span style={{ fontWeight: '600' }}>{analysisResults.wind_force_n.toFixed(0)} N</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Wind Moment:</span>
            <span style={{ fontWeight: '600' }}>{(analysisResults.wind_moment_nm / 1000).toFixed(0)} kN⋅m</span>
          </div>
        </div>
      </div>

      {/* Capacity */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
          Capacity Analysis
        </h4>
        <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Governing Element:</span>
            <span style={{ fontWeight: '600', color: '#10B981' }}>{analysisResults.governing_element}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Max Load Capacity:</span>
            <span style={{ fontWeight: '600' }}>{analysisResults.max_load_capacity_kg.toFixed(0)} kg</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A1A1AA' }}>Remaining Capacity:</span>
            <span style={{ fontWeight: '600', color: analysisResults.remaining_capacity_kg > 0 ? '#10B981' : '#EF4444' }}>
              {analysisResults.remaining_capacity_kg.toFixed(0)} kg
            </span>
          </div>
        </div>
      </div>

      {/* Load Combinations */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
          Load Combinations & Utilization
        </h4>
        <div style={{ fontSize: '11px' }}>
          {Object.entries(analysisResults.all_utilizations).map(([combo, utilization]) => {
            const isGoverning = combo === analysisResults.governing_combo;
            const utilizationPercent = utilization * 100;
            const barColor = manager.getStatusColor(utilization);

            return (
              <div
                key={combo}
                style={{
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: isGoverning ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  borderRadius: '4px',
                  border: isGoverning ? `1px solid ${barColor}` : '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', color: isGoverning ? barColor : '#EAEAEA' }}>
                    {combo}
                    {isGoverning && ' ← GOVERNING'}
                  </span>
                  <span style={{ fontWeight: '700', color: barColor }}>
                    {utilizationPercent.toFixed(1)}%
                  </span>
                </div>
                <div style={{
                  height: '4px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(utilizationPercent, 100)}%`,
                    backgroundColor: barColor,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#93C5FD',
      }}>
        <strong>Note:</strong> Analysis based on ASCE 7 standards. Results are for engineering reference only.
        Consult a licensed structural engineer for final design approval.
      </div>
    </div>
  );
};

export class StructuralResultsWidgetProvider implements UiItemsProvider {
  public readonly id: string = 'StructuralResultsWidgetProvider';

  public provideWidgets(
    _stageId: string,
    _stageUsage: string,
    location: StagePanelLocation,
    _section?: StagePanelSection
  ) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Right) {
      widgets.push({
        id: 'StructuralResultsWidget',
        label: 'Analysis Results',
        defaultState: WidgetState.Closed,
        priority: 160,
        content: <StructuralResultsWidget />,
      });
    }
    return widgets;
  }
}
