/*---------------------------------------------------------------------------------------------
 * Telemetry History Manager
 *
 * Stores historical telemetry data for graphing and trend analysis.
 * Maintains a rolling window of telemetry readings per equipment.
 *--------------------------------------------------------------------------------------------*/

import { TooltipTelemetryData } from './types';

export interface TelemetryHistoryPoint {
  timestamp: number;
  temperature?: number;
  powerConsumption?: number;
  signalStrength?: number;
  healthScore?: number;
}

export interface EquipmentHistory {
  elementId: string;
  displayLabel: string;
  history: TelemetryHistoryPoint[];
}

/**
 * Manages historical telemetry data for equipment
 */
export class TelemetryHistoryManager {
  private static _instance?: TelemetryHistoryManager;
  private _history: Map<string, TelemetryHistoryPoint[]> = new Map();
  private _maxHistoryPoints = 100; // Keep last 100 data points per equipment
  private _listeners: Set<() => void> = new Set();

  public static getInstance(): TelemetryHistoryManager {
    if (!this._instance) {
      this._instance = new TelemetryHistoryManager();
    }
    return this._instance;
  }

  /**
   * Add new telemetry reading to history
   */
  public addReading(elementId: string, telemetry: TooltipTelemetryData): void {
    if (!this._history.has(elementId)) {
      this._history.set(elementId, []);
    }

    const history = this._history.get(elementId)!;

    const point: TelemetryHistoryPoint = {
      timestamp: telemetry.lastUpdate ? new Date(telemetry.lastUpdate).getTime() : Date.now(),
      temperature: telemetry.temperature,
      powerConsumption: telemetry.powerConsumption,
      signalStrength: telemetry.signalStrength,
      healthScore: telemetry.healthScore,
    };

    history.push(point);

    // Keep only the last N points
    if (history.length > this._maxHistoryPoints) {
      history.shift();
    }

    this.notifyListeners();
  }

  /**
   * Add multiple readings at once
   */
  public addReadings(telemetryList: TooltipTelemetryData[]): void {
    telemetryList.forEach(telemetry => {
      this.addReading(telemetry.elementId, telemetry);
    });
  }

  /**
   * Get history for specific equipment
   */
  public getHistory(elementId: string): TelemetryHistoryPoint[] {
    return this._history.get(elementId) || [];
  }

  /**
   * Get all equipment with history
   */
  public getAllEquipmentHistory(): EquipmentHistory[] {
    const result: EquipmentHistory[] = [];

    this._history.forEach((history, elementId) => {
      if (history.length > 0) {
        result.push({
          elementId,
          displayLabel: elementId,
          history
        });
      }
    });

    return result;
  }

  /**
   * Clear history for specific equipment
   */
  public clearHistory(elementId: string): void {
    this._history.delete(elementId);
    this.notifyListeners();
  }

  /**
   * Clear all history
   */
  public clearAllHistory(): void {
    this._history.clear();
    this.notifyListeners();
  }

  /**
   * Get statistics about stored history
   */
  public getStats() {
    let totalPoints = 0;
    this._history.forEach(history => {
      totalPoints += history.length;
    });

    return {
      equipmentCount: this._history.size,
      totalDataPoints: totalPoints,
      maxPointsPerEquipment: this._maxHistoryPoints
    };
  }

  /**
   * Add listener for history updates
   */
  public addListener(listener: () => void): void {
    this._listeners.add(listener);
  }

  /**
   * Remove listener
   */
  public removeListener(listener: () => void): void {
    this._listeners.delete(listener);
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this._listeners.forEach(listener => listener());
  }

  /**
   * Set maximum history points per equipment
   */
  public setMaxHistoryPoints(max: number): void {
    this._maxHistoryPoints = max;

    // Trim existing histories
    this._history.forEach(history => {
      while (history.length > max) {
        history.shift();
      }
    });
  }
}
