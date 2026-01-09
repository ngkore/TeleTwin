/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------------
 * Simulation Comparison Widget
 *
 * Shows detailed before/after comparison of equipment changes and structural impact
 * Tracks baseline vs current state with comprehensive analysis
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
import { AnalysisResults } from './types';

interface PlatformComparison {
  platformNumber: number;
  height: number;
  baseline: {
    antennas: number;
    rrus: number;
    microwave: boolean;
    totalWeight: number;
  };
  current: {
    antennas: number;
    rrus: number;
    microwave: boolean;
    totalWeight: number;
  };
  changes: {
    antennas: number;
    rrus: number;
    microwave: boolean;
    totalWeight: number;
  };
}

interface StructuralComparison {
  baseline: AnalysisResults | null;
  current: AnalysisResults | null;
  changes: {
    crown_weight_kg: number;
    wind_force_n: number;
    wind_moment_nm: number;
    max_utilization: number;
    remaining_capacity_kg: number;
  } | null;
}

const SimulationComparisonWidget: React.FC = () => {
  const iModelConnection = useActiveIModelConnection();
  const [manager] = useState(() => StructuralAnalysisManager.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);

  // Baseline state (captured at initialization or reset)
  const [baselineResults, setBaselineResults] = useState<AnalysisResults | null>(null);
  const [baselineEquipment, setBaselineEquipment] = useState<Array<{
    platformNumber: number;
    height: number;
    antennas: number;
    rrus: number;
    microwave: boolean;
  }>>([]);

  // Current state
  const [currentResults, setCurrentResults] = useState<AnalysisResults | null>(null);
  const [currentEquipment, setCurrentEquipment] = useState<Array<{
    platformNumber: number;
    height: number;
    antennas: number;
    rrus: number;
    microwave: boolean;
  }>>([]);

  const [platformComparisons, setPlatformComparisons] = useState<PlatformComparison[]>([]);
  const [structuralComparison, setStructuralComparison] = useState<StructuralComparison>({
    baseline: null,
    current: null,
    changes: null,
  });

  /**
   * Initialize and capture baseline
   */
  useEffect(() => {
    const initialize = async () => {
      if (!iModelConnection || isInitialized) return;

      try {
        await manager.initialize(iModelConnection);
        setIsInitialized(true);

        // Capture baseline state (initial model extraction)
        const initialResults = manager.getCurrentAnalysis();
        const initialEquipment = manager.getAllPlatformEquipment();

        setBaselineResults(initialResults);
        setBaselineEquipment(initialEquipment);
        setCurrentResults(initialResults);
        setCurrentEquipment(initialEquipment);

        console.log('[SimulationComparison] ✅ Baseline captured:', {
          equipment: initialEquipment,
          results: initialResults,
        });
      } catch (error) {
        console.error('Failed to initialize simulation comparison:', error);
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
      setCurrentResults(results);
      const equipment = manager.getAllPlatformEquipment();
      setCurrentEquipment(equipment);
    };

    manager.addAnalysisListener(listener);

    return () => {
      manager.removeAnalysisListener(listener);
    };
  }, [isInitialized, manager]);

  /**
   * Calculate comparisons whenever current state changes
   */
  useEffect(() => {
    if (!baselineEquipment.length || !currentEquipment.length) return;

    // Calculate platform comparisons
    const comparisons: PlatformComparison[] = baselineEquipment.map((baseline, idx) => {
      const current = currentEquipment[idx];

      // Standard equipment weights
      const antennaWeight = 40; // kg
      const rruWeight = 30; // kg
      const microwaveWeight = 25; // kg

      const baselineWeight =
        baseline.antennas * antennaWeight +
        baseline.rrus * rruWeight +
        (baseline.microwave ? microwaveWeight : 0);

      const currentWeight =
        current.antennas * antennaWeight +
        current.rrus * rruWeight +
        (current.microwave ? microwaveWeight : 0);

      return {
        platformNumber: baseline.platformNumber,
        height: baseline.height,
        baseline: {
          antennas: baseline.antennas,
          rrus: baseline.rrus,
          microwave: baseline.microwave,
          totalWeight: baselineWeight,
        },
        current: {
          antennas: current.antennas,
          rrus: current.rrus,
          microwave: current.microwave,
          totalWeight: currentWeight,
        },
        changes: {
          antennas: current.antennas - baseline.antennas,
          rrus: current.rrus - baseline.rrus,
          microwave: current.microwave && !baseline.microwave,
          totalWeight: currentWeight - baselineWeight,
        },
      };
    });

    setPlatformComparisons(comparisons);

    // Calculate structural comparison
    if (baselineResults && currentResults) {
      const structural: StructuralComparison = {
        baseline: baselineResults,
        current: currentResults,
        changes: {
          crown_weight_kg: currentResults.crown_weight_kg - baselineResults.crown_weight_kg,
          wind_force_n: currentResults.wind_force_n - baselineResults.wind_force_n,
          wind_moment_nm: currentResults.wind_moment_nm - baselineResults.wind_moment_nm,
          max_utilization: currentResults.max_utilization - baselineResults.max_utilization,
          remaining_capacity_kg: currentResults.remaining_capacity_kg - baselineResults.remaining_capacity_kg,
        },
      };
      setStructuralComparison(structural);
    }
  }, [baselineEquipment, currentEquipment, baselineResults, currentResults]);

  /**
   * Reset to baseline
   */
  const resetToBaseline = () => {
    if (!baselineEquipment.length) return;

    baselineEquipment.forEach((platform, idx) => {
      manager.updateEquipmentCounts(idx, {
        antennas: platform.antennas,
        rrus: platform.rrus,
        microwave: platform.microwave,
      });
    });

    console.log('[SimulationComparison] 🔄 Reset to baseline');
  };

  /**
   * Capture current state as new baseline
   */
  const setAsBaseline = () => {
    setBaselineResults(currentResults);
    setBaselineEquipment([...currentEquipment]);
    console.log('[SimulationComparison] 📸 Current state set as baseline');
  };

  if (!isInitialized) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#EAEAEA' }}>
        <div style={{ marginBottom: '10px', fontWeight: '600' }}>
          Initializing Simulation Comparison...
        </div>
      </div>
    );
  }

  const hasChanges = platformComparisons.some(p =>
    p.changes.antennas !== 0 || p.changes.rrus !== 0 || p.changes.microwave
  );

  return (
    <div style={{ padding: '20px', color: '#EAEAEA', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '600' }}>
          Equipment Simulation Analysis
        </h3>
        <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
          Before/After comparison of modifications
        </div>
      </div>

      {/* Status Banner */}
      {hasChanges ? (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          border: '2px solid rgba(59, 130, 246, 0.5)',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#60A5FA', marginBottom: '8px' }}>
           MODIFICATIONS DETECTED
          </div>
          <div style={{ fontSize: '12px', color: '#93C5FD' }}>
            Equipment has been modified. Review structural impact below.
          </div>
        </div>
      ) : (
        <div style={{
          padding: '12px',
          marginBottom: '20px',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          border: '2px solid rgba(16, 185, 129, 0.5)',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>
            BASELINE STATE
          </div>
          <div style={{ fontSize: '12px', color: '#6EE7B7' }}>
            No modifications from baseline configuration.
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={resetToBaseline}
          disabled={!hasChanges}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: hasChanges ? '#EF4444' : 'rgba(255,255,255,0.1)',
            color: hasChanges ? '#FFF' : '#6B7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          Reset to Baseline
        </button>
        <button
          onClick={setAsBaseline}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
            color: '#60A5FA',
            border: '1px solid rgba(59, 130, 246, 0.5)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Set as Baseline
        </button>
      </div>

      {/* Equipment Comparison Table */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '12px',
          borderBottom: '2px solid rgba(255,255,255,0.1)',
          paddingBottom: '8px',
        }}>
          Equipment Comparison by Platform
        </h4>

        {platformComparisons.map((comparison) => (
          <div
            key={comparison.platformNumber}
            style={{
              marginBottom: '15px',
              padding: '15px',
              backgroundColor: comparison.changes.totalWeight !== 0
                ? 'rgba(59, 130, 246, 0.1)'
                : 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: comparison.changes.totalWeight !== 0
                ? '2px solid rgba(59, 130, 246, 0.3)'
                : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {/* Platform Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#10B981' }}>
                  Platform {comparison.platformNumber}
                </div>
                <div style={{ fontSize: '11px', color: '#A1A1AA' }}>
                  Height: {comparison.height}m
                </div>
              </div>
              {comparison.changes.totalWeight !== 0 && (
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: comparison.changes.totalWeight > 0
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: comparison.changes.totalWeight > 0 ? '#FCA5A5' : '#6EE7B7',
                }}>
                  {comparison.changes.totalWeight > 0 ? '+' : ''}{comparison.changes.totalWeight} kg
                </div>
              )}
            </div>

            {/* Equipment Table */}
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ textAlign: 'left', padding: '6px 0', color: '#A1A1AA', fontWeight: '600' }}>
                    Equipment
                  </th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#A1A1AA', fontWeight: '600' }}>
                    Baseline
                  </th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#A1A1AA', fontWeight: '600' }}>
                    Current
                  </th>
                  <th style={{ textAlign: 'center', padding: '6px 8px', color: '#A1A1AA', fontWeight: '600' }}>
                    Change
                  </th>
                  <th style={{ textAlign: 'right', padding: '6px 0', color: '#A1A1AA', fontWeight: '600' }}>
                    Weight Impact
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Antennas */}
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0', color: '#EAEAEA' }}>Antennas</td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#9CA3AF' }}>
                    {comparison.baseline.antennas}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#EAEAEA', fontWeight: '600' }}>
                    {comparison.current.antennas}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>
                    <span style={{
                      color: comparison.changes.antennas > 0 ? '#FCA5A5' :
                             comparison.changes.antennas < 0 ? '#6EE7B7' : '#9CA3AF',
                      fontWeight: '600',
                    }}>
                      {comparison.changes.antennas > 0 ? '+' : ''}{comparison.changes.antennas}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', color: '#A1A1AA' }}>
                    {comparison.changes.antennas > 0 ? '+' : ''}{comparison.changes.antennas * 40} kg
                  </td>
                </tr>

                {/* RRUs */}
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px 0', color: '#EAEAEA' }}>RRUs</td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#9CA3AF' }}>
                    {comparison.baseline.rrus}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#EAEAEA', fontWeight: '600' }}>
                    {comparison.current.rrus}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>
                    <span style={{
                      color: comparison.changes.rrus > 0 ? '#FCA5A5' :
                             comparison.changes.rrus < 0 ? '#6EE7B7' : '#9CA3AF',
                      fontWeight: '600',
                    }}>
                      {comparison.changes.rrus > 0 ? '+' : ''}{comparison.changes.rrus}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', color: '#A1A1AA' }}>
                    {comparison.changes.rrus > 0 ? '+' : ''}{comparison.changes.rrus * 30} kg
                  </td>
                </tr>

                {/* Microwave */}
                <tr>
                  <td style={{ padding: '8px 0', color: '#EAEAEA' }}>Microwave Dish</td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#9CA3AF' }}>
                    {comparison.baseline.microwave ? '✓' : '—'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px', color: '#EAEAEA', fontWeight: '600' }}>
                    {comparison.current.microwave ? '✓' : '—'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '8px' }}>
                    <span style={{
                      color: comparison.changes.microwave ? '#FCA5A5' : '#9CA3AF',
                      fontWeight: '600',
                    }}>
                      {comparison.changes.microwave ? 'ADDED' : '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontSize: '11px', color: '#A1A1AA' }}>
                    {comparison.changes.microwave ? '+25 kg' : '—'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Platform Summary */}
            <div style={{
              marginTop: '12px',
              padding: '8px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '4px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
                Platform Total Weight:
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {comparison.baseline.totalWeight} kg
                </div>
                <div style={{ fontSize: '11px', color: '#60A5FA' }}>→</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#EAEAEA' }}>
                  {comparison.current.totalWeight} kg
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Structural Impact Comparison */}
      {structuralComparison.changes && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
            borderBottom: '2px solid rgba(255,255,255,0.1)',
            paddingBottom: '8px',
          }}>
            Structural Impact Analysis
          </h4>

          <div style={{
            padding: '15px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {/* Crown Weight */}
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '6px' }}>
                Crown Equipment Weight
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {structuralComparison.baseline?.crown_weight_kg.toFixed(1)} kg
                </div>
                <div style={{ fontSize: '11px', color: '#60A5FA' }}>→</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#EAEAEA' }}>
                  {structuralComparison.current?.crown_weight_kg.toFixed(1)} kg
                </div>
                <div style={{
                  padding: '2px 6px',
                  backgroundColor: structuralComparison.changes.crown_weight_kg > 0
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: structuralComparison.changes.crown_weight_kg > 0 ? '#FCA5A5' : '#6EE7B7',
                }}>
                  {structuralComparison.changes.crown_weight_kg > 0 ? '+' : ''}
                  {structuralComparison.changes.crown_weight_kg.toFixed(1)} kg
                </div>
              </div>
            </div>

            {/* Wind Force */}
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '6px' }}>
                Wind Force
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {structuralComparison.baseline?.wind_force_n.toFixed(0)} N
                </div>
                <div style={{ fontSize: '11px', color: '#60A5FA' }}>→</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#EAEAEA' }}>
                  {structuralComparison.current?.wind_force_n.toFixed(0)} N
                </div>
                <div style={{
                  padding: '2px 6px',
                  backgroundColor: structuralComparison.changes.wind_force_n > 0
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: structuralComparison.changes.wind_force_n > 0 ? '#FCA5A5' : '#6EE7B7',
                }}>
                  {structuralComparison.changes.wind_force_n > 0 ? '+' : ''}
                  {structuralComparison.changes.wind_force_n.toFixed(0)} N
                </div>
              </div>
            </div>

            {/* Wind Moment */}
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '6px' }}>
                Wind Moment
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {(structuralComparison.baseline!.wind_moment_nm / 1000).toFixed(1)} kN⋅m
                </div>
                <div style={{ fontSize: '11px', color: '#60A5FA' }}>→</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#EAEAEA' }}>
                  {(structuralComparison.current!.wind_moment_nm / 1000).toFixed(1)} kN⋅m
                </div>
                <div style={{
                  padding: '2px 6px',
                  backgroundColor: structuralComparison.changes.wind_moment_nm > 0
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: structuralComparison.changes.wind_moment_nm > 0 ? '#FCA5A5' : '#6EE7B7',
                }}>
                  {structuralComparison.changes.wind_moment_nm > 0 ? '+' : ''}
                  {(structuralComparison.changes.wind_moment_nm / 1000).toFixed(1)} kN⋅m
                </div>
              </div>
            </div>

            {/* Utilization */}
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '6px' }}>
                Tower Utilization
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {(structuralComparison.baseline!.max_utilization * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '11px', color: '#60A5FA' }}>→</div>
                <div style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: manager.getStatusColor(structuralComparison.current!.max_utilization),
                }}>
                  {(structuralComparison.current!.max_utilization * 100).toFixed(1)}%
                </div>
                <div style={{
                  padding: '2px 6px',
                  backgroundColor: structuralComparison.changes.max_utilization > 0
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: structuralComparison.changes.max_utilization > 0 ? '#FCA5A5' : '#6EE7B7',
                }}>
                  {structuralComparison.changes.max_utilization > 0 ? '+' : ''}
                  {(structuralComparison.changes.max_utilization * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Remaining Capacity */}
            <div>
              <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '6px' }}>
                Remaining Capacity
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                  {structuralComparison.baseline?.remaining_capacity_kg.toFixed(0)} kg
                </div>
                <div style={{ fontSize: '11px', color: '#60A5FA' }}>→</div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#EAEAEA' }}>
                  {structuralComparison.current?.remaining_capacity_kg.toFixed(0)} kg
                </div>
                <div style={{
                  padding: '2px 6px',
                  backgroundColor: structuralComparison.changes.remaining_capacity_kg < 0
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: structuralComparison.changes.remaining_capacity_kg < 0 ? '#FCA5A5' : '#6EE7B7',
                }}>
                  {structuralComparison.changes.remaining_capacity_kg > 0 ? '+' : ''}
                  {structuralComparison.changes.remaining_capacity_kg.toFixed(0)} kg
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safety Assessment */}
      {currentResults && (
        <div style={{
          padding: '15px',
          backgroundColor: currentResults.max_utilization > 1.0
            ? 'rgba(239, 68, 68, 0.15)'
            : currentResults.max_utilization > 0.9
              ? 'rgba(251, 146, 60, 0.15)'
              : 'rgba(16, 185, 129, 0.15)',
          border: `2px solid ${manager.getStatusColor(currentResults.max_utilization)}`,
          borderRadius: '8px',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '700',
            color: manager.getStatusColor(currentResults.max_utilization),
            marginBottom: '8px',
          }}>
            {currentResults.max_utilization > 1.0 ? 'UNSAFE' :
             currentResults.max_utilization > 0.9 ? 'CRITICAL' :
             currentResults.max_utilization > 0.8 ? 'WARNING' :
             'SAFE'}
          </div>
          <div style={{ fontSize: '12px', color: '#EAEAEA', marginBottom: '8px' }}>
            <strong>Status:</strong> {currentResults.status}
          </div>
          <div style={{ fontSize: '12px', color: '#EAEAEA' }}>
            <strong>Recommendation:</strong>{' '}
            {currentResults.max_utilization > 1.0
              ? 'Structure is overstressed. Remove equipment immediately or reinforce tower.'
              : currentResults.max_utilization > 0.9
                ? 'Near capacity. Avoid adding more equipment without structural review.'
                : currentResults.max_utilization > 0.8
                  ? 'High utilization. Exercise caution when adding equipment.'
                  : 'Tower has adequate capacity for current loading.'}
          </div>
        </div>
      )}
    </div>
  );
};

export class SimulationComparisonWidgetProvider implements UiItemsProvider {
  public readonly id: string = 'SimulationComparisonWidgetProvider';

  public provideWidgets(
    _stageId: string,
    _stageUsage: string,
    location: StagePanelLocation,
    _section?: StagePanelSection
  ) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Bottom) {
      widgets.push({
        id: 'SimulationComparisonWidget',
        label: 'Simulation Results Dashboard',
        defaultState: WidgetState.Open,
        canPopout: false,
        allowedPanels: [StagePanelLocation.Bottom],
        priority: 100,
        content: <SimulationComparisonWidget />,
      });
    }
    return widgets;
  }
}
