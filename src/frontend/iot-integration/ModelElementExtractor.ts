/*---------------------------------------------------------------------------------------------
 * Model Element Extractor
 *
 * This service extracts tower equipment elements from the iTwin 3D model and maintains
 * mappings between model elements and equipment specifications. It queries the iModel for
 * elements matching specific naming patterns and organizes them by equipment type.
 *
 * Key Features:
 * - Extracts elements by ID patterns (VF-ANT, VF-RRU, VF-MW)
 * - Maintains vendor and model information for each equipment
 * - Validates extracted elements against expected configurations
 * - Provides categorized access to elements by type
 *--------------------------------------------------------------------------------------------*/

import { IModelConnection } from "@itwin/core-frontend";
import { ModelElement, VodafoneElement } from "./types";

export class ModelElementExtractor {
  private iModelConnection: IModelConnection;
  private extractedElements: Map<string, ModelElement> = new Map();
  private vodafoneMapping: Map<string, VodafoneElement> = new Map();

  constructor(iModelConnection: IModelConnection) {
    this.iModelConnection = iModelConnection;
    this.initializeVodafoneMapping();
  }

  /**
   * Initialize equipment specifications and mappings
   * This defines the expected tower configuration with vendor and model information
   */
  private initializeVodafoneMapping(): void {
    const equipmentSpecs = [
      // Platform 1 Equipment
      { id: 'VF-ANT-001-N-L18-P1', type: 'antenna', platform: 1, sector: 'N', vendor: 'Kathrein', model: 'KMW_APXVAALL18_43_1D65' },
      { id: 'VF-ANT-002-E-N35-P1', type: 'antenna', platform: 1, sector: 'E', vendor: 'Ericsson', model: 'AIR_3268' },
      { id: 'VF-ANT-003-S-L9G-P1', type: 'antenna', platform: 1, sector: 'S', vendor: 'CommScope', model: 'AHLX_65C15V_VTM' },
      { id: 'VF-ANT-004-W-MB-P1', type: 'antenna', platform: 1, sector: 'W', vendor: 'Huawei', model: 'ATR4518R6v06' },

      { id: 'VF-RRU-001-N-40W-P1', type: 'rru', platform: 1, sector: 'N', vendor: 'Ericsson', model: 'Radio_4449_B66' },
      { id: 'VF-RRU-002-E-40W-P1', type: 'rru', platform: 1, sector: 'E', vendor: 'Huawei', model: 'RRU5502' },
      { id: 'VF-RRU-003-S-40W-P1', type: 'rru', platform: 1, sector: 'S', vendor: 'Nokia', model: 'FRMA_B66' },
      { id: 'VF-RRU-004-W-40W-P1', type: 'rru', platform: 1, sector: 'W', vendor: 'ZTE', model: 'ZXSDR_R8882' },

      { id: 'VF-MW-001-BH-750M-P1E', type: 'microlink', platform: 1, sector: 'E', vendor: 'Ericsson', model: 'MINI_LINK_6351' },

      // Platform 2 Equipment
      { id: 'VF-ANT-005-N-L18-P2', type: 'antenna', platform: 2, sector: 'N', vendor: 'Kathrein', model: 'KMW_APXVAALL18_43_1D65' },
      { id: 'VF-ANT-006-E-N35-P2', type: 'antenna', platform: 2, sector: 'E', vendor: 'Ericsson', model: 'AIR_3268' },
      { id: 'VF-ANT-007-S-L9G-P2', type: 'antenna', platform: 2, sector: 'S', vendor: 'CommScope', model: 'AHLX_65C15V_VTM' },
      { id: 'VF-ANT-008-W-MB-P2', type: 'antenna', platform: 2, sector: 'W', vendor: 'Huawei', model: 'ATR4518R6v06' },

      { id: 'VF-RRU-005-N-40W-P2U', type: 'rru', platform: 2, sector: 'N', position: 'upper', vendor: 'Ericsson', model: 'Radio_4449_B66' },
      { id: 'VF-RRU-006-N-40W-P2L', type: 'rru', platform: 2, sector: 'N', position: 'lower', vendor: 'Huawei', model: 'RRU5502' },
      { id: 'VF-RRU-007-E-40W-P2U', type: 'rru', platform: 2, sector: 'E', position: 'upper', vendor: 'Nokia', model: 'FRMA_B66' },
      { id: 'VF-RRU-008-E-40W-P2L', type: 'rru', platform: 2, sector: 'E', position: 'lower', vendor: 'ZTE', model: 'ZXSDR_R8882' },
      { id: 'VF-RRU-009-S-40W-P2U', type: 'rru', platform: 2, sector: 'S', position: 'upper', vendor: 'Ericsson', model: 'Radio_4449_B66' },
      { id: 'VF-RRU-010-S-40W-P2L', type: 'rru', platform: 2, sector: 'S', position: 'lower', vendor: 'Huawei', model: 'RRU5502' },
      { id: 'VF-RRU-011-W-40W-P2U', type: 'rru', platform: 2, sector: 'W', position: 'upper', vendor: 'Nokia', model: 'FRMA_B66' },
      { id: 'VF-RRU-012-W-40W-P2L', type: 'rru', platform: 2, sector: 'W', position: 'lower', vendor: 'ZTE', model: 'ZXSDR_R8882' }
    ];

    equipmentSpecs.forEach(spec => {
      this.vodafoneMapping.set(spec.id, {
        elementId: spec.id,
        equipmentType: spec.type as any,
        platform: spec.platform as any,
        sector: spec.sector as any,
        position: spec.position as any,
        vendor: spec.vendor,
        model: spec.model
      });
    });
  }

