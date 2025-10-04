/*---------------------------------------------------------------------------------------------
 * Telemetry Synchronization Service
 *
 * Manages periodic synchronization of telemetry data from IoT simulation to iTwin elements.
 * Fetches telemetry data every 15 seconds, maps it to elements, and applies property updates.
 *--------------------------------------------------------------------------------------------*/

import { ModelElementExtractor } from './ModelElementExtractor';
import { TelemetryMapper } from './TelemetryMapper';
import { iTwinPropertyUpdater } from './iTwinPropertyUpdater';
import { ModelElement, TelemetryData, iTwinPropertyUpdate, SyncConfig, SyncStatus } from "./types";

export class TelemetrySync {
  private extractor: ModelElementExtractor;
  private mapper: TelemetryMapper;
  private updater: iTwinPropertyUpdater;
  private config: SyncConfig;
  private status: SyncStatus;
  private syncInterval?: ReturnType<typeof setInterval>;
  private listeners: ((updates: iTwinPropertyUpdate[]) => void)[] = [];

  constructor(extractor: ModelElementExtractor, mapper: TelemetryMapper, updater: iTwinPropertyUpdater, config: SyncConfig) {
    this.extractor = extractor;
    this.mapper = mapper;
    this.updater = updater;
    this.config = config;
    this.status = {
      isRunning: false,
      lastSync: '',
      successCount: 0,
      errorCount: 0,
      elementsUpdated: 0,
      currentBatch: 0
    };
  }

  /**
   * Start periodic telemetry synchronization
   */
  async startSync(): Promise<void> {
    if (this.status.isRunning) {
      return;
    }

    this.status.isRunning = true;
    await this.performSync();

    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, this.config.pollInterval);
  }

  /**
   * Stop telemetry synchronization
   */
  stopSync(): void {
    if (!this.status.isRunning) {
      return;
    }

    this.status.isRunning = false;

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }

  /**
   * Perform one synchronization cycle
   */
  private async performSync(): Promise<void> {
    try {
      const telemetryData = await this.fetchTelemetryData();

      if (!telemetryData || telemetryData.length === 0) {
        return;
      }

      const updates = await this.processTelemetryBatch(telemetryData);

      if (updates.length > 0) {
        await this.updater.updateElementProperties(updates);
        this.notifyListeners(updates);

        this.status.successCount++;
        this.status.elementsUpdated += updates.length;
        this.status.lastSync = new Date().toISOString();
      }

    } catch (error) {
      this.status.errorCount++;
    }
  }

  /**
   * Fetch telemetry data from simulation endpoint
   */
  private async fetchTelemetryData(): Promise<TelemetryData[]> {
    try {
      const response = await fetch(`${this.config.simulatorEndpoint}/api/telemetry/latest`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.telemetry || [];

    } catch (error) {
      return [];
    }
  }

  /**
   * Process telemetry batch and create property updates
   */
  private async processTelemetryBatch(telemetryData: TelemetryData[]): Promise<iTwinPropertyUpdate[]> {
    const updates: iTwinPropertyUpdate[] = [];
    const extractedElements = this.extractor.getAllExtractedElements();

    for (const telemetry of telemetryData) {
      try {
        const matchingElement = this.findMatchingElement(telemetry, extractedElements);

        if (matchingElement) {
          const vodafoneInfo = this.extractor.getVodafoneEquipment(matchingElement.displayLabel);

          if (vodafoneInfo) {
            const update = this.mapper.mapTelemetryToiTwin(telemetry, {
              element: matchingElement,
              vodafone: vodafoneInfo
            });

            updates.push(update);
          }
        }

      } catch (error) {
        // Skip failed telemetry processing
      }
    }

    return updates;
  }

  /**
   * Find matching iTwin element for telemetry deviceId
   */
  private findMatchingElement(telemetry: TelemetryData, elements: ModelElement[]): ModelElement | undefined {
    // Direct match by display label
    let match = elements.find(e => e.displayLabel === telemetry.deviceId);
    if (match) return match;

    // Parse device ID and match by components
    const deviceIdParts = telemetry.deviceId.split('-');

    if (deviceIdParts.length >= 3) {
      const equipmentType = deviceIdParts[0]?.toLowerCase();
      const sector = deviceIdParts[1];
      const platform = deviceIdParts[2]?.includes('P1') ? 'P1' : 'P2';

      match = elements.find(e => {
        const label = e.displayLabel.toLowerCase();
        return label.includes(equipmentType) &&
               label.includes(sector) &&
               label.includes(platform);
      });

      if (match) return match;
    }

    return undefined;
  }

  /**
   * Add listener for property updates
   */
  addUpdateListener(listener: (updates: iTwinPropertyUpdate[]) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove listener
   */
  removeUpdateListener(listener: (updates: iTwinPropertyUpdate[]) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners about updates
   */
  private notifyListeners(updates: iTwinPropertyUpdate[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(updates);
      } catch (error) {
        // Listener error should not affect other listeners
      }
    });
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Manual sync trigger
   */
  async triggerManualSync(): Promise<iTwinPropertyUpdate[]> {
    try {
      const telemetryData = await this.fetchTelemetryData();
      const updates = await this.processTelemetryBatch(telemetryData);

      if (updates.length > 0) {
        await this.updater.updateElementProperties(updates);
        this.notifyListeners(updates);
      }

      return updates;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get sync statistics
   */
  getStatistics(): any {
    const uptime = this.status.isRunning ? 'Running' : 'Stopped';
    const successRate = this.status.successCount + this.status.errorCount > 0
      ? (this.status.successCount / (this.status.successCount + this.status.errorCount)) * 100
      : 0;

    return {
      status: uptime,
      lastSync: this.status.lastSync,
      totalSyncs: this.status.successCount + this.status.errorCount,
      successRate: `${successRate.toFixed(1)}%`,
      elementsUpdated: this.status.elementsUpdated,
      errors: this.status.errorCount,
      configuration: {
        endpoint: this.config.simulatorEndpoint,
        pollInterval: `${this.config.pollInterval}ms`,
        batchSize: this.config.batchSize
      }
    };
  }
}