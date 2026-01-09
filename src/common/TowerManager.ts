/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


/**
 * Interface for tower data from CSV
 */
export interface TowerData {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  height: number;
  location?: string;
  status?: string;
  operator?: string;
  installDate?: string;
  description?: string;
}

/**
 * Event listener type for tower updates
 */
export type TowerUpdateListener = (towers: TowerData[]) => void;

/**
 * Manages Tower CSV data parsing, storage, and retrieval
 */
export class TowerManager {
  private static _instance?: TowerManager;
  private _towers: TowerData[] = [];
  private _listeners: Set<TowerUpdateListener> = new Set();
  private _csvHeaders: string[] = [];
  private _selectedTower: TowerData | null = null;

  public static getInstance(): TowerManager {
    if (!this._instance) {
      this._instance = new TowerManager();
    }
    return this._instance;
  }

  /**
   * Parse CSV content and store tower data
   */
  public async loadTowerCSVData(csvContent: string): Promise<void> {
    try {
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
      }

      // Parse headers
      this._csvHeaders = this.parseCSVLine(lines[0]);
      
      // Validate required columns
      const requiredHeaders = ['name', 'type', 'latitude', 'longitude', 'height'];
      const missingHeaders = requiredHeaders.filter(header => 
        !this._csvHeaders.some(h => h.toLowerCase().trim() === header.toLowerCase())
      );
      
      if (missingHeaders.length > 0) {
        throw new Error(`CSV must contain these columns: ${missingHeaders.join(', ')}`);
      }

      // Parse data rows
      this._towers = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length === this._csvHeaders.length) {
          try {
            const tower = this.parseTowerRow(this._csvHeaders, values);
            if (tower.name && !isNaN(tower.latitude) && !isNaN(tower.longitude)) {
              this._towers.push(tower);
            }
          } catch (error) {
            console.warn(`Skipping invalid tower row ${i + 1}:`, error);
          }
        }
      }

      console.log(`Loaded ${this._towers.length} towers from CSV`);
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading tower CSV data:', error);
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
   * Parse tower data from CSV row
   */
  private parseTowerRow(headers: string[], values: string[]): TowerData {
    const tower: any = {};
    
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      const value = values[index]?.trim() || '';
      
      switch (key) {
        case 'name':
          tower.name = value;
          break;
        case 'type':
          tower.type = value;
          break;
        case 'latitude':
        case 'lat':
          tower.latitude = parseFloat(value);
          if (isNaN(tower.latitude)) {
            throw new Error(`Invalid latitude value: ${value}`);
          }
          break;
        case 'longitude':
        case 'lon':
        case 'lng':
          tower.longitude = parseFloat(value);
          if (isNaN(tower.longitude)) {
            throw new Error(`Invalid longitude value: ${value}`);
          }
          break;
        case 'height':
          tower.height = parseFloat(value);
          if (isNaN(tower.height)) {
            throw new Error(`Invalid height value: ${value}`);
          }
          break;
        case 'location':
          tower.location = value;
          break;
        case 'status':
          tower.status = value;
          break;
        case 'operator':
          tower.operator = value;
          break;
        case 'installdate':
        case 'install_date':
        case 'installation_date':
          tower.installDate = value;
          break;
        case 'description':
        case 'notes':
          tower.description = value;
          break;
      }
    });

    return tower as TowerData;
  }

  /**
   * Get all towers
   */
  public getAllTowers(): TowerData[] {
    return [...this._towers];
  }

  /**
   * Get tower by name
   */
  public getTowerByName(name: string): TowerData | undefined {
    return this._towers.find(tower => 
      tower.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  }

  /**
   * Get towers by type
   */
  public getTowersByType(type: string): TowerData[] {
    return this._towers.filter(tower => 
      tower.type.toLowerCase().trim() === type.toLowerCase().trim()
    );
  }

  /**
   * Get CSV headers
   */
  public getCSVHeaders(): string[] {
    return [...this._csvHeaders];
  }

  /**
   * Clear all tower data
   */
  public clearTowerData(): void {
    this._towers = [];
    this._csvHeaders = [];
    this._selectedTower = null;
    console.log('🧹 TowerManager: Cleared all tower data');
    this.notifyListeners();
  }

  /**
   * Complete cleanup and reset - for production use
   */
  public reset(): void {
    this.clearTowerData();
    this._listeners.clear();
    console.log('🔄 TowerManager: Complete reset performed');
  }

  /**
   * Static method to reset the singleton instance
   */
  public static resetInstance(): void {
    if (this._instance) {
      this._instance.reset();
      this._instance = undefined;
      console.log('🗑️ TowerManager: Singleton instance reset');
    }
  }

  /**
   * Set selected tower
   */
  public setSelectedTower(tower: TowerData | null): void {
    this._selectedTower = tower;
    this.notifyListeners();
  }

  /**
   * Get selected tower
   */
  public getSelectedTower(): TowerData | null {
    return this._selectedTower;
  }

  /**
   * Add listener for tower updates
   */
  public addListener(listener: TowerUpdateListener): void {
    this._listeners.add(listener);
  }

  /**
   * Remove listener
   */
  public removeListener(listener: TowerUpdateListener): void {
    this._listeners.delete(listener);
  }

  /**
   * Notify all listeners of tower changes
   */
  private notifyListeners(): void {
    const towers = this.getAllTowers();
    this._listeners.forEach(listener => listener(towers));
  }

  /**
   * Get statistics about the towers
   */
  public getStatistics() {
    const types = new Set(this._towers.map(t => t.type));
    const avgHeight = this._towers.length > 0 
      ? this._towers.reduce((sum, t) => sum + t.height, 0) / this._towers.length 
      : 0;
    
    return {
      totalTowers: this._towers.length,
      towerTypes: Array.from(types),
      averageHeight: avgHeight,
      headers: this._csvHeaders,
      heightRange: {
        min: this._towers.length > 0 ? Math.min(...this._towers.map(t => t.height)) : 0,
        max: this._towers.length > 0 ? Math.max(...this._towers.map(t => t.height)) : 0
      }
    };
  }

  /**
   * Get towers within a geographical bounds
   */
  public getTowersInBounds(
    minLat: number, 
    maxLat: number, 
    minLng: number, 
    maxLng: number
  ): TowerData[] {
    return this._towers.filter(tower => 
      tower.latitude >= minLat && tower.latitude <= maxLat &&
      tower.longitude >= minLng && tower.longitude <= maxLng
    );
  }
}