/*---------------------------------------------------------------------------------------------
 * IoT Integration Type Definitions
 *
 * This module defines all TypeScript interfaces and types used throughout the IoT integration
 * system. These types ensure type safety across telemetry data processing, element mapping,
 * and property updates.
 *--------------------------------------------------------------------------------------------*/

/**
 * Represents a model element extracted from the iTwin 3D model
 * Contains element identification and properties needed for telemetry mapping
 */
export interface ModelElement {
  elementId: string;
  className: string;
  displayLabel: string;
  category: string;
  modelId: string;
  properties: { [key: string]: any };
}

/**
 * Equipment-specific information following Vodafone tower naming convention
 * Used to map telemetry data to specific tower equipment based on type and location
 */
export interface VodafoneElement {
  elementId: string;
  equipmentType: 'antenna' | 'rru' | 'microlink';
  platform: 1 | 2;
  sector: 'N' | 'E' | 'S' | 'W';
  position?: 'upper' | 'lower';
  vendor: string;
  model: string;
}

/**
 * Telemetry data structure received from IoT simulation or devices
 * Contains real-time sensor readings and device state information
 */
export interface TelemetryData {
  deviceId: string;
  timestamp: string;
  sequenceNumber: number;
  [key: string]: any;
}

/**
 * Property update structure for applying telemetry data to iTwin elements
 * Maps processed telemetry values to element properties with timestamp tracking
 */
export interface iTwinPropertyUpdate {
  elementId: string;
  properties: { [propertyName: string]: any };
  timestamp: string;
}

/**
 * Defines how a telemetry field maps to an iTwin element property
 * Includes optional transformation function and unit information
 */
export interface MappingRule {
  telemetryField: string;
  iTwinProperty: string;
  transform?: (value: any) => any;
  unit?: string;
}

/**
 * Configuration for telemetry synchronization service
 * Controls polling interval, endpoint, and batch processing settings
 */
export interface SyncConfig {
  simulatorEndpoint: string;
  pollInterval: number;
  maxRetries: number;
  batchSize: number;
}

/**
 * Real-time status information for telemetry synchronization
 * Tracks sync state, success/error counts, and batch progress
 */
export interface SyncStatus {
  isRunning: boolean;
  lastSync: string;
  successCount: number;
  errorCount: number;
  elementsUpdated: number;
  currentBatch: number;
}

/**
 * High-level configuration for IoT integration system
 * Allows customization of endpoints, intervals, and feature flags
 */
export interface IntegrationConfig {
  simulatorEndpoint?: string;
  syncInterval?: number;
  autoStart?: boolean;
  enableLogging?: boolean;
}

/**
 * Statistical summary of integration system status
 * Provides overview of element counts, sync state, and error tracking
 */
export interface IntegrationStats {
  elementsFound: number;
  elementsMapping: number;
  syncStatus: string;
  lastSync: string;
  totalUpdates: number;
  errorCount: number;
}

/**
 * Telemetry data structure for tooltip display
 * Simplified view of element telemetry for UI rendering
 */
export interface TooltipTelemetryData {
  elementId: string;
  displayLabel: string;
  status?: string;
  healthScore?: number;
  temperature?: number;
  powerConsumption?: number;
  signalStrength?: number;
  vendor?: string;
  model?: string;
  platform?: number;
  sector?: string;
  lastUpdate?: string;
}