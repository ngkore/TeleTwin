// Common types and interfaces for IoT devices

export interface BaseDevice {
  id: string;
  name: string;
  type: DeviceType;
  location: GeoLocation;
  installationDate: Date;
  lastMaintenance: Date;
  status: DeviceStatus;
  firmware: string;
  serialNumber: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude: number;
  address?: string;
}

export interface TelemetryData {
  deviceId: string;
  timestamp: Date;
  sequenceNumber: number;
}

export enum DeviceType {
  ANTENNA = "antenna",
  RRU = "rru",
  MICROLINK = "microlink"
}

export enum DeviceStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  MAINTENANCE = "maintenance",
  WARNING = "warning",
  ERROR = "error"
}

export enum AlarmSeverity {
  CRITICAL = "critical",
  MAJOR = "major",
  MINOR = "minor",
  WARNING = "warning",
  CLEAR = "clear"
}

export interface Alarm {
  id: string;
  deviceId: string;
  severity: AlarmSeverity;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  clearedTimestamp?: Date;
}