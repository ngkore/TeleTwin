import { BaseDevice, TelemetryData } from './common';

export interface MicrolinkDevice extends BaseDevice {
  specifications: MicrolinkSpecifications;
  linkPartner?: string; // ID of the partner device
}

export interface MicrolinkSpecifications {
  frequency: number; // in GHz
  channelBandwidth: number; // in MHz
  modulation: ModulationType;
  capacity: number; // in Mbps
  range: number; // in kilometers
  antennaSize: number; // in meters
  transmitPower: number; // in dBm
  receiverSensitivity: number; // in dBm
  adaptiveModulation: boolean;
}

export enum ModulationType {
  QPSK = "qpsk",
  QAM_16 = "16qam",
  QAM_32 = "32qam",
  QAM_64 = "64qam",
  QAM_128 = "128qam",
  QAM_256 = "256qam",
  QAM_512 = "512qam",
  QAM_1024 = "1024qam"
}

export enum LinkState {
  UP = "up",
  DOWN = "down",
  DEGRADED = "degraded",
  MAINTENANCE = "maintenance"
}

export interface MicrolinkTelemetry extends TelemetryData {
  // Link Performance
  receivedSignalLevel: number; // RSL in dBm
  transmitPowerLevel: number; // in dBm
  linkMargin: number; // in dB
  bitErrorRate: number; // BER
  blockErrorRate: number; // BLER
  unavailableTime: number; // in seconds

  // Adaptive Modulation
  currentModulation: ModulationType;
  modulationEfficiency: number; // bits per symbol
  modulationChanges: number; // count of changes

  // Throughput
  currentCapacity: number; // in Mbps
  utilization: {
    transmitted: number; // in percentage
    received: number; // in percentage
  };

  // Quality Metrics
  signalToNoiseRatio: number; // in dB
  signalQuality: number; // in dB
  fading: {
    frequency: number; // fading frequency in Hz
    depth: number; // fading depth in dB
  };

  // Environmental Effects
  rainAttenuation: number; // in dB
  atmosphericAttenuation: number; // in dB
  multipathFading: number; // in dB

  // Equipment Status
  temperature: {
    outdoor: number; // in Celsius
    indoor: number;
    transmitter: number;
    receiver: number;
  };
  humidity: number; // in percentage

  // Power System
  dcVoltage: number; // in volts
  dcCurrent: number; // in amperes
  powerConsumption: number; // in watts
  batteryBackup: {
    voltage: number;
    chargeLevel: number; // in percentage
    timeRemaining: number; // in minutes
  };

  // Antenna Alignment
  azimuthAlignment: number; // in degrees
  elevationAlignment: number; // in degrees
  crossPolarization: number; // in dB

  // Protection Switching
  protectionActive: boolean;
  switchingCount: number;
  lastSwitchTime?: Date;

  // Ethernet Interface
  ethernetPorts: {
    portId: number;
    status: 'up' | 'down';
    speed: number; // in Mbps
    duplex: 'full' | 'half';
    errors: number;
  }[];

  // Link State
  linkState: LinkState;
  linkQuality: number; // in percentage
}