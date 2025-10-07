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
import { TowerSimulationController } from '../simulation';

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
    //console.log('[StructuralAnalysis] 🏗️ StructuralAnalysisManager: Initializing...');

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

    try {
      const extractor = new ModelDataExtractor(this.iModelConnection);
      this.extractedData = await extractor.extractTowerData();
      this.extractionLog = this.extractedData.extractionLog;
      this.isAutoExtracted = true;

    } catch (error) {
      console.error('[StructuralAnalysis] ❌ Model data extraction failed:', error);
      this.extractionLog.push(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      this.isAutoExtracted = false;
    }
  }

  /**
   * Run analysis with automatically extracted data
   * Combines extracted equipment counts from model with Python script defaults
   */
  private async runAnalysisWithExtractedData(): Promise<void> {
    if (!this.extractedData) {
      console.warn('[StructuralAnalysis] ⚠️ No extracted data available for analysis');
      return;
    }

    try {
      const defaultConfig = this.getDefaultTowerConfiguration();

      // Combine Python script defaults with extracted equipment from model
      const input: AnalysisInput = {
        sections: defaultConfig.sections,              // Python script: Tower dimensions
        applied_load_kg: defaultConfig.applied_load_kg,
        wind_speed_ms: defaultConfig.wind_speed_ms,   // Python script: 25 m/s
        exposure: defaultConfig.exposure,              // Python script: Exposure C
        steel_grade: defaultConfig.steel_grade,        // Python script: S355 steel
        foundation_params: defaultConfig.foundation_params, // Python script: Foundation params
        crown_platforms: this.extractedData.platforms, // MODEL: Equipment counts extracted
      };

      const results = this.runAnalysis(input);
      console.log('[StructuralAnalysis] ✅ Analysis completed with extracted equipment from model');
    } catch (error) {
      console.error('[StructuralAnalysis] ❌ Analysis failed:', error);
    } finally {
      console.log('[StructuralAnalysis] Extraction Log:');
      this.extractionLog.forEach((log) => console.log(`  - ${log}`));
    }

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
   * Get default tower configuration matching Python script (15m tower)
   * NOTE: Equipment counts should come from model extraction or user input
   * This returns only structural parameters (tower dimensions, foundation, environmental)
   */
  public getDefaultTowerConfiguration(): AnalysisInput {
    // Python script standard: 15m monopole section
    const sections: TowerSection[] = [
      {
        height: 15000,        // 15 meters in mm
        diameter_bottom: 628, // 628mm base
        diameter_top: 250,    // 250mm top
        thickness: 5,         // 5mm wall thickness
      },
    ];

    // Python script standard: 2 crown platforms at 14m and 11m
    // Equipment arrays are empty - should be populated from model extraction
    const crownPlatforms: CrownPlatform[] = [
      {
        height: 14.0,                     // Platform 1 at 14m
        platform_weight_kg: 150,
        platform_wind_area_m2: 1.5,
        cf: 1.5,
        antennas: [],           // Extract from model
        rrus: [],               // Extract from model
        other_equipment: [],    // Extract from model
      },
      {
        height: 11.0,                     // Platform 2 at 11m
        platform_weight_kg: 120,
        platform_wind_area_m2: 1.3,
        cf: 1.5,
        antennas: [],           // Extract from model
        rrus: [],               // Extract from model
        other_equipment: [],    // Extract from model
      },
    ];

    // Python script standard: Foundation parameters
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
      wind_speed_ms: 20.0,      // Python script default: 25 m/s (can be changed by user)
      exposure: 'C',             // Python script default: Exposure C
      steel_grade: 'S355',       // Python script default: S355 steel
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
   * Update equipment counts for platforms and recalculate analysis
   */
  public updateEquipmentCounts(
    platformIndex: number,
    counts: {
      antennas?: number;
      rrus?: number;
      microwave?: boolean;
    }
  ): AnalysisResults | null {
    if (!this.currentInput || !this.currentInput.crown_platforms || !this.currentInput.crown_platforms[platformIndex]) {
      console.warn(`[StructuralAnalysis] Platform ${platformIndex} not found`);
      return null;
    }

    console.log(`[StructuralAnalysis] 🔄 Updating equipment for Platform ${platformIndex + 1}`);
    console.log(`[StructuralAnalysis]    Antennas: ${counts.antennas || 'unchanged'}`);
    console.log(`[StructuralAnalysis]    RRUs: ${counts.rrus || 'unchanged'}`);
    console.log(`[StructuralAnalysis]    Microwave: ${counts.microwave !== undefined ? counts.microwave : 'unchanged'}`);

    const platform = this.currentInput.crown_platforms[platformIndex];

    // Update antennas
    if (counts.antennas !== undefined) {
      const antennaTemplate = { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 };
      platform.antennas = Array(counts.antennas).fill(null).map(() => ({ ...antennaTemplate }));
    }

    // Update RRUs
    if (counts.rrus !== undefined) {
      const rruTemplate = { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 };
      platform.rrus = Array(counts.rrus).fill(null).map(() => ({ ...rruTemplate }));
    }

    // Update microwave
    if (counts.microwave !== undefined) {
      if (counts.microwave) {
        const mwTemplate = { type: 'Microwave Dish', weight_kg: 25, wind_area_m2: 0.3, cf: 1.2 };
        platform.other_equipment = [mwTemplate];
      } else {
        platform.other_equipment = [];
      }
    }

    console.log(`[StructuralAnalysis] ✅ Equipment updated for Platform ${platformIndex + 1}`);
    console.log(`[StructuralAnalysis]    Total Antennas: ${platform.antennas.length}`);
    console.log(`[StructuralAnalysis]    Total RRUs: ${platform.rrus.length}`);
    console.log(`[StructuralAnalysis]    Microwave Present: ${platform.other_equipment.length > 0}`);

    // Update simulation visualization
    this.updateSimulationVisualization();

    // Recalculate structural analysis
    const results = this.runAnalysis(this.currentInput);
    console.log(`[StructuralAnalysis] ✅ Analysis recalculated`);
    return results;
  }

  /**
   * Update simulation visualization with current equipment
   */
  private updateSimulationVisualization(): void {
    try {
      const simulationController = TowerSimulationController.getInstance();

      if (!this.currentInput || !this.currentInput.crown_platforms) {
        return;
      }

      // Convert platforms to simulation format
      const platform1 = this.currentInput.crown_platforms[0];
      const platform2 = this.currentInput.crown_platforms[1];

      const update: any = {};

      if (platform1) {
        update.platform1 = {
          antennas: platform1.antennas.length,
          rrus: platform1.rrus.length,
          microlink: platform1.other_equipment.length > 0,
        };
      }

      if (platform2) {
        update.platform2 = {
          antennas: platform2.antennas.length,
          rrus: platform2.rrus.length,
          microlink: platform2.other_equipment.length > 0,
        };
      }

      // Update simulation (don't await, let it run in background)
      simulationController.updateSimulation(update).catch((error) => {
        console.warn('[StructuralAnalysis] Failed to update simulation:', error);
      });
    } catch (error) {
      console.warn('[StructuralAnalysis] Simulation controller not initialized:', error);
    }
  }

  /**
   * Get current equipment counts for a platform
   */
  public getEquipmentCounts(platformIndex: number): { antennas: number; rrus: number; microwave: boolean } | null {
    if (!this.currentInput || !this.currentInput.crown_platforms || !this.currentInput.crown_platforms[platformIndex]) {
      return null;
    }

    const platform = this.currentInput.crown_platforms[platformIndex];
    return {
      antennas: platform.antennas.length,
      rrus: platform.rrus.length,
      microwave: platform.other_equipment.length > 0,
    };
  }

  /**
   * Get all platforms with their equipment counts
   */
  public getAllPlatformEquipment(): Array<{
    platformNumber: number;
    height: number;
    antennas: number;
    rrus: number;
    microwave: boolean;
  }> {
    if (!this.currentInput || !this.currentInput.crown_platforms) {
      return [];
    }

    return this.currentInput.crown_platforms.map((platform, index) => ({
      platformNumber: index + 1,
      height: platform.height,
      antennas: platform.antennas.length,
      rrus: platform.rrus.length,
      microwave: platform.other_equipment.length > 0,
    }));
  }

  /**
   * Add equipment to a platform (legacy method - for backward compatibility)
   */
  public addRRU(platformIndex: number, rru?: { type: string; weight_kg: number; wind_area_m2: number; cf: number }): AnalysisResults | null {
    if (!this.currentInput || !this.currentInput.crown_platforms || !this.currentInput.crown_platforms[platformIndex]) {
      return null;
    }
    const rruToAdd = rru || { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 };
    this.currentInput.crown_platforms[platformIndex].rrus.push(rruToAdd);
    this.updateSimulationVisualization();
    return this.runAnalysis(this.currentInput);
  }

  /**
   * Add antenna to a platform (legacy method - for backward compatibility)
   */
  public addAntenna(platformIndex: number, antenna?: { type: string; weight_kg: number; wind_area_m2: number; cf: number }): AnalysisResults | null {
    if (!this.currentInput || !this.currentInput.crown_platforms || !this.currentInput.crown_platforms[platformIndex]) {
      return null;
    }
    const antennaToAdd = antenna || { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 };
    this.currentInput.crown_platforms[platformIndex].antennas.push(antennaToAdd);
    this.updateSimulationVisualization();
    return this.runAnalysis(this.currentInput);
  }

  /**
   * Add microwave dish to a platform (legacy method - for backward compatibility)
   */
  public addMWDish(platformIndex: number, dish?: { type: string; weight_kg: number; wind_area_m2: number; cf: number }): AnalysisResults | null {
    if (!this.currentInput || !this.currentInput.crown_platforms || !this.currentInput.crown_platforms[platformIndex]) {
      return null;
    }
    const dishToAdd = dish || { type: 'Microwave Dish', weight_kg: 25, wind_area_m2: 0.3, cf: 1.2 };
    this.currentInput.crown_platforms[platformIndex].other_equipment.push(dishToAdd);
    this.updateSimulationVisualization();
    return this.runAnalysis(this.currentInput);
  }

  /**
   * Remove equipment from a platform
   */
  public removeEquipment(
    platformIndex: number,
    equipmentType: 'antenna' | 'rru' | 'microwave',
    count: number = 1
  ): AnalysisResults | null {
    if (!this.currentInput || !this.currentInput.crown_platforms || !this.currentInput.crown_platforms[platformIndex]) {
      return null;
    }

    const platform = this.currentInput.crown_platforms[platformIndex];

    switch (equipmentType) {
      case 'antenna':
        platform.antennas = platform.antennas.slice(0, Math.max(0, platform.antennas.length - count));
        break;
      case 'rru':
        platform.rrus = platform.rrus.slice(0, Math.max(0, platform.rrus.length - count));
        break;
      case 'microwave':
        platform.other_equipment = [];
        break;
    }

    console.log(`[StructuralAnalysis] Removed ${count} ${equipmentType}(s) from Platform ${platformIndex + 1}`);
    this.updateSimulationVisualization();
    return this.runAnalysis(this.currentInput);
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
    //console.log('[StructuralAnalysis] 🔄 Re-running automatic extraction and analysis...');
    await this.extractModelData();
    if (this.extractedData) {
      await this.runAnalysisWithExtractedData();
    }
  }
}