  /**
   * Extract tower equipment elements from the iModel
   * Queries for elements with VF- prefix and extracts their properties
   *
   * @returns Array of extracted model elements with full property sets
   */
  async extractElementsByIds(): Promise<ModelElement[]> {
    try {
      const query = `
        SELECT
          ECInstanceId as elementId,
          UserLabel as displayLabel,
          ECClassId as className,
          Model.Id as modelId,
          CodeValue
        FROM BisCore.Element
        WHERE UserLabel IS NOT NULL
        AND UserLabel != ''
        AND UserLabel LIKE 'VF-%'
        ORDER BY UserLabel
      `;

      const results = this.iModelConnection.createQueryReader(query);
      const foundElements: ModelElement[] = [];

      for await (const row of results) {
        const displayLabel = row.displayLabel || row.codeValue || `Element_${row.elementId}`;

        // Validate element naming pattern matches expected format (VF- prefix)
        if (!displayLabel.match(/^VF-(ANT|RRU|MW)-\d{3}-/)) {
          continue;
        }

        const element: ModelElement = {
          elementId: row.elementId,
          className: row.className,
          displayLabel: displayLabel,
          category: this.determineCategory(displayLabel),
          modelId: row.modelId,
          properties: await this.extractElementProperties(row.elementId)
        };

        // Prevent duplicate entries
        if (this.extractedElements.has(element.displayLabel)) {
          continue;
        }

        this.extractedElements.set(element.displayLabel, element);
        foundElements.push(element);
      }

      this.validateExtractedElements(foundElements);
      return foundElements;

    } catch (error) {
      throw error;
    }
  }

  /**
   * Extract all properties for a specific element
   *
   * @param elementId - The element's unique identifier
   * @returns Object containing all element properties
   */
  private async extractElementProperties(elementId: string): Promise<{ [key: string]: any }> {
    try {
      const propertyQuery = `SELECT * FROM BisCore.Element WHERE ECInstanceId = ${elementId}`;
      const propResults = this.iModelConnection.createQueryReader(propertyQuery);
      const properties: { [key: string]: any } = {};

      for await (const row of propResults) {
        Object.keys(row).forEach(key => {
          if (key !== 'ECInstanceId' && row[key] !== null) {
            properties[key] = row[key];
          }
        });
      }
      return properties;
    } catch (error) {
      return {};
    }
  }

  /**
   * Determine equipment category from element label
   *
   * @param displayLabel - Element's display label (e.g., VF-ANT-001-N-L18-P1)
   * @returns Equipment category: Antenna, RRU, Microlink, or Unknown
   */
  private determineCategory(displayLabel: string): string {
    const label = displayLabel.toUpperCase();
    if (label.startsWith('VF-ANT-')) return 'Antenna';
    if (label.startsWith('VF-RRU-')) return 'RRU';
    if (label.startsWith('VF-MW-')) return 'Microlink';
    return 'Unknown';
  }

  /**
   * Validate extracted elements against expected configuration
   * Reports missing elements and provides statistics by category
   *
   * @param foundElements - Array of extracted elements to validate
   */
  private validateExtractedElements(foundElements: ModelElement[]): void {
    const foundIds = foundElements.map(e => e.displayLabel);
    const expectedIds = Array.from(this.vodafoneMapping.keys());
    const missing = expectedIds.filter(id => !foundIds.includes(id));

    const byCategory = foundElements.reduce((acc, elem) => {
      acc[elem.category] = (acc[elem.category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
  }

  /**
   * Get element by its display label
   *
   * @param displayLabel - Element's display label
   * @returns ModelElement if found, undefined otherwise
   */
  getElementByDisplayLabel(displayLabel: string): ModelElement | undefined {
    return this.extractedElements.get(displayLabel);
  }

  /**
   * Get equipment specifications for an element
   *
   * @param elementId - Element identifier (display label)
   * @returns VodafoneElement with vendor and model info, or undefined
   */
  getVodafoneEquipment(elementId: string): VodafoneElement | undefined {
    return this.vodafoneMapping.get(elementId);
  }

  /**
   * Get all extracted elements
   *
   * @returns Array of all extracted model elements
   */
  getAllExtractedElements(): ModelElement[] {
    return Array.from(this.extractedElements.values());
  }

  /**
   * Get elements filtered by category
   *
   * @param category - Equipment category to filter by
   * @returns Array of elements matching the category
   */
  getElementsByCategory(category: string): ModelElement[] {
    return this.getAllExtractedElements().filter(e => e.category === category);
  }

  /**
   * Generate detailed extraction report
   * Provides statistics and element listings for validation
   *
   * @returns Comprehensive extraction report object
   */
  generateExtractionReport(): any {
    const elements = this.getAllExtractedElements();
    const expectedIds = Array.from(this.vodafoneMapping.keys());

    return {
      timestamp: new Date().toISOString(),
      totalElementsExtracted: elements.length,
      expectedElements: expectedIds.length,
      extractionRate: `${Math.round((elements.length / expectedIds.length) * 100)}%`,
      elementsByCategory: {
        antennas: elements.filter(e => e.category === 'Antenna').length,
        rrus: elements.filter(e => e.category === 'RRU').length,
        microlinks: elements.filter(e => e.category === 'Microlink').length
      },
      elementDetails: elements.map(e => ({
        displayLabel: e.displayLabel,
        category: e.category,
        elementId: e.elementId,
        modelId: e.modelId,
        vendor: this.getVodafoneEquipment(e.displayLabel)?.vendor || 'Unknown',
        model: this.getVodafoneEquipment(e.displayLabel)?.model || 'Unknown'
      }))
    };
  }
}