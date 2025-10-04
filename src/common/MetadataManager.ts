/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { IModelConnection } from "@itwin/core-frontend";

/**
 * Interface for metadata row from CSV
 */
export interface MetadataRow {
  name: string;
  [key: string]: string | number | boolean;
}

/**
 * Interface for matched metadata with element information
 */
export interface ElementMetadata {
  elementId: string;
  annotation: string;
  metadata: MetadataRow;
  matchedAt: Date;
}

/**
 * Event listener type for metadata updates
 */
export type MetadataUpdateListener = (metadata: ElementMetadata[]) => void;

/**
 * Manages CSV metadata parsing, storage, and element matching
 */
export class MetadataManager {
  private static _instance?: MetadataManager;
  private _csvData: MetadataRow[] = [];
  private _elementMetadata: Map<string, ElementMetadata> = new Map();
  private _listeners: Set<MetadataUpdateListener> = new Set();
  private _csvHeaders: string[] = [];

  public static getInstance(): MetadataManager {
    if (!this._instance) {
      this._instance = new MetadataManager();
    }
    return this._instance;
  }

  /**
   * Parse CSV content and store metadata
   */
  public async loadCSVData(csvContent: string): Promise<void> {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }

      // Parse headers
      this._csvHeaders = this.parseCSVLine(lines[0]);
      
      // Validate that 'name' column exists
      const nameIndex = this._csvHeaders.findIndex(header => 
        header.toLowerCase().trim() === 'name'
      );
      
      if (nameIndex === -1) {
        throw new Error('CSV must contain a "name" column to match with annotations');
      }

      // Parse data rows
      this._csvData = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === this._csvHeaders.length) {
          const row: MetadataRow = { name: '' };
          
          this._csvHeaders.forEach((header, index) => {
            const value = values[index]?.trim();
            // Try to convert to number if possible, otherwise keep as string
            if (value !== undefined && value !== '') {
              const numValue = Number(value);
              row[header] = isNaN(numValue) ? value : numValue;
            } else {
              row[header] = value || '';
            }
          });
          
          if (row.name) {
            this._csvData.push(row);
          }
        }
      }

      console.log(`Loaded ${this._csvData.length} metadata rows from CSV`);
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading CSV data:', error);
      throw error;
    }
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Match element annotations with CSV metadata
   */
  public async matchElementsWithMetadata(iModel: IModelConnection): Promise<void> {
    if (this._csvData.length === 0) {
      console.warn('No CSV data loaded to match with elements');
      return;
    }

    try {
      // Query for elements with UserLabel (annotations)
      const query = `
        SELECT ECInstanceId, UserLabel, CodeValue 
        FROM BisCore.Element 
        WHERE UserLabel IS NOT NULL 
        AND UserLabel != ''
      `;

      const result = iModel.createQueryReader(query);
      const matches: ElementMetadata[] = [];

      for await (const row of result) {
        const elementId = row.id as string;
        const annotation = row.userLabel as string;
        const codeValue = row.codeValue as string;

        // Try to match with CSV data by name - improved matching logic
        const metadataRow = this._csvData.find(csvRow => {
          const csvName = csvRow.name.toString().toLowerCase().trim();
          const elementAnnotation = annotation.toLowerCase().trim();
          const elementCodeValue = codeValue ? codeValue.toLowerCase().trim() : '';
          
          console.log(`🔍 Matching attempt: CSV "${csvName}" vs Element "${elementAnnotation}" (Code: "${elementCodeValue}")`);
          
          // Try exact match first
          if (csvName === elementAnnotation || (elementCodeValue && csvName === elementCodeValue)) {
            console.log(`✅ Exact match found: ${csvName}`);
            return true;
          }
          
          // Try partial match - check if CSV name is contained in annotation or vice versa
          if (csvName.includes(elementAnnotation) || elementAnnotation.includes(csvName)) {
            console.log(`✅ Partial match found: ${csvName}`);
            return true;
          }
          
          // Try matching after removing common prefixes/suffixes
          const cleanCsvName = csvName.replace(/^(element|component|part|item)_?/i, '').replace(/_?(element|component|part|item)$/i, '');
          const cleanAnnotation = elementAnnotation.replace(/^(element|component|part|item)_?/i, '').replace(/_?(element|component|part|item)$/i, '');
          
          if (cleanCsvName === cleanAnnotation) {
            console.log(`✅ Clean match found: ${cleanCsvName}`);
            return true;
          }
          
          return false;
        });

        if (metadataRow) {
          const elementMetadata: ElementMetadata = {
            elementId,
            annotation,
            metadata: metadataRow,
            matchedAt: new Date()
          };
          
          matches.push(elementMetadata);
          this._elementMetadata.set(elementId, elementMetadata);
        }
      }

      console.log(`Matched ${matches.length} elements with metadata`);
      this.notifyListeners();
    } catch (error) {
      console.error('Error matching elements with metadata:', error);
      throw error;
    }
  }

  /**
   * Get metadata for a specific element
   */
  public getElementMetadata(elementId: string): ElementMetadata | undefined {
    console.log(`🔍 MetadataManager: Looking for metadata for element: ${elementId}`);
    console.log(`📊 Available metadata elements:`, Array.from(this._elementMetadata.keys()));
    
    const result = this._elementMetadata.get(elementId);
    if (result) {
      console.log(`✅ Found metadata for element ${elementId}:`, result);
    } else {
      console.log(`❌ No metadata found for element ${elementId}`);
      console.log(`📋 Total metadata entries: ${this._elementMetadata.size}`);
      
      // Trigger dynamic matching asynchronously but return undefined immediately
      this.dynamicElementMatch(elementId);
    }
    
    return result;
  }

  /**
   * Get metadata for element with async fallback
   */
  public async getElementMetadataAsync(elementId: string): Promise<ElementMetadata | undefined> {
    let result = this._elementMetadata.get(elementId);
    
    if (!result) {
      console.log(`🔄 Trying dynamic match for element: ${elementId}`);
      result = await this.dynamicElementMatch(elementId);
    }
    
    return result;
  }

  /**
   * Attempt dynamic matching for elements that weren't matched during initial load
   */
  private async dynamicElementMatch(elementId: string): Promise<ElementMetadata | undefined> {
    if (this._csvData.length === 0) {
      console.log('No CSV data available for dynamic matching');
      return undefined;
    }

    try {
      // Get current iModel connection (if available)
      const iModel = (window as any).iModelApp?.iModel;
      if (!iModel) {
        console.log('No iModel available for dynamic matching');
        return undefined;
      }

      console.log(`🔄 Attempting dynamic match for element: ${elementId}`);
      
      // Query for this specific element
      const query = `
        SELECT ECInstanceId, UserLabel, CodeValue
        FROM BisCore.Element
        WHERE ECInstanceId = ${elementId}
      `;

      const result = iModel.createQueryReader(query);
      
      for await (const row of result) {
        const annotation = row.userLabel as string;
        const codeValue = row.codeValue as string;
        
        if (annotation) {
          console.log(`🔍 Dynamic matching: Element annotation "${annotation}"`);
          
          // Use the same improved matching logic
          const metadataRow = this._csvData.find(csvRow => {
            const csvName = csvRow.name.toString().toLowerCase().trim();
            const elementAnnotation = annotation.toLowerCase().trim();
            const elementCodeValue = codeValue ? codeValue.toLowerCase().trim() : '';
            
            // Try exact match first
            if (csvName === elementAnnotation || (elementCodeValue && csvName === elementCodeValue)) {
              return true;
            }
            
            // Try partial match
            if (csvName.includes(elementAnnotation) || elementAnnotation.includes(csvName)) {
              return true;
            }
            
            // Try cleaned match
            const cleanCsvName = csvName.replace(/^(element|component|part|item)_?/i, '').replace(/_?(element|component|part|item)$/i, '');
            const cleanAnnotation = elementAnnotation.replace(/^(element|component|part|item)_?/i, '').replace(/_?(element|component|part|item)$/i, '');
            
            return cleanCsvName === cleanAnnotation;
          });

          if (metadataRow) {
            const elementMetadata: ElementMetadata = {
              elementId,
              annotation,
              metadata: metadataRow,
              matchedAt: new Date()
            };
            
            console.log(`✅ Dynamic match successful! Adding to cache.`);
            this._elementMetadata.set(elementId, elementMetadata);
            this.notifyListeners();
            return elementMetadata;
          }
        }
      }
      
      console.log(`❌ Dynamic match failed for element: ${elementId}`);
      return undefined;
      
    } catch (error) {
      console.error('Error during dynamic element matching:', error);
      return undefined;
    }
  }

  /**
   * Get all matched element metadata
   */
  public getAllElementMetadata(): ElementMetadata[] {
    return Array.from(this._elementMetadata.values());
  }

  /**
   * Get CSV headers
   */
  public getCSVHeaders(): string[] {
    return [...this._csvHeaders];
  }

  /**
   * Get CSV data
   */
  public getCSVData(): MetadataRow[] {
    return [...this._csvData];
  }

  /**
   * Clear all metadata
   */
  public clearMetadata(): void {
    this._csvData = [];
    this._elementMetadata.clear();
    this._csvHeaders = [];
    console.log('🧹 MetadataManager: Cleared all metadata');
    this.notifyListeners();
  }

  /**
   * Complete cleanup and reset - for production use
   */
  public reset(): void {
    this.clearMetadata();
    this._listeners.clear();
    console.log('🔄 MetadataManager: Complete reset performed');
  }

  /**
   * Static method to reset the singleton instance
   */
  public static resetInstance(): void {
    if (this._instance) {
      this._instance.reset();
      this._instance = undefined;
      console.log('🗑️ MetadataManager: Singleton instance reset');
    }
  }

  /**
   * Add listener for metadata updates
   */
  public addListener(listener: MetadataUpdateListener): void {
    this._listeners.add(listener);
  }

  /**
   * Remove listener
   */
  public removeListener(listener: MetadataUpdateListener): void {
    this._listeners.delete(listener);
  }

  /**
   * Notify all listeners of metadata changes
   */
  private notifyListeners(): void {
    const metadata = this.getAllElementMetadata();
    this._listeners.forEach(listener => listener(metadata));
  }

  /**
   * Get statistics about the metadata
   */
  public getStatistics() {
    return {
      totalCSVRows: this._csvData.length,
      matchedElements: this._elementMetadata.size,
      headers: this._csvHeaders,
      matchPercentage: this._csvData.length > 0 ? 
        (this._elementMetadata.size / this._csvData.length) * 100 : 0
    };
  }
}