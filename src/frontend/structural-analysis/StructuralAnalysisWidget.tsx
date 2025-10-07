/*---------------------------------------------------------------------------------------------
 * Structural Analysis Widget
 *
 * User interface for inputting tower parameters and running structural analysis
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect, useCallback } from 'react';
import {
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
  useActiveIModelConnection,
  Widget,
  WidgetState,
} from '@itwin/appui-react';
import { Button, Input, Select, LabeledInput } from '@itwin/itwinui-react';
import { StructuralAnalysisManager } from './StructuralAnalysisManager';
import { AnalysisResults, ExposureCategory, SteelGrade } from './types';
import { MetadataManager } from '../../common/MetadataManager';

const StructuralAnalysisWidget: React.FC = () => {
  const iModelConnection = useActiveIModelConnection();
  const [manager] = useState(() => StructuralAnalysisManager.getInstance());
  const [metadataManager] = useState(() => MetadataManager.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);

  // Input parameters
  const [windSpeed, setWindSpeed] = useState<number>(25.0);
  const [exposure, setExposure] = useState<ExposureCategory>('C');
  const [steelGrade, setSteelGrade] = useState<SteelGrade>('S355');
  const [towerHeight, setTowerHeight] = useState<number>(15000);
  const [diameterBottom, setDiameterBottom] = useState<number>(628);
  const [diameterTop, setDiameterTop] = useState<number>(250);
  const [thickness, setThickness] = useState<number>(5);

  // Equipment state for platforms
  const [p1Antennas, setP1Antennas] = useState<number>(4);
  const [p1RRUs, setP1RRUs] = useState<number>(4);
  const [p1Microwave, setP1Microwave] = useState<boolean>(true);
  const [p2Antennas, setP2Antennas] = useState<number>(4);
  const [p2RRUs, setP2RRUs] = useState<number>(8);
  const [p2Microwave, setP2Microwave] = useState<boolean>(false);

  // Analysis state
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractionLog, setExtractionLog] = useState<string[]>([]);
  const [isAutoExtracted, setIsAutoExtracted] = useState(false);
  const [showLog, setShowLog] = useState(false);

  /**
   * Initialize manager when iModel is available
   */
  useEffect(() => {
    const initialize = async () => {
      if (!iModelConnection || isInitialized) return;

      try {
        await manager.initialize(iModelConnection);
        setIsInitialized(true);

        // Sync UI state with manager's current equipment
        const equipment = manager.getAllPlatformEquipment();
        if (equipment.length >= 2) {
          setP1Antennas(equipment[0].antennas);
          setP1RRUs(equipment[0].rrus);
          setP1Microwave(equipment[0].microwave);
          setP2Antennas(equipment[1].antennas);
          setP2RRUs(equipment[1].rrus);
          setP2Microwave(equipment[1].microwave);
          console.log('[StructuralAnalysis] ✅ Synced equipment state from manager');
        }
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
      setExtractionLog(manager.getExtractionLog());
      setIsAutoExtracted(manager.isDataAutoExtracted());
    };

    manager.addAnalysisListener(listener);

    // Get initial state
    setAnalysisResults(manager.getCurrentAnalysis());
    setExtractionLog(manager.getExtractionLog());
    setIsAutoExtracted(manager.isDataAutoExtracted());

    return () => {
      manager.removeAnalysisListener(listener);
    };
  }, [isInitialized, manager]);

  /**
   * Load default configuration
   */
  const loadDefaults = useCallback(() => {
    const defaultConfig = manager.getDefaultTowerConfiguration();

    if (defaultConfig.sections[0]) {
      setTowerHeight(defaultConfig.sections[0].height);
      setDiameterBottom(defaultConfig.sections[0].diameter_bottom);
      setDiameterTop(defaultConfig.sections[0].diameter_top);
      setThickness(defaultConfig.sections[0].thickness);
    }

    setWindSpeed(defaultConfig.wind_speed_ms || 25.0);
    setExposure(defaultConfig.exposure || 'C');
    setSteelGrade(defaultConfig.steel_grade || 'S355');
  }, [manager]);

  /**
   * Update equipment for a platform
   */
  const updatePlatformEquipment = useCallback((platformIndex: number) => {
    setIsAnalyzing(true);
    try {
      const counts = platformIndex === 0
        ? { antennas: p1Antennas, rrus: p1RRUs, microwave: p1Microwave }
        : { antennas: p2Antennas, rrus: p2RRUs, microwave: p2Microwave };

      const results = manager.updateEquipmentCounts(platformIndex, counts);
      setAnalysisResults(results);
    } catch (error) {
      console.error('Equipment update failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [manager, p1Antennas, p1RRUs, p1Microwave, p2Antennas, p2RRUs, p2Microwave]);

  /**
   * Run structural analysis
   * Preserves current equipment state and combines with user-modified tower/environmental parameters
   */
  const runAnalysis = useCallback(async () => {
    setIsAnalyzing(true);

    try {
      const defaultConfig = manager.getDefaultTowerConfiguration();
      const currentInput = manager.getCurrentInput();

      // Preserve equipment from current state, or use defaults if not available
      const input = {
        sections: [
          {
            height: towerHeight,
            diameter_bottom: diameterBottom,
            diameter_top: diameterTop,
            thickness,
          },
        ],
        wind_speed_ms: windSpeed,
        exposure,
        steel_grade: steelGrade,
        applied_load_kg: currentInput?.applied_load_kg ?? defaultConfig.applied_load_kg,
        foundation_params: currentInput?.foundation_params ?? defaultConfig.foundation_params,
        crown_platforms: currentInput?.crown_platforms ?? defaultConfig.crown_platforms, // PRESERVE equipment
      };

      const results = manager.runAnalysis(input);
      setAnalysisResults(results);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [manager, towerHeight, diameterBottom, diameterTop, thickness, windSpeed, exposure, steelGrade]);

  /**
   * Load defaults on mount
   */
  useEffect(() => {
    if (isInitialized) {
      loadDefaults();
    }
  }, [isInitialized, loadDefaults]);

  /**
   * Handle CSV upload for metadata
   */
  const handleCSVUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const csvData = e.target?.result as string;
            await metadataManager.loadCSVData(csvData);

            if (iModelConnection) {
              await metadataManager.matchElementsWithMetadata(iModelConnection);
              ////console.log('[StructuralAnalysis] ✅ CSV metadata loaded and matched');

              // Re-extract and analyze with new metadata
              await manager.reExtractAndAnalyze();
            }
          } catch (error) {
            console.error('[StructuralAnalysis] ❌ CSV upload failed:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [iModelConnection, metadataManager, manager]);

  if (!isInitialized) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#EAEAEA' }}>
        <div style={{ marginBottom: '10px', fontWeight: '600' }}>
          Initializing Structural Analysis...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: '#EAEAEA', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '600' }}>
          Structural Analysis
        </h3>
        <div style={{ fontSize: '13px', color: '#A1A1AA' }}>
          Tower stress & capacity calculation
        </div>
      </div>

      {/* Tower Dimensions */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#EAEAEA' }}>
          Tower Dimensions
        </h4>

        <LabeledInput
          label="Height (mm)"
          value={towerHeight.toString()}
          onChange={(e) => setTowerHeight(parseFloat(e.target.value) || 0)}
          type="number"
          style={{ marginBottom: '10px' }}
        />

        <LabeledInput
          label="Base Diameter (mm)"
          value={diameterBottom.toString()}
          onChange={(e) => setDiameterBottom(parseFloat(e.target.value) || 0)}
          type="number"
          style={{ marginBottom: '10px' }}
        />

        <LabeledInput
          label="Top Diameter (mm)"
          value={diameterTop.toString()}
          onChange={(e) => setDiameterTop(parseFloat(e.target.value) || 0)}
          type="number"
          style={{ marginBottom: '10px' }}
        />

        <LabeledInput
          label="Wall Thickness (mm)"
          value={thickness.toString()}
          onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
          type="number"
          style={{ marginBottom: '10px' }}
        />
      </div>

      {/* Environmental Conditions */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#EAEAEA' }}>
          Environmental Conditions
        </h4>

        <LabeledInput
          label="Wind Speed (m/s)"
          value={windSpeed.toString()}
          onChange={(e) => setWindSpeed(parseFloat(e.target.value) || 0)}
          type="number"
          style={{ marginBottom: '10px' }}
        />

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#EAEAEA' }}>
            Exposure Category
          </label>
          <Select
            options={[
              { value: 'B', label: 'B - Urban/Suburban' },
              { value: 'C', label: 'C - Open Terrain' },
              { value: 'D', label: 'D - Flat/Coastal' },
            ]}
            value={exposure}
            onChange={(value) => setExposure(value as ExposureCategory)}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#EAEAEA' }}>
            Steel Grade
          </label>
          <Select
            options={[
              { value: 'A36', label: 'A36 (248 MPa)' },
              { value: 'A572-50', label: 'A572-50 (345 MPa)' },
              { value: 'A992', label: 'A992 (345 MPa)' },
              { value: 'S355', label: 'S355 (355 MPa)' },
            ]}
            value={steelGrade}
            onChange={(value) => setSteelGrade(value as SteelGrade)}
          />
        </div>
      </div>

      {/* Equipment Management */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#EAEAEA' }}>
          Equipment Simulation
        </h4>

        {/* Platform 1 */}
        <div style={{
          marginBottom: '15px',
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#10B981' }}>
            Platform 1 (14m)
          </div>

          <LabeledInput
            label="Antennas"
            value={p1Antennas.toString()}
            onChange={(e) => setP1Antennas(parseInt(e.target.value) || 0)}
            type="number"
            min={0}
            max={12}
            style={{ marginBottom: '8px' }}
          />

          <LabeledInput
            label="RRUs"
            value={p1RRUs.toString()}
            onChange={(e) => setP1RRUs(parseInt(e.target.value) || 0)}
            type="number"
            min={0}
            max={16}
            style={{ marginBottom: '8px' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={p1Microwave}
              onChange={(e) => setP1Microwave(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label style={{ fontSize: '12px', color: '#EAEAEA', cursor: 'pointer' }}>
              Microwave Dish
            </label>
          </div>

          <Button
            onClick={() => updatePlatformEquipment(0)}
            disabled={isAnalyzing}
            styleType="high-visibility"
            style={{ width: '100%' }}
            size="small"
          >
            {isAnalyzing ? 'Updating...' : 'Update Platform 1'}
          </Button>
        </div>

        {/* Platform 2 */}
        <div style={{
          marginBottom: '10px',
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#10B981' }}>
            Platform 2 (11m)
          </div>

          <LabeledInput
            label="Antennas"
            value={p2Antennas.toString()}
            onChange={(e) => setP2Antennas(parseInt(e.target.value) || 0)}
            type="number"
            min={0}
            max={12}
            style={{ marginBottom: '8px' }}
          />

          <LabeledInput
            label="RRUs"
            value={p2RRUs.toString()}
            onChange={(e) => setP2RRUs(parseInt(e.target.value) || 0)}
            type="number"
            min={0}
            max={16}
            style={{ marginBottom: '8px' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <input
              type="checkbox"
              checked={p2Microwave}
              onChange={(e) => setP2Microwave(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label style={{ fontSize: '12px', color: '#EAEAEA', cursor: 'pointer' }}>
              Microwave Dish
            </label>
          </div>

          <Button
            onClick={() => updatePlatformEquipment(1)}
            disabled={isAnalyzing}
            styleType="high-visibility"
            style={{ width: '100%' }}
            size="small"
          >
            {isAnalyzing ? 'Updating...' : 'Update Platform 2'}
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <Button
          onClick={handleCSVUpload}
          styleType="cta"
          style={{ width: '100%' }}
        >
          📤 Upload Metadata CSV
        </Button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            styleType="high-visibility"
            onClick={runAnalysis}
            disabled={isAnalyzing}
            style={{ flex: 1 }}
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>

          <Button
            onClick={loadDefaults}
            style={{ flex: 1 }}
          >
            Load Defaults
          </Button>
        </div>

        <Button
          onClick={async () => {
            setIsAnalyzing(true);
            await manager.reExtractAndAnalyze();
            setIsAnalyzing(false);
          }}
          disabled={isAnalyzing}
          style={{ width: '100%' }}
        >
          🔄 Re-Extract from Model
        </Button>

        {isAutoExtracted && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#10B981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            textAlign: 'center'
          }}>
            ✅ Data auto-extracted from model
          </div>
        )}

        <Button
          onClick={() => setShowLog(!showLog)}
          size="small"
          style={{ width: '100%' }}
        >
          {showLog ? '📋 Hide Extraction Log' : '📋 Show Extraction Log'}
        </Button>
      </div>

      {/* Quick Results Summary */}
      {analysisResults && (
        <div style={{
          padding: '15px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          border: `2px solid ${manager.getStatusColor(analysisResults.max_utilization)}`,
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: '#A1A1AA' }}>
            ANALYSIS SUMMARY
          </div>

          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <span style={{ color: '#A1A1AA' }}>Status: </span>
            <span style={{
              color: manager.getStatusColor(analysisResults.max_utilization),
              fontWeight: '700'
            }}>
              {manager.getStatusText(analysisResults.max_utilization)}
            </span>
          </div>

          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: '#A1A1AA' }}>Utilization: </span>
            <span style={{ fontWeight: '600' }}>
              {(analysisResults.max_utilization * 100).toFixed(1)}%
            </span>
          </div>

          <div style={{ fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ color: '#A1A1AA' }}>Max Capacity: </span>
            <span style={{ fontWeight: '600' }}>
              {analysisResults.max_load_capacity_kg.toFixed(0)} kg
            </span>
          </div>

          <div style={{ fontSize: '13px' }}>
            <span style={{ color: '#A1A1AA' }}>Remaining: </span>
            <span style={{ fontWeight: '600' }}>
              {analysisResults.remaining_capacity_kg.toFixed(0)} kg
            </span>
          </div>

          <div style={{
            marginTop: '12px',
            fontSize: '11px',
            color: '#10B981',
            fontStyle: 'italic'
          }}>
            View detailed results in the Results widget
          </div>
        </div>
      )}

      {/* Extraction Log */}
      {showLog && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          maxHeight: '300px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: '#10B981' }}>
            📋 EXTRACTION LOG
          </div>
          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#EAEAEA' }}>
            {extractionLog.length > 0 ? (
              extractionLog.map((log, index) => (
                <div key={index} style={{ marginBottom: '2px', whiteSpace: 'pre-wrap' }}>
                  {log}
                </div>
              ))
            ) : (
              <div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
                No extraction log available. Run "Re-Extract from Model" to see details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export class StructuralAnalysisWidgetProvider implements UiItemsProvider {
  public readonly id: string = 'StructuralAnalysisWidgetProvider';

  public provideWidgets(
    _stageId: string,
    _stageUsage: string,
    location: StagePanelLocation,
    _section?: StagePanelSection
  ) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Right) {
      widgets.push({
        id: 'StructuralAnalysisWidget',
        label: 'Structural Analysis',
        defaultState: WidgetState.Open,
        priority: 150,
        content: <StructuralAnalysisWidget />,
      });
    }
    return widgets;
  }
}
