/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


import { v4 as uuidv4 } from 'uuid';
import { AntennaDevice, AntennaTelemetry, PolarizationType, DeviceStatus, DeviceType } from '../types';
import { DataGenerators } from '../utils';

export class AntennaSimulator {
  private device: AntennaDevice;
  private sequenceNumber = 0;

  constructor(name: string, location: { lat: number; lng: number; alt: number }) {
    this.device = {
      id: name, // Use the structured ID passed as name instead of random UUID
      name,
      type: DeviceType.ANTENNA,
      location: {
        latitude: location.lat,
        longitude: location.lng,
        altitude: location.alt
      },
      installationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random date within last year
      lastMaintenance: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within last 3 months
      status: DeviceStatus.ONLINE,
      firmware: "ANT-FW-" + DataGenerators.randomFloat(1.0, 3.5).toFixed(1),
      serialNumber: "ANT" + Date.now().toString().slice(-8),
      specifications: {
        frequencyBand: this.getRandomFrequencyBand(),
        polarization: this.getRandomPolarization(),
        gain: DataGenerators.randomFloat(12, 18), // Typical antenna gain in dBi
        beamwidth: {
          horizontal: DataGenerators.randomFloat(60, 120),
          vertical: DataGenerators.randomFloat(15, 30)
        },
        maxPower: DataGenerators.randomFloat(10, 100), // watts
        vswr: DataGenerators.randomFloat(1.1, 1.5),
        impedance: 50, // Standard 50 ohms
        connectorType: Math.random() > 0.5 ? "N-type" : "SMA"
      }
    };
  }

  private getRandomFrequencyBand(): string {
    const bands = ["700MHz", "850MHz", "1800MHz", "1900MHz", "2100MHz", "2600MHz"];
    return bands[Math.floor(Math.random() * bands.length)];
  }

  private getRandomPolarization(): PolarizationType {
    const polarizations = Object.values(PolarizationType);
    return polarizations[Math.floor(Math.random() * polarizations.length)];
  }

  generateTelemetry(): AntennaTelemetry {
    this.sequenceNumber++;

    // Simulate some realistic variations
    const wind = DataGenerators.generateWind();
    const temperature = DataGenerators.generateTemperature(25, 15);

    // Passive antennas consume near-zero power, active antennas ~15-25W
    // Assuming these are mostly passive with some active components
    const isActiveAntenna = this.device.specifications.frequencyBand.includes("5G") ||
                           this.device.specifications.frequencyBand.includes("3500MHz");
    const basePower = isActiveAntenna ? 20 : 8; // watts
    const powerConsumption = basePower + DataGenerators.randomFloat(-3, 3);

    // Generate signal strength based on time of day (more traffic during day)
    const hour = new Date().getHours();
    const trafficLoad = hour >= 8 && hour <= 22 ? DataGenerators.randomFloat(60, 90) : DataGenerators.randomFloat(20, 40);

    // Realistic signal strength: -70 dBm (excellent, close to tower) to -110 dBm (edge of coverage)
    // Add variation based on time and weather
    const baseSignal = DataGenerators.randomFloat(-75, -95); // typical urban range
    const weatherDegradation = (temperature > 35 || temperature < 5) ? -5 : 0; // extreme temp affects signal
    const trafficDegradation = trafficLoad > 80 ? -3 : 0; // high traffic = slight degradation
    const signalStrength = baseSignal + weatherDegradation + trafficDegradation + DataGenerators.randomFloat(-5, 5);

    return {
      deviceId: this.device.id,
      timestamp: new Date(),
      sequenceNumber: this.sequenceNumber,

      // RF Performance
      transmitPower: DataGenerators.randomFloat(38, 43), // dBm (typical cell site: 38-43 dBm)
      receivePower: DataGenerators.randomFloat(-95, -75), // dBm (realistic received power at antenna)
      vswr: DataGenerators.randomFloat(1.1, 1.45), // VSWR < 1.5 is good
      returnLoss: DataGenerators.randomFloat(-22, -14), // dB (better return loss = more negative)
      signalStrength: Math.max(-120, Math.min(-50, signalStrength)), // clamp to realistic range
      noiseFloor: DataGenerators.randomFloat(-112, -108), // dBm (thermal noise floor ~-110 dBm)
      snr: DataGenerators.randomFloat(12, 28), // dB (typical LTE SNR range)

      // Environmental
      temperature,
      humidity: DataGenerators.randomFloat(30, 80),
      windSpeed: wind.speed,
      windDirection: wind.direction,

      // Mechanical (wind affects positioning)
      azimuthAngle: 180 + DataGenerators.randomFloat(-2, 2) + (wind.speed > 15 ? wind.speed * 0.1 : 0),
      elevationAngle: 15 + DataGenerators.randomFloat(-1, 1),
      tiltAngle: DataGenerators.randomFloat(-5, 5),
      vibration: DataGenerators.generateVibration(wind.speed),

      // Electrical - Passive antennas consume minimal power
      voltage: 12.0 + DataGenerators.randomFloat(-0.3, 0.3), // 12V DC nominal
      current: powerConsumption / 12.0, // I = P/V
      powerConsumption: powerConsumption,

      // Quality metrics
      dataRate: (trafficLoad / 100) * this.device.specifications.maxPower * 0.8, // realistic data rate
      packetLoss: DataGenerators.randomFloat(0.01, 0.3), // percentage (< 0.5% is good)
      latency: DataGenerators.randomFloat(15, 45), // ms (typical LTE latency 20-40ms)
      uptime: DataGenerators.generateUptime(8760) // MTBF 1 year
    };
  }

  getDevice(): AntennaDevice {
    return { ...this.device };
  }

  updateStatus(status: DeviceStatus): void {
    this.device.status = status;
  }
}