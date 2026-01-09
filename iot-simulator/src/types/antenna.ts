/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


import { BaseDevice, TelemetryData } from './common';

export interface AntennaDevice extends BaseDevice {
  specifications: AntennaSpecifications;
}

export interface AntennaSpecifications {
  frequencyBand: string; // e.g., "2.4GHz", "5GHz", "700MHz"
  polarization: PolarizationType;
  gain: number; // in dBi
  beamwidth: {
    horizontal: number; // in degrees
    vertical: number; // in degrees
  };
  maxPower: number; // in watts
  vswr: number; // Voltage Standing Wave Ratio
  impedance: number; // in ohms
  connectorType: string; // e.g., "N-type", "SMA"
}

export enum PolarizationType {
  VERTICAL = "vertical",
  HORIZONTAL = "horizontal",
  CIRCULAR_LEFT = "circular_left",
  CIRCULAR_RIGHT = "circular_right",
  DUAL = "dual"
}

export interface AntennaTelemetry extends TelemetryData {
  // RF Performance
  transmitPower: number; // in dBm
  receivePower: number; // in dBm
  vswr: number; // Voltage Standing Wave Ratio
  returnLoss: number; // in dB
  signalStrength: number; // in dBm
  noiseFloor: number; // in dBm
  snr: number; // Signal-to-Noise Ratio in dB

  // Environmental
  temperature: number; // in Celsius
  humidity: number; // in percentage
  windSpeed: number; // in km/h
  windDirection: number; // in degrees

  // Mechanical
  azimuthAngle: number; // in degrees
  elevationAngle: number; // in degrees
  tiltAngle: number; // in degrees
  vibration: {
    x: number; // in g-force
    y: number;
    z: number;
  };

  // Electrical
  voltage: number; // in volts
  current: number; // in amperes
  powerConsumption: number; // in watts

  // Quality metrics
  dataRate: number; // in Mbps
  packetLoss: number; // in percentage
  latency: number; // in milliseconds
  uptime: number; // in percentage
}