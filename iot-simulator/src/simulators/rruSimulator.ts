/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


import { v4 as uuidv4 } from 'uuid';
import { RRUDevice, RRUTelemetry, RadioTechnology, DuplexMode, DeviceStatus, DeviceType } from '../types';
import { DataGenerators } from '../utils';

export class RRUSimulator {
  private device: RRUDevice;
  private sequenceNumber = 0;

  constructor(name: string, location: { lat: number; lng: number; alt: number }) {
    this.device = {
      id: name, // Use the structured ID passed as name instead of random UUID
      name,
      type: DeviceType.RRU,
      location: {
        latitude: location.lat,
        longitude: location.lng,
        altitude: location.alt
      },
      installationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      lastMaintenance: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      status: DeviceStatus.ONLINE,
      firmware: "RRU-FW-" + DataGenerators.randomFloat(2.0, 4.5).toFixed(1),
      serialNumber: "RRU" + Date.now().toString().slice(-8),
      specifications: {
        technology: this.getRandomTechnology(),
        frequencyBands: this.getRandomFrequencyBands(),
        maxOutputPower: DataGenerators.randomFloat(40, 46), // dBm
        numberOfCarriers: DataGenerators.randomInt(1, 6),
        numberOfSectors: DataGenerators.randomInt(1, 3),
        duplexMode: Math.random() > 0.5 ? DuplexMode.FDD : DuplexMode.TDD,
        bandwidthSupport: [5, 10, 15, 20], // MHz
        antennaConnectors: DataGenerators.randomInt(2, 8)
      }
    };
  }

  private getRandomTechnology(): RadioTechnology {
    const technologies = Object.values(RadioTechnology);
    return technologies[Math.floor(Math.random() * technologies.length)];
  }

  private getRandomFrequencyBands(): string[] {
    const allBands = ["700MHz", "850MHz", "1800MHz", "1900MHz", "2100MHz", "2600MHz"];
    const numBands = DataGenerators.randomInt(1, 3);
    const selectedBands: string[] = [];

    for (let i = 0; i < numBands; i++) {
      const band = allBands[Math.floor(Math.random() * allBands.length)];
      if (!selectedBands.includes(band)) {
        selectedBands.push(band);
      }
    }

    return selectedBands;
  }

  generateTelemetry(): RRUTelemetry {
    this.sequenceNumber++;

    // RRU internal temperature: 25-45°C typical, higher under load
    const ambientTemp = DataGenerators.generateTemperature(25, 12);
    const hour = new Date().getHours();
    const trafficLoad = hour >= 8 && hour <= 22 ? DataGenerators.randomFloat(50, 85) : DataGenerators.randomFloat(20, 45);

    // Temperature increases with load
    const loadTempIncrease = (trafficLoad / 100) * 20; // up to +20°C under full load
    const internalTemp = ambientTemp + loadTempIncrease + DataGenerators.randomFloat(-3, 3);

    // Power consumption based on technology (from vendor datasheets)
    // 4G LTE RRUs: 240-280W typical, 5G NR RRUs: 280-350W typical
    const is5G = this.device.specifications.technology === RadioTechnology.NR_5G;
    const specPower = is5G ? 320 : 280; // watts (5G RRUs consume more power)
    const voltage = DataGenerators.randomFloat(47.5, 52.5); // -48V DC system (±10%)

    // Actual power varies with traffic load: base 30% + variable 70% based on load
    const actualPower = specPower * (0.3 + 0.7 * (trafficLoad / 100)) + DataGenerators.randomFloat(-10, 10);

    // Receiver sensitivity is a FIXED specification, not random!
    // Typical values: -106 dBm for Huawei/Ericsson/Nokia
    const rxSensitivity = -106.0; // dBm (constant spec)

    return {
      deviceId: this.device.id,
      timestamp: new Date(),
      sequenceNumber: this.sequenceNumber,

      // RF Performance - REALISTIC VALUES
      transmitPower: DataGenerators.randomFloat(40, this.device.specifications.maxOutputPower), // dBm (40W = 46 dBm)
      receiveSensitivity: rxSensitivity, // FIXED spec value, not random!
      noiseFloor: DataGenerators.randomFloat(-116, -114), // dBm (thermal noise + noise figure)
      adjacentChannelPower: DataGenerators.randomFloat(-48, -43), // dBc (spec: < -45 dBc)
      spuriousEmissions: DataGenerators.randomFloat(-68, -60), // dBm (spec: < -60 dBm)

      // Signal strength: Received signal from mobile devices at RRU
      // Typical range: -60 dBm (very close) to -110 dBm (cell edge)
      // Varies with traffic load and environmental conditions
      signalStrength: DataGenerators.randomFloat(-95, -65) + (trafficLoad > 70 ? -5 : 0) + (ambientTemp > 40 ? -3 : 0),

      // Digital Signal Processing
      cpriDataRate: DataGenerators.randomFloat(2400, 9830), // Mbps (CPRI: Option 3 = 2.4G, Option 7 = 9.8G)
      digitalPredistortion: {
        enabled: Math.random() > 0.1, // 90% chance enabled (modern RRUs use DPD)
        efficiency: DataGenerators.randomFloat(88, 96) // DPD improves efficiency
      },

      // Carrier Aggregation
      activeCarriers: Math.max(1, Math.min(this.device.specifications.numberOfCarriers,
                               Math.ceil((trafficLoad / 100) * this.device.specifications.numberOfCarriers))),
      carrierPower: Array.from({ length: this.device.specifications.numberOfCarriers },
        () => DataGenerators.randomFloat(38, 43)), // dBm per carrier

      // Quality Metrics
      errorVectorMagnitude: DataGenerators.randomFloat(1.5, 4), // EVM% (spec: < 5% for LTE)
      modulationQuality: DataGenerators.randomFloat(28, 35), // dB (higher is better)

      // Environmental - REALISTIC TEMPERATURE RANGES
      temperature: {
        internal: Math.min(50, internalTemp), // RRU internal: 25-50°C
        external: ambientTemp, // Ambient temperature
        rfModule: Math.min(65, internalTemp + DataGenerators.randomFloat(8, 15)), // RF module runs hotter: 40-65°C
        powerAmplifier: Math.min(85, Math.max(55, internalTemp + 15 + (trafficLoad / 100) * 25)) // PA: 55-85°C under load
      },
      humidity: DataGenerators.randomFloat(20, 70),

      // Power Management - REALISTIC VALUES
      dcVoltage: voltage,
      dcCurrent: actualPower / voltage, // I = P/V
      powerConsumption: actualPower,
      powerAmplifierEfficiency: DataGenerators.randomFloat(38, 48), // PA efficiency 40-45% typical

      // Cooling System
      fanSpeed: Array.from({ length: DataGenerators.randomInt(2, 4) },
        () => {
          // Fan speed increases with temperature
          const baseFanSpeed = 2500;
          const tempFactor = Math.max(0, (internalTemp - 25) / 25); // increases with temp
          return baseFanSpeed + tempFactor * 2500 + DataGenerators.randomFloat(-200, 200);
        }),
      coolingEfficiency: Math.max(65, Math.min(95, 100 - (internalTemp - 25) * 1.5)), // efficiency decreases with heat

      // Alarm Status - REALISTIC THRESHOLDS
      overTemperatureAlarm: internalTemp > 50 || this.device.specifications.technology.includes('5G') && internalTemp > 45,
      highVswrAlarm: DataGenerators.randomFloat(1, 2.5) > 2.0, // VSWR alarm at 2.0
      powerSupplyAlarm: voltage < 43 || voltage > 57, // -48V ±20% alarm
      communicationAlarm: Math.random() < 0.02, // 2% chance (more realistic)

      // Performance Counters
      uptime: DataGenerators.generateUptime(6500), // MTBF ~9 months for RRUs
      availability: DataGenerators.randomFloat(99.7, 99.95), // carrier-grade availability
      meanTimeBetweenFailures: DataGenerators.randomFloat(6000, 8760) // hours (8-12 months)
    };
  }

  getDevice(): RRUDevice {
    return { ...this.device };
  }

  updateStatus(status: DeviceStatus): void {
    this.device.status = status;
  }
}