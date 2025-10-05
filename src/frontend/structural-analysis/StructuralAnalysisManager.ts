/*---------------------------------------------------------------------------------------------
 * Structural Analysis Manager
 *
 * Manages structural analysis state and integrates with iTwin model elements
 *--------------------------------------------------------------------------------------------*/

import { IModelConnection } from '@itwin/core-frontend';
import { StructuralAnalysisEngine } from './StructuralAnalysisEngine';
import { ModelDataExtractor, ExtractedTowerData } from './ModelDataExtractor';
import {
  AnalysisInput,
  AnalysisResults,
  TowerSection,
  CrownPlatform,
  FoundationParameters,
  ExposureCategory,
  SteelGrade,
} from './types';

export class StructuralAnalysisManager {
  private static instance: StructuralAnalysisManager;
  private engine: StructuralAnalysisEngine;
  private currentAnalysis: AnalysisResults | null = null;
  private currentInput: AnalysisInput | null = null;
  private iModelConnection: IModelConnection | null = null;
  private listeners: Array<(results: AnalysisResults | null) => void> = [];
  private extractedData: ExtractedTowerData | null = null;
  private extractionLog: string[] = [];
  private isAutoExtracted: boolean = false;

  private constructor() {
    this.engine = new StructuralAnalysisEngine();
  }

  public static getInstance(): StructuralAnalysisManager {
    if (!StructuralAnalysisManager.instance) {
      StructuralAnalysisManager.instance = new StructuralAnalysisManager();
    }
    return StructuralAnalysisManager.instance;
  }

  /**
   * Initialize with iModel connection and automatically extract tower data
   */
  public async initialize(iModel: IModelConnection): Promise<void> {
    this.iModelConnection = iModel;
    console.log('[StructuralAnalysis] 🏗️ StructuralAnalysisManager: Initializing...');

    // Automatically extract tower data from model
    await this.extractModelData();

    // Automatically run analysis with extracted data
    if (this.extractedData) {
      await this.runAnalysisWithExtractedData();
    }
  }

  /**
   * Extract tower data from the model
   */
  public async extractModelData(): Promise<void> {
    if (!this.iModelConnection) {
      console.warn('[StructuralAnalysis] ⚠️ No iModel connection available for extraction');
      return;
    }

    console.log('[StructuralAnalysis] 🔍 Starting automatic model data extraction...');

    try {
      const extractor = new ModelDataExtractor(this.iModelConnection);
      this.extractedData = await extractor.extractTowerData();
      this.extractionLog = this.extractedData.extractionLog;
      this.isAutoExtracted = true;

      console.log('[StructuralAnalysis] ✅ Model data extraction complete');
      console.log('[StructuralAnalysis] 📊 Extraction Summary:');
      console.log(`[StructuralAnalysis]   - Tower sections: ${this.extractedData.sections.length}`);
      console.log(`[StructuralAnalysis]   - Platforms: ${this.extractedData.platforms.length}`);

      // Detailed extraction info is already prefixed in ModelDataExtractor

    } catch (error) {
      console.error('[StructuralAnalysis] ❌ Model data extraction failed:', error);
      this.extractionLog.push(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      this.isAutoExtracted = false;
    }
  }

  /**
   * Run analysis with automatically extracted data
   */
  private async runAnalysisWithExtractedData(): Promise<void> {
    if (!this.extractedData) {
      console.warn('[StructuralAnalysis] ⚠️ No extracted data available for analysis');
      return;
    }

    console.log('[StructuralAnalysis] ========================================');
    console.log('[StructuralAnalysis] 🔧 PREPARING STRUCTURAL ANALYSIS INPUT');
    console.log('[StructuralAnalysis] ========================================');

    const input: AnalysisInput = {
      sections: this.extractedData.sections,
      crown_platforms: this.extractedData.platforms,
      applied_load_kg: 0,
      wind_speed_ms: 20.0, // Default wind speed from Python example
      exposure: 'C',
      steel_grade: 'S355',
      foundation_params: this.getDefaultFoundationParams(),
    };

    // Log detailed input being sent to analysis engine
    console.log('[StructuralAnalysis] 📥 INPUT TO ANALYSIS ENGINE:');
    console.log('[StructuralAnalysis] ─────────────────────────────────────');
    console.log('[StructuralAnalysis] Tower Sections:');
    input.sections.forEach((section, idx) => {
      console.log(`[StructuralAnalysis]   Section ${idx + 1}:`);
      console.log(`[StructuralAnalysis]     Height: ${section.height} mm`);
      console.log(`[StructuralAnalysis]     Diameter (bottom): ${section.diameter_bottom} mm`);
      console.log(`[StructuralAnalysis]     Diameter (top): ${section.diameter_top} mm`);
      console.log(`[StructuralAnalysis]     Thickness: ${section.thickness} mm`);
    });

    console.log('[StructuralAnalysis] Crown Platforms:');
    if (input.crown_platforms) {
      input.crown_platforms.forEach((platform, idx) => {
        console.log(`[StructuralAnalysis]   Platform ${idx + 1} @ ${platform.height}m:`);
        console.log(`[StructuralAnalysis]     Platform weight: ${platform.platform_weight_kg} kg`);
        console.log(`[StructuralAnalysis]     Platform wind area: ${platform.platform_wind_area_m2} m²`);
        console.log(`[StructuralAnalysis]     Antennas: ${platform.antennas.length} (${platform.antennas.reduce((s, a) => s + a.weight_kg, 0)} kg)`);
        console.log(`[StructuralAnalysis]     RRUs: ${platform.rrus.length} (${platform.rrus.reduce((s, r) => s + r.weight_kg, 0)} kg)`);
        console.log(`[StructuralAnalysis]     Other: ${platform.other_equipment.length} (${platform.other_equipment.reduce((s, e) => s + e.weight_kg, 0)} kg)`);
      });
    }

    console.log('[StructuralAnalysis] Environmental Conditions:');
    console.log(`[StructuralAnalysis]   Wind Speed: ${input.wind_speed_ms} m/s (${input.wind_speed_ms! * 3.6} km/h)`);
    console.log(`[StructuralAnalysis]   Exposure Category: ${input.exposure}`);
    console.log(`[StructuralAnalysis]   Steel Grade: ${input.steel_grade}`);

    if (input.foundation_params) {
      console.log('[StructuralAnalysis] Foundation Parameters:');
      console.log(`[StructuralAnalysis]   Bolt Circle Diameter: ${input.foundation_params.bolt_circle_diameter} mm`);
      console.log(`[StructuralAnalysis]   Number of Bolts: ${input.foundation_params.number_of_bolts}`);
      console.log(`[StructuralAnalysis]   Bolt Diameter: ${input.foundation_params.bolt_diameter} mm`);
      console.log(`[StructuralAnalysis]   Bolt Grade: ${input.foundation_params.bolt_grade} MPa`);
    }

    console.log('[StructuralAnalysis] ─────────────────────────────────────');
    console.log('[StructuralAnalysis] 🚀 CALLING: engine.analyzeMonopole()');
    console.log('[StructuralAnalysis] ========================================');

    this.currentInput = input;
    this.currentAnalysis = this.engine.analyzeMonopole(input);

    console.log('[StructuralAnalysis] ========================================');
    console.log('[StructuralAnalysis] ✅ ANALYSIS ENGINE COMPLETED');
    console.log('[StructuralAnalysis] ========================================');
    console.log('[StructuralAnalysis] 📊 ANALYSIS RESULTS:');
    console.log(`[StructuralAnalysis]   Tower Height: ${this.currentAnalysis.total_height_m.toFixed(1)} m`);
    console.log(`[StructuralAnalysis]   Pole Weight: ${this.currentAnalysis.pole_weight_kg.toFixed(1)} kg`);
    console.log(`[StructuralAnalysis]   Equipment Weight: ${this.currentAnalysis.crown_weight_kg.toFixed(1)} kg`);
    console.log(`[StructuralAnalysis]   Total Dead Load: ${this.currentAnalysis.total_dead_load_kg.toFixed(1)} kg`);
    console.log(`[StructuralAnalysis]   Wind Force: ${this.currentAnalysis.wind_force_n.toFixed(0)} N`);
    console.log(`[StructuralAnalysis]   Wind Moment: ${(this.currentAnalysis.wind_moment_nm / 1000).toFixed(0)} kN⋅m`);
    console.log(`[StructuralAnalysis]   Governing Element: ${this.currentAnalysis.governing_element}`);
    console.log(`[StructuralAnalysis]   Max Utilization: ${(this.currentAnalysis.max_utilization * 100).toFixed(1)}%`);
    console.log(`[StructuralAnalysis]   Status: ${this.currentAnalysis.status}`);
    console.log(`[StructuralAnalysis]   Governing Combo: ${this.currentAnalysis.governing_combo}`);
    console.log(`[StructuralAnalysis]   Max Load Capacity: ${this.currentAnalysis.max_load_capacity_kg.toFixed(0)} kg`);
    console.log(`[StructuralAnalysis]   Remaining Capacity: ${this.currentAnalysis.remaining_capacity_kg.toFixed(0)} kg`);
    console.log('[StructuralAnalysis] ========================================');

    this.notifyListeners();
  }

  /**
   * Get default foundation parameters
   */
  private getDefaultFoundationParams(): FoundationParameters {
    return {
      base_plate_diameter: 750,
      bolt_circle_diameter: 750,
      number_of_bolts: 16,
      bolt_diameter: 22,
      bolt_grade: 420,
      concrete_strength: 25,
      anchor_length: 900,
    };
  }

  /**
   * Get default tower configuration (15m tower from Python example)
   */
  public getDefaultTowerConfiguration(): AnalysisInput {
    const sections: TowerSection[] = [
      {
        height: 15000, // 15 meters in mm
        diameter_bottom: 628, // 628mm base
        diameter_top: 250, // 250mm top
        thickness: 5, // 5mm wall thickness
      },
    ];

    const crownPlatforms: CrownPlatform[] = [
      {
        height: 14.0,
        platform_weight_kg: 150,
        platform_wind_area_m2: 1.5,
        cf: 1.5,

        // 4 Sector Antennas
        antennas: [
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        ],

        // 8 RRUs
        rrus: [
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        ],

        other_equipment: [],
      },
    ];

    const foundationParams: FoundationParameters = {
      base_plate_diameter: 750,
      bolt_circle_diameter: 750,
      number_of_bolts: 16,
      bolt_diameter: 22,
      bolt_grade: 420,
      concrete_strength: 25,
      anchor_length: 900,
    };

    return {
      sections,
      applied_load_kg: 0,
      wind_speed_ms: 25.0,
      exposure: 'C',
      steel_grade: 'S355',
      foundation_params: foundationParams,
      crown_platforms: crownPlatforms,
    };
  }

  /**
   * Run structural analysis with given input
   */
  public runAnalysis(input: AnalysisInput): AnalysisResults {
    this.currentInput = input;
    this.currentAnalysis = this.engine.analyzeMonopole(input);
    this.notifyListeners();
    return this.currentAnalysis;
  }

  /**
   * Update specific parameters and re-run analysis
   */
  public updateParameters(updates: Partial<AnalysisInput>): AnalysisResults | null {
    if (!this.currentInput) {
      console.warn('No current analysis input to update');
      return null;
    }

    this.currentInput = { ...this.currentInput, ...updates };
    return this.runAnalysis(this.currentInput);
  }

  /**
   * Update tower section parameters
   */
  public updateTowerSection(sectionIndex: number, updates: Partial<TowerSection>): AnalysisResults | null {
    if (!this.currentInput || !this.currentInput.sections[sectionIndex]) {
      return null;
    }

    this.currentInput.sections[sectionIndex] = {
      ...this.currentInput.sections[sectionIndex],
      ...updates,
    };

    return this.runAnalysis(this.currentInput);
  }

  /**
   * Update wind speed and re-run analysis
   */
  public updateWindSpeed(windSpeedMs: number): AnalysisResults | null {
    return this.updateParameters({ wind_speed_ms: windSpeedMs });
  }

  /**
   * Update exposure category and re-run analysis
   */
  public updateExposure(exposure: ExposureCategory): AnalysisResults | null {
    return this.updateParameters({ exposure });
  }

  /**
   * Update steel grade and re-run analysis
   */
  public updateSteelGrade(steelGrade: SteelGrade): AnalysisResults | null {
    return this.updateParameters({ steel_grade: steelGrade });
  }

  /**
   * Get current analysis results
   */
  public getCurrentAnalysis(): AnalysisResults | null {
    return this.currentAnalysis;
  }

  /**
   * Get current input parameters
   */
  public getCurrentInput(): AnalysisInput | null {
    return this.currentInput;
  }

  /**
   * Clear current analysis
   */
  public clearAnalysis(): void {
    this.currentAnalysis = null;
    this.currentInput = null;
    this.notifyListeners();
  }

  /**
   * Add listener for analysis updates
   */
  public addAnalysisListener(listener: (results: AnalysisResults | null) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove listener
   */
  public removeAnalysisListener(listener: (results: AnalysisResults | null) => void): void {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  /**
   * Notify all listeners of analysis updates
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentAnalysis));
  }

  /**
   * Get status color based on utilization
   */
  public getStatusColor(utilization: number): string {
    if (utilization > 1.0) return '#d32f2f'; // FAIL - Red
    if (utilization > 0.9) return '#d84315'; // CRITICAL - Deep Orange
    if (utilization > 0.8) return '#ed6c02'; // WARNING - Orange
    if (utilization > 0.6) return '#2e7d32'; // GOOD - Green
    return '#1976d2'; // CONSERVATIVE - Blue
  }

  /**
   * Get status text based on utilization
   */
  public getStatusText(utilization: number): string {
    if (utilization > 1.0) return 'FAIL';
    if (utilization > 0.9) return 'CRITICAL';
    if (utilization > 0.8) return 'WARNING';
    if (utilization > 0.6) return 'GOOD';
    return 'CONSERVATIVE';
  }

  /**
   * Get extraction log
   */
  public getExtractionLog(): string[] {
    return [...this.extractionLog];
  }

  /**
   * Check if data was auto-extracted from model
   */
  public isDataAutoExtracted(): boolean {
    return this.isAutoExtracted;
  }

  /**
   * Get extracted tower data
   */
  public getExtractedData(): ExtractedTowerData | null {
    return this.extractedData;
  }

  /**
   * Re-run automatic extraction and analysis
   */
  public async reExtractAndAnalyze(): Promise<void> {
    console.log('[StructuralAnalysis] 🔄 Re-running automatic extraction and analysis...');
    await this.extractModelData();
    if (this.extractedData) {
      await this.runAnalysisWithExtractedData();
    }
  }
}
