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
    console.log(`[StructuralAnalysis] ${logMessage}`);
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
        this.addLog(`    ├─ Platform Weight: ${platform.platform_weight_kg} kg`);
        this.addLog(`    ├─ Platform Wind Area: ${platform.platform_wind_area_m2} m²`);
        this.addLog(`    ├─ Antennas: ${platform.antennas.length} units (Total: ${platform.antennas.reduce((sum, a) => sum + a.weight_kg, 0).toFixed(1)} kg)`);
        this.addLog(`    ├─ RRUs: ${platform.rrus.length} units (Total: ${platform.rrus.reduce((sum, r) => sum + r.weight_kg, 0).toFixed(1)} kg)`);
        this.addLog(`    └─ Other Equipment: ${platform.other_equipment.length} units (Total: ${platform.other_equipment.reduce((sum, e) => sum + e.weight_kg, 0).toFixed(1)} kg)`);
      });

      const totalEquipmentWeight = platforms.reduce((sum, p) => {
        return sum + p.platform_weight_kg +
          p.antennas.reduce((s, a) => s + a.weight_kg, 0) +
          p.rrus.reduce((s, r) => s + r.weight_kg, 0) +
          p.other_equipment.reduce((s, e) => s + e.weight_kg, 0);
      }, 0);

      this.addLog(`📊 TOTAL EQUIPMENT WEIGHT: ${totalEquipmentWeight.toFixed(1)} kg`);
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
   * Searches for elements with "tower" in their name/label
   */
  private async extractTowerGeometry(): Promise<TowerSection[]> {
    this.addLog('📐 Extracting tower geometry...');

    // First, show ALL elements in the model for debugging
    // await this.debugListAllElements('tower search');

    try {
      const query = `
        SELECT
          ECInstanceId as elementId,
          UserLabel as displayLabel,
          CodeValue,
          Origin,
          BBoxLow,
          BBoxHigh
        FROM BisCore.GeometricElement3d
        WHERE (UserLabel LIKE '%tower%' OR UserLabel LIKE '%pole%' OR UserLabel LIKE '%monopole%')
        AND UserLabel NOT LIKE '%VF-%'
        LIMIT 10
      `;

      const results = this.iModel.createQueryReader(query);
      const sections: TowerSection[] = [];

      for await (const row of results) {
        const label = (row.displayLabel || row.codeValue || '').toString().toLowerCase();
        this.addLog(`  Found element: "${row.displayLabel}" (ID: ${row.elementId})`);

        // Extract bounding box for dimensions
        if (row.bBoxLow && row.bBoxHigh) {
          const bBoxLow = row.bBoxLow as { x: number; y: number; z: number };
          const bBoxHigh = row.bBoxHigh as { x: number; y: number; z: number };

          const height = Math.abs(bBoxHigh.z - bBoxLow.z) * 1000; // Convert to mm
          const diameterAtBase = Math.max(
            Math.abs(bBoxHigh.x - bBoxLow.x),
            Math.abs(bBoxHigh.y - bBoxLow.y)
          ) * 1000;

          // Estimate top diameter (typically 40% of base for monopoles)
          const diameterAtTop = diameterAtBase * 0.4;

          this.addLog(`    Height: ${height.toFixed(0)} mm`);
          this.addLog(`    Base diameter: ${diameterAtBase.toFixed(0)} mm`);
          this.addLog(`    Top diameter: ${diameterAtTop.toFixed(0)} mm (estimated)`);

          sections.push({
            height: height,
            diameter_bottom: diameterAtBase,
            diameter_top: diameterAtTop,
            thickness: 5, // Default 5mm thickness
          });

          break; // Use first tower found
        }
      }

      // Fallback to default if nothing found
      if (sections.length === 0 || sections[0].height === 0 || sections[0].diameter_bottom === 0 || sections[0].diameter_top === 0) {
        this.addLog('  ⚠️ No tower geometry found in model, using default 15m tower '+sections[0]?.height+'mm'+sections[0]?.diameter_bottom+'mm'+sections[0]?.diameter_top+'mm');
        sections.push({
          height: 15000,
          diameter_bottom: 628,
          diameter_top: 250,
          thickness: 5,
        });
      }

      return sections;
    } catch (error) {
      this.addLog(`  ❌ Tower extraction error: ${error}`);
      // Return default on error
      return [
        {
          height: 15000,
          diameter_bottom: 628,
          diameter_top: 250,
          thickness: 5,
        },
      ];
    }
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
   * Get default platform configuration
   */
  private getDefaultPlatforms(): CrownPlatform[] {
    return [
      {
        height: 14.0,
        platform_weight_kg: 150,
        platform_wind_area_m2: 1.5,
        cf: 1.5,
        antennas: [
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        ],
        rrus: [
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        ],
        other_equipment: [{ type: 'Microlink', weight_kg: 25, wind_area_m2: 0.3, cf: 1.0 }],
      },
      {
        height: 11.0,
        platform_weight_kg: 120,
        platform_wind_area_m2: 1.3,
        cf: 1.5,
        antennas: [
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
          { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        ],
        rrus: [
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
          { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        ],
        other_equipment: [{ type: 'Power Distribution', weight_kg: 20, wind_area_m2: 0.25, cf: 1.0 }],
      },
    ];
  }

  /**
   * Get extraction log
   */
  public getLog(): string[] {
    return [...this.log];
  }

  /**
   * Debug: List all elements in the model to help find correct naming patterns
   */
  private async debugListAllElements(context: string): Promise<void> {
    this.addLog(`🔍 DEBUG (${context}): Listing all elements in model...`);

    try {
      const debugQuery = `
        SELECT
          ECInstanceId as elementId,
          UserLabel as displayLabel,
          CodeValue
        FROM BisCore.GeometricElement3d
        WHERE UserLabel IS NOT NULL
        AND UserLabel != ''
        ORDER BY UserLabel
        LIMIT 50
      `;

      const results = this.iModel.createQueryReader(debugQuery);
      let count = 0;

      this.addLog(`  📋 Elements found in model:`);
      for await (const row of results) {
        count++;
        const label = row.displayLabel || row.codeValue || 'unnamed';
        this.addLog(`    [${count}] "${label}" (ID: ${row.elementId})`);
      }

      if (count === 0) {
        this.addLog(`  ⚠️ No elements found with UserLabel!`);
      } else {
        this.addLog(`  ✅ Total: ${count} elements listed (max 50)`);
      }

      // Also check BisCore.Element (not just GeometricElement3d)
      const allElementsQuery = `
        SELECT
          ECInstanceId as elementId,
          UserLabel as displayLabel,
          CodeValue
        FROM BisCore.Element
        WHERE UserLabel IS NOT NULL
        AND UserLabel != ''
        ORDER BY UserLabel
        LIMIT 50
      `;

      const allResults = this.iModel.createQueryReader(allElementsQuery);
      let allCount = 0;

      this.addLog(`  📋 All BisCore.Element with labels:`);
      for await (const row of allResults) {
        allCount++;
        const label = row.displayLabel || row.codeValue || 'unnamed';
        this.addLog(`    [${allCount}] "${label}" (ID: ${row.elementId})`);
      }

      this.addLog(`  ✅ Total BisCore.Element: ${allCount} (max 50)`);

    } catch (error) {
      this.addLog(`  ❌ DEBUG query failed: ${error}`);
    }
  }
}
