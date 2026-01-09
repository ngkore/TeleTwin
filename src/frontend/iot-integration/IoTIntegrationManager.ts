/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/



/*---------------------------------------------------------------------------------------------
 * IoT Integration Manager (Singleton)
 *
 * Global singleton that manages the IoT integration system state and coordinates between
 * all services. Provides centralized access to telemetry data, sync status, and element
 * information for widgets and components.
 *--------------------------------------------------------------------------------------------*/

import { IModelConnection } from "@itwin/core-frontend";
import { ModelElementExtractor } from './ModelElementExtractor';
import { TelemetryMapper } from './TelemetryMapper';
import { iTwinPropertyUpdater } from './iTwinPropertyUpdater';
import { TelemetrySync } from './TelemetrySync';
import { iTwinPropertyUpdate, SyncStatus, TooltipTelemetryData } from './types';

export class IoTIntegrationManager {
  private static _instance?: IoTIntegrationManager;

  private extractor?: ModelElementExtractor;
  private mapper?: TelemetryMapper;
  private updater?: iTwinPropertyUpdater;
  private sync?: TelemetrySync;

  private isInitialized = false;
  private telemetryCache: Map<string, TooltipTelemetryData> = new Map();
  private elementIdToLabelMap: Map<string, string> = new Map(); // Maps numeric ID to display label
  private updateListeners: Set<(updates: iTwinPropertyUpdate[]) => void> = new Set();
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): IoTIntegrationManager {
    if (!this._instance) {
      this._instance = new IoTIntegrationManager();
    }
    return this._instance;
  }

  /**
   * Initialize the IoT integration system
   */
  async initialize(iModel: IModelConnection): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.extractor = new ModelElementExtractor(iModel);
      this.mapper = new TelemetryMapper();
      this.updater = new iTwinPropertyUpdater(iModel);

      await this.extractor.extractElementsByIds();

      // Build element ID to label mapping
      const allElements = this.extractor.getAllExtractedElements();
      console.log('[IoTIntegrationManager] Building ID to label mapping for', allElements.length, 'elements');
      allElements.forEach(element => {
        this.elementIdToLabelMap.set(element.elementId, element.displayLabel);
        console.log('[IoTIntegrationManager] Mapped:', element.elementId, '->', element.displayLabel);
      });

      const syncConfig = {
        simulatorEndpoint: 'http://localhost:3001',
        pollInterval: 15000, // 15 seconds
        maxRetries: 3,
        batchSize: 50
      };

      this.sync = new TelemetrySync(this.extractor, this.mapper, this.updater, syncConfig);

      // Listen for telemetry updates
      this.sync.addUpdateListener((updates) => {
        this.handleTelemetryUpdates(updates);
      });

      this.isInitialized = true;

    } catch (error) {
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Start telemetry synchronization
   */
  async startSync(): Promise<void> {
    if (!this.sync) {
      throw new Error('Manager not initialized');
    }

    await this.sync.startSync();
    this.notifyStatusListeners();
  }

  /**
   * Stop telemetry synchronization
   */
  stopSync(): void {
    if (!this.sync) {
      return;
    }

    this.sync.stopSync();
    this.notifyStatusListeners();
  }

  /**
   * Handle incoming telemetry updates
   */
  private handleTelemetryUpdates(updates: iTwinPropertyUpdate[]): void {
    console.log('[IoTIntegrationManager] Handling telemetry updates:', updates.length);

    updates.forEach(update => {
      console.log('[IoTIntegrationManager] Update for element:', {
        elementId: update.elementId,
        deviceId: update.properties.Device_ID,
        status: update.properties.Status
      });

      const tooltipData: TooltipTelemetryData = {
        elementId: update.elementId,
        displayLabel: update.properties.Device_ID || update.elementId,
        status: update.properties.Status,
        healthScore: update.properties.Health_Score,
        temperature: update.properties.Temperature_Celsius || update.properties.Internal_Temperature_Celsius,
        powerConsumption: update.properties.Power_Consumption_Watts,
        signalStrength: update.properties.Signal_Strength_dBm || update.properties.Received_Signal_Level_dBm,
        vendor: update.properties.Vendor,
        model: update.properties.Model,
        platform: update.properties.Platform,
        sector: update.properties.Sector,
        lastUpdate: update.timestamp
      };

      this.telemetryCache.set(update.elementId, tooltipData);
      console.log('[IoTIntegrationManager] Cached telemetry for elementId:', update.elementId);
    });

    console.log('[IoTIntegrationManager] Total cached entries:', this.telemetryCache.size);
    console.log('[IoTIntegrationManager] All cached element IDs:', Array.from(this.telemetryCache.keys()));

    this.notifyUpdateListeners(updates);
    this.notifyStatusListeners();
  }

  /**
   * Get telemetry data for element (for tooltips and widgets)
   * Supports lookup by both numeric ECInstanceId and display label
   */
  getTelemetryForElement(elementId: string): TooltipTelemetryData | undefined {
    console.log('[IoTIntegrationManager] getTelemetryForElement called with:', elementId, 'Type:', typeof elementId);
    console.log('[IoTIntegrationManager] Cache has:', this.telemetryCache.size, 'entries');
    console.log('[IoTIntegrationManager] Cache keys:', Array.from(this.telemetryCache.keys()));

    // Try direct lookup first (by display label)
    let result = this.telemetryCache.get(elementId);

    if (!result) {
      // If not found, try to convert numeric ID to label
      const displayLabel = this.elementIdToLabelMap.get(elementId);
      console.log('[IoTIntegrationManager] Numeric ID', elementId, 'maps to label:', displayLabel);

      if (displayLabel) {
        result = this.telemetryCache.get(displayLabel);
        console.log('[IoTIntegrationManager] Found telemetry using mapped label:', result ? 'YES' : 'NO');
      }
    }

    console.log('[IoTIntegrationManager] Final result:', result ? 'YES' : 'NO');
    return result;
  }

  /**
   * Get all telemetry data
   */
  getAllTelemetry(): TooltipTelemetryData[] {
    return Array.from(this.telemetryCache.values());
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus | undefined {
    return this.sync?.getStatus();
  }

  /**
   * Get all elements
   */
  getAllElements() {
    return this.extractor?.getAllExtractedElements() || [];
  }

  /**
   * Add update listener
   */
  addUpdateListener(listener: (updates: iTwinPropertyUpdate[]) => void): void {
    this.updateListeners.add(listener);
  }

  /**
   * Remove update listener
   */
  removeUpdateListener(listener: (updates: iTwinPropertyUpdate[]) => void): void {
    this.updateListeners.delete(listener);
  }

  /**
   * Add status listener
   */
  addStatusListener(listener: (status: SyncStatus) => void): void {
    this.statusListeners.add(listener);
  }

  /**
   * Remove status listener
   */
  removeStatusListener(listener: (status: SyncStatus) => void): void {
    this.statusListeners.delete(listener);
  }

  /**
   * Notify update listeners
   */
  private notifyUpdateListeners(updates: iTwinPropertyUpdate[]): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(updates);
      } catch (error) {
        // Silent fail
      }
    });
  }

  /**
   * Notify status listeners
   */
  private notifyStatusListeners(): void {
    const status = this.getSyncStatus();
    if (status) {
      this.statusListeners.forEach(listener => {
        try {
          listener(status);
        } catch (error) {
          // Silent fail
        }
      });
    }
  }

  /**
   * Manual sync trigger
   */
  async triggerManualSync(): Promise<void> {
    if (!this.sync) {
      throw new Error('Manager not initialized');
    }

    await this.sync.triggerManualSync();
  }

  /**
   * Check if initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopSync();
    this.telemetryCache.clear();
    this.updateListeners.clear();
    this.statusListeners.clear();
    this.isInitialized = false;
  }

  /**
   * Reset singleton
   */
  static resetInstance(): void {
    if (this._instance) {
      this._instance.dispose();
      this._instance = undefined;
    }
  }
}