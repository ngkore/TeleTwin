/*---------------------------------------------------------------------------------------------
 * Model Data Extractor for Structural Analysis
 *
 * Extracts tower geometry, platforms, and equipment data from the iTwin model
 * Integrates with existing ModelElementExtractor and MetadataManager
 *--------------------------------------------------------------------------------------------*/

import { IModelConnection } from '@itwin/core-frontend';
import { TowerSection, CrownPlatform, Antenna, RRU, Equipment } from './types';
import { ModelElementExtractor } from '../iot-integration/ModelElementExtractor';
import { MetadataManager } from '../../common/MetadataManager';

export interface ExtractedTowerData {
  sections: TowerSection[];
  platforms: CrownPlatform[];
  extractionLog: string[];
}

export class ModelDataExtractor {
  private iModel: IModelConnection;
  private elementExtractor?: ModelElementExtractor;
  private metadataManager: MetadataManager;
  private log: string[] = [];

  constructor(iModel: IModelConnection) {
    this.iModel = iModel;
    this.metadataManager = MetadataManager.getInstance();
    this.addLog('🏗️ ModelDataExtractor initialized');
  }

  /**
   * Add timestamped log entry
   */
  private addLog(message: string): void {
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 8);
    const logMessage = `[${timestamp}] ${message}`;
    this.log.push(logMessage);
    //////////console.log(`[StructuralAnalysis] ${logMessage}`);
  }

  /**
   * Extract all tower data from the model
   */
  public async extractTowerData(): Promise<ExtractedTowerData> {
    this.log = [];
    this.addLog('========================================');
    this.addLog('STARTING AUTOMATIC TOWER DATA EXTRACTION');
    this.addLog('========================================');

    try {
      // Initialize element extractor
      this.elementExtractor = new ModelElementExtractor(this.iModel);
      await this.elementExtractor.extractElementsByIds();
      this.addLog('✅ Equipment extractor initialized');

      // Extract tower geometry
      const sections = await this.extractTowerGeometry();
      this.addLog(`✅ Extracted ${sections.length} tower section(s)`);

      // Extract platforms
      const platforms = await this.extractPlatforms();
      this.addLog(`✅ Extracted ${platforms.length} platform(s)`);

      this.addLog('========================================');
      this.addLog('EXTRACTION COMPLETE - SUMMARY');
      this.addLog('========================================');

      // Log detailed extraction results
      this.addLog('📊 EXTRACTED TOWER SECTIONS:');
      sections.forEach((section, idx) => {
        this.addLog(`  Section ${idx + 1}:`);
        this.addLog(`    ├─ Height: ${section.height} mm (${(section.height / 1000).toFixed(1)}m)`);
        this.addLog(`    ├─ Base Diameter: ${section.diameter_bottom} mm`);
        this.addLog(`    ├─ Top Diameter: ${section.diameter_top} mm`);
        this.addLog(`    └─ Wall Thickness: ${section.thickness} mm`);
      });

      this.addLog('📊 EXTRACTED PLATFORMS:');
      platforms.forEach((platform, idx) => {
        this.addLog(`  Platform ${idx + 1} @ ${platform.height}m:`);
        this.addLog(`    ├─ Antennas: ${platform.antennas.length} units`);
        this.addLog(`    ├─ RRUs: ${platform.rrus.length} units`);
        this.addLog(`    └─ Other Equipment: ${platform.other_equipment.length} units`);
      });

      this.addLog('========================================');

      return {
        sections,
        platforms,
        extractionLog: this.log,
      };
    } catch (error) {
      this.addLog(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Extract tower geometry from model
   * NOTE: Currently returns default Python script configuration (15m tower)
   * Tower dimensions are kept constant; only equipment counts are extracted from model
   */
  private async extractTowerGeometry(): Promise<TowerSection[]> {
    this.addLog('📐 Using default tower geometry from Python script...');

    // Python script standard: 15m monopole tower
    const sections: TowerSection[] = [{
      height: 15000,        // 15 meters
      diameter_bottom: 628, // 628mm base
      diameter_top: 250,    // 250mm top
      thickness: 5,         // 5mm wall thickness
    }];

    this.addLog(`  ✅ Tower: 15m height, 628mm base, 250mm top, 5mm thickness`);

    return sections;
  }
  

  /**
   * Extract platform data and associated equipment
   */
  private async extractPlatforms(): Promise<CrownPlatform[]> {
    this.addLog('🏗️ Extracting platforms...');

    // First, show ALL elements in the model for debugging
    // await this.debugListAllElements('platform search');

    try {
      // Query for platform elements
      const platformQuery = `
        SELECT
          ECInstanceId as elementId,
          UserLabel as displayLabel,
          CodeValue,
          Origin
        FROM BisCore.GeometricElement3d
        WHERE (UserLabel LIKE '%pl1%' OR UserLabel LIKE '%pl2%' OR UserLabel LIKE '%platform%')
        AND UserLabel NOT LIKE '%VF-%'
        ORDER BY UserLabel
      `;

      const platformResults = this.iModel.createQueryReader(platformQuery);
      const platformMap = new Map<number, { height: number; label: string }>();

      for await (const row of platformResults) {
        const label = (row.displayLabel || row.codeValue || '').toString().toLowerCase();
        const origin = row.origin as { z: number } | undefined;

        // Determine platform number
        let platformNum = 1;
        if (label.includes('pl2') || label.includes('platform 2')) {
          platformNum = 2;
        } else if (label.includes('pl1') || label.includes('platform 1')) {
          platformNum = 1;
        }

        const height = platformNum === 1 ? 14.0 : 11.0;

        this.addLog(`  Platform ${platformNum}: "${row.displayLabel}" at ${height.toFixed(1)}m`);
        platformMap.set(platformNum, { height, label: row.displayLabel || '' });
      }

      // If no platforms found, use defaults
      if (platformMap.size === 0) {
        this.addLog('  ⚠️ No platforms found in model, using default configuration');
        platformMap.set(1, { height: 14.0, label: 'Platform 1 (default)' });
        platformMap.set(2, { height: 11.0, label: 'Platform 2 (default)' });
      }

      // Build crown platforms with equipment
      const platforms: CrownPlatform[] = [];

      for (const [platformNum, platformInfo] of platformMap.entries()) {
        this.addLog(`  📦 Processing ${platformInfo.label}...`);

        const platform: CrownPlatform = {
          height: platformInfo.height,
          platform_weight_kg: platformNum === 1 ? 150 : 120,
          platform_wind_area_m2: platformNum === 1 ? 1.5 : 1.3,
          cf: 1.5,
          antennas: [],
          rrus: [],
          other_equipment: [],
        };

        // Extract equipment for this platform
        if (this.elementExtractor) {
          const equipment = await this.extractEquipmentForPlatform(platformNum);
          platform.antennas = equipment.antennas;
          platform.rrus = equipment.rrus;
          platform.other_equipment = equipment.other;

          this.addLog(`    ├─ Antennas: ${platform.antennas.length}`);
          this.addLog(`    ├─ RRUs: ${platform.rrus.length}`);
          this.addLog(`    └─ Other equipment: ${platform.other_equipment.length}`);
        }

        platforms.push(platform);
      }

      return platforms.sort((a, b) => b.height - a.height); // Sort by height descending
    } catch (error) {
      this.addLog(`  ❌ Platform extraction error: ${error}`);
      // Return default platforms on error
      return this.getDefaultPlatforms();
    }
  }

  /**
   * Extract equipment for a specific platform
   */
  private async extractEquipmentForPlatform(platformNum: number): Promise<{
    antennas: Antenna[];
    rrus: RRU[];
    other: Equipment[];
  }> {
    const antennas: Antenna[] = [];
    const rrus: RRU[] = [];
    const other: Equipment[] = [];

    if (!this.elementExtractor) {
      return { antennas, rrus, other };
    }

    // Get all equipment elements
    const allElements = this.elementExtractor.getAllExtractedElements();

    for (const element of allElements) {
      const label = element.displayLabel.toUpperCase();

      // Check if equipment belongs to this platform
      const belongsToPlatform =
        label.includes(`-P${platformNum}`) ||
        label.includes(`-P${platformNum}U`) ||
        label.includes(`-P${platformNum}L`) ||
        label.includes(`-P${platformNum}E`);

      if (!belongsToPlatform) {
        continue;
      }

      // Get metadata for weight and specs
      const metadata = this.metadataManager.getElementMetadata(element.elementId);
      const weight = metadata?.metadata?.weight_kg || this.getDefaultWeight(element.category);
      const windArea = metadata?.metadata?.wind_area_m2 || this.getDefaultWindArea(element.category);

      if (element.category === 'Antenna') {
        antennas.push({
          type: element.displayLabel,
          weight_kg: Number(weight),
          wind_area_m2: Number(windArea),
          cf: 1.2,
        });
        this.addLog(`      🔹 Antenna: ${element.displayLabel} (${weight}kg)`);
      } else if (element.category === 'RRU') {
        rrus.push({
          type: element.displayLabel,
          weight_kg: Number(weight),
          wind_area_m2: Number(windArea),
          cf: 1.0,
        });
        this.addLog(`      🔹 RRU: ${element.displayLabel} (${weight}kg)`);
      } else if (element.category === 'Microlink') {
        other.push({
          type: element.displayLabel,
          weight_kg: Number(weight),
          wind_area_m2: Number(windArea),
          cf: 1.0,
        });
        this.addLog(`      🔹 Microlink: ${element.displayLabel} (${weight}kg)`);
      }
    }

    return { antennas, rrus, other };
  }

  /**
   * Get default weight based on equipment category
   */
  private getDefaultWeight(category: string): number {
    switch (category) {
      case 'Antenna':
        return 40;
      case 'RRU':
        return 30;
      case 'Microlink':
        return 25;
      default:
        return 20;
    }
  }

  /**
   * Get default wind area based on equipment category
   */
  private getDefaultWindArea(category: string): number {
    switch (category) {
      case 'Antenna':
        return 1.5;
      case 'RRU':
        return 0.6;
      case 'Microlink':
        return 0.3;
      default:
        return 0.5;
    }
  }

  /**
   * Get default platform configuration (fallback when model extraction fails)
   * Returns platforms with Python script specifications but NO equipment
   * Equipment should be extracted from model or set by user
   */
  private getDefaultPlatforms(): CrownPlatform[] {
    this.addLog('  ⚠️ Using default empty platforms (equipment should be extracted from model)');
    return [
      {
        height: 14.0,
        platform_weight_kg: 150,
        platform_wind_area_m2: 1.5,
        cf: 1.5,
        antennas: [],
        rrus: [],
        other_equipment: [],
      },
      {
        height: 11.0,
        platform_weight_kg: 120,
        platform_wind_area_m2: 1.3,
        cf: 1.5,
        antennas: [],
        rrus: [],
        other_equipment: [],
      },
    ];
  }

  /**
   * Get extraction log
   */
  public getLog(): string[] {
    return [...this.log];
  }
}
