import { BaseDevice, TelemetryData } from './common';

export interface RRUDevice extends BaseDevice {
  specifications: RRUSpecifications;
}

export interface RRUSpecifications {
  technology: RadioTechnology;
  frequencyBands: string[]; // e.g., ["1800MHz", "2100MHz"]
  maxOutputPower: number; // in dBm
  numberOfCarriers: number;
  numberOfSectors: number;
  duplexMode: DuplexMode;
  bandwidthSupport: number[]; // in MHz
  antennaConnectors: number;
}

export enum RadioTechnology {
  GSM = "gsm",
  UMTS = "umts",
  LTE = "lte",
  NR_5G = "5g_nr"
}

export enum DuplexMode {
  FDD = "fdd", // Frequency Division Duplex
  TDD = "tdd"  // Time Division Duplex
}

export interface RRUTelemetry extends TelemetryData {
  // RF Performance
  transmitPower: number; // in dBm per carrier
  receiveSensitivity: number; // in dBm
  noiseFloor: number; // in dBm
  adjacentChannelPower: number; // in dBc
  spuriousEmissions: number; // in dBm
  signalStrength: number; // in dBm - received signal from mobile devices

  // Digital Signal Processing
  cpriDataRate: number; // Common Public Radio Interface in Mbps
  digitalPredistortion: {
    enabled: boolean;
    efficiency: number; // in percentage
  };

  // Carrier Aggregation
  activeCarriers: number;
  carrierPower: number[]; // power per carrier in dBm

  // Quality Metrics
  errorVectorMagnitude: number; // EVM in percentage
  modulationQuality: number; // in dB

  // Environmental
  temperature: {
    internal: number; // in Celsius
    external: number;
    rfModule: number;
    powerAmplifier: number;
  };
  humidity: number; // in percentage

  // Power Management
  dcVoltage: number; // in volts
  dcCurrent: number; // in amperes
  powerConsumption: number; // in watts
  powerAmplifierEfficiency: number; // in percentage

  // Cooling System
  fanSpeed: number[]; // RPM for each fan
  coolingEfficiency: number; // in percentage

  // Alarm Status
  overTemperatureAlarm: boolean;
  highVswrAlarm: boolean;
  powerSupplyAlarm: boolean;
  communicationAlarm: boolean;

  // Performance Counters
  uptime: number; // in percentage
  availability: number; // in percentage
  meanTimeBetweenFailures: number; // in hours
}