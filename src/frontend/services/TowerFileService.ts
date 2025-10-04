/*---------------------------------------------------------------------------------------------
 * Tower File Management Service
 * Handles folder path selection, file scanning, and CSV parsing for tower data
 *--------------------------------------------------------------------------------------------*/

import { TeleTwinViewerApp } from "../app/TeleTwinViewerApp";

export interface TowerData {
  id: string;
  name: string;
  location: string;
  type: 'telecom' | 'radio' | 'cellular' | 'broadcast';
  status: 'active' | 'maintenance' | 'offline';
  lastUpdated: string;
  bimPath: string;
  csvPath: string;
  metadataPath: string;
  bimFileSize: string;
  bimFileSizeBytes: number;
  details?: Record<string, any>;
}

export interface TowerFiles {
  baseName: string;
  bimFile: string;
  csvFile: string;
  metadataFile: string;
}

export class TowerFileService {
  private static STORAGE_KEY = 'teletwin_folder_path';

  /**
   * Get the stored folder path from localStorage
   */
  static getStoredFolderPath(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Store the folder path in localStorage
   */
  static storeFolderPath(folderPath: string): void {
    localStorage.setItem(this.STORAGE_KEY, folderPath);
  }

  /**
   * Clear the stored folder path
   */
  static clearStoredFolderPath(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Parse CSV file content into key-value pairs
   */
  private static parseCSV(csvContent: string): Record<string, any> {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const result: Record<string, any> = {};
    
    if (lines.length === 0) return result;

    // Check if it's a standard CSV with headers
    const firstLine = lines[0].trim();
    const hasHeaders = firstLine.includes(',');
    
    if (hasHeaders && lines.length >= 2) {
      // Standard CSV format with headers
      const headers = firstLine.split(',').map(h => h.trim().replace(/"/g, ''));
      const values = lines[1].split(',').map(v => v.trim().replace(/"/g, ''));
      
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          result[header] = values[index];
        }
      });
    } else {
      // Key-value pairs format (key: value or key=value)
      lines.forEach(line => {
        const colonMatch = line.match(/^([^:]+):\s*(.*)$/);
        const equalMatch = line.match(/^([^=]+)=\s*(.*)$/);
        
        if (colonMatch) {
          result[colonMatch[1].trim()] = colonMatch[2].trim();
        } else if (equalMatch) {
          result[equalMatch[1].trim()] = equalMatch[2].trim();
        }
      });
    }
    
    return result;
  }

  /**
   * Extract tower data from CSV content
   */
  private static extractTowerDataFromCSV(baseName: string, csvData: Record<string, any>): Partial<TowerData> {
    const data: Partial<TowerData> = {};
    
    // Map common field names to our tower properties
    const fieldMappings: Record<string, keyof TowerData> = {
      'name': 'name',
      'tower_name': 'name',
      'title': 'name',
      'location': 'location',
      'site_location': 'location',
      'address': 'location',
      'type': 'type',
      'tower_type': 'type',
      'category': 'type',
      'status': 'status',
      'tower_status': 'status',
      'state': 'status',
      'last_updated': 'lastUpdated',
      'updated': 'lastUpdated',
      'date': 'lastUpdated',
      'modified': 'lastUpdated'
    };

    // Extract mapped fields
    Object.entries(csvData).forEach(([csvKey, csvValue]) => {
      const normalizedKey = csvKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const mappedField = fieldMappings[normalizedKey];
      
      if (mappedField && csvValue) {
        switch (mappedField) {
          case 'type':
            // Normalize type values
            const typeValue = csvValue.toLowerCase();
            if (['telecom', 'radio', 'cellular', 'broadcast'].includes(typeValue)) {
              data[mappedField] = typeValue as TowerData['type'];
            } else {
              data[mappedField] = 'telecom'; // default
            }
            break;
          case 'status':
            // Normalize status values
            const statusValue = csvValue.toLowerCase();
            if (['active', 'maintenance', 'offline'].includes(statusValue)) {
              data[mappedField] = statusValue as TowerData['status'];
            } else if (statusValue.includes('maintain') || statusValue.includes('repair')) {
              data[mappedField] = 'maintenance';
            } else if (statusValue.includes('down') || statusValue.includes('inactive')) {
              data[mappedField] = 'offline';
            } else {
              data[mappedField] = 'active'; // default
            }
            break;
          default:
            data[mappedField] = csvValue;
        }
      }
    });

    // Set defaults if not found in CSV
    if (!data.name) {
      data.name = baseName.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    if (!data.type) {
      data.type = 'telecom';
    }
    if (!data.status) {
      data.status = 'active';
    }
    if (!data.location) {
      data.location = 'Unknown Location';
    }
    if (!data.lastUpdated) {
      data.lastUpdated = new Date().toISOString().split('T')[0];
    }

    return data;
  }

  /**
   * Scan folder for tower file sets (name.bim, name.csv, name_metadata.csv)
   */
  static async scanFolderForTowers(folderPath: string): Promise<TowerData[]> {
    try {
      // This would need to be implemented with an IPC call to scan the folder
      // For now, we'll simulate the functionality
      
      // In a real implementation, you'd call:
      // const files = await TeleTwinViewerApp.ipcCall.scanFolder(folderPath);
      
      // Scan folder for files
      const files = await this.simulateFileScan(folderPath);
      
      const towerSets = new Map<string, TowerFiles>();
      
      // Group files by base name
      files.forEach(file => {
        const fileName = file.replace(/^.*[\\\/]/, ''); // Get filename only
        const ext = fileName.split('.').pop()?.toLowerCase();
        
        if (ext === 'bim') {
          const baseName = fileName.replace(/\.bim$/, '');
          if (!towerSets.has(baseName)) {
            towerSets.set(baseName, { baseName, bimFile: file, csvFile: '', metadataFile: '' });
          } else {
            towerSets.get(baseName)!.bimFile = file;
          }
        } else if (ext === 'csv') {
          if (fileName.includes('_metadata.csv')) {
            const baseName = fileName.replace(/_metadata\.csv$/, '');
            if (!towerSets.has(baseName)) {
              towerSets.set(baseName, { baseName, bimFile: '', csvFile: '', metadataFile: file });
            } else {
              towerSets.get(baseName)!.metadataFile = file;
            }
          } else {
            const baseName = fileName.replace(/\.csv$/, '');
            if (!towerSets.has(baseName)) {
              towerSets.set(baseName, { baseName, bimFile: '', csvFile: file, metadataFile: '' });
            } else {
              towerSets.get(baseName)!.csvFile = file;
            }
          }
        }
      });

      // Process each complete tower set
      const towers: TowerData[] = [];
      
      for (const [baseName, fileSet] of towerSets.entries()) {
        if (fileSet.bimFile && fileSet.csvFile) {
          try {
            // Read and parse CSV file
            const csvContent = await this.readFile(fileSet.csvFile);
            const csvData = this.parseCSV(csvContent);
            
            // Extract tower data
            const extractedData = this.extractTowerDataFromCSV(baseName, csvData);
            
            // Read metadata if available
            let metadataData = {};
            if (fileSet.metadataFile) {
              try {
                const metadataContent = await this.readFile(fileSet.metadataFile);
                metadataData = this.parseCSV(metadataContent);
              } catch (error) {
                console.warn(`Failed to read metadata for ${baseName}:`, error);
              }
            }

            // Get BIM file size
            let bimFileSize = '0 B';
            let bimFileSizeBytes = 0;
            try {
              const fileInfo = await TeleTwinViewerApp.ipcCall.getFileInfo(fileSet.bimFile);
              bimFileSize = fileInfo.sizeFormatted;
              bimFileSizeBytes = fileInfo.size;
            } catch (error) {
              console.warn(`Failed to get file size for ${baseName}:`, error);
            }

            const tower: TowerData = {
              id: baseName,
              name: extractedData.name || baseName,
              location: extractedData.location || 'Unknown Location',
              type: extractedData.type || 'telecom',
              status: extractedData.status || 'active',
              lastUpdated: extractedData.lastUpdated || new Date().toISOString().split('T')[0],
              bimPath: fileSet.bimFile,
              csvPath: fileSet.csvFile,
              metadataPath: fileSet.metadataFile,
              bimFileSize: bimFileSize,
              bimFileSizeBytes: bimFileSizeBytes,
              details: { ...csvData, ...metadataData }
            };

            towers.push(tower);
          } catch (error) {
            console.error(`Failed to process tower ${baseName}:`, error);
          }
        }
      }

      return towers;
    } catch (error) {
      console.error('Failed to scan folder for towers:', error);
      throw error;
    }
  }

  /**
   * Simulate file scanning - replace with actual IPC call
   */
  private static async simulateFileScan(folderPath: string): Promise<string[]> {
    try {
      return await TeleTwinViewerApp.ipcCall.scanFolder(folderPath);
    } catch (error) {
      console.error('Failed to scan folder:', error);
      return [];
    }
  }

  /**
   * Read file content - replace with actual IPC call
   */
  private static async readFile(filePath: string): Promise<string> {
    return await TeleTwinViewerApp.ipcCall.readFile(filePath);
  }
}