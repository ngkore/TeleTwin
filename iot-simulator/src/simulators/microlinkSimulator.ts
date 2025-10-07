import { v4 as uuidv4 } from 'uuid';
import { MicrolinkDevice, MicrolinkTelemetry, ModulationType, LinkState, DeviceStatus, DeviceType } from '../types';
import { DataGenerators } from '../utils';

export class MicrolinkSimulator {
  private device: MicrolinkDevice;
  private sequenceNumber = 0;

  constructor(name: string, location: { lat: number; lng: number; alt: number }, linkPartnerId?: string) {
    this.device = {
      id: name, // Use the structured ID passed as name instead of random UUID
      name,
      type: DeviceType.MICROLINK,
      location: {
        latitude: location.lat,
        longitude: location.lng,
        altitude: location.alt
      },
      installationDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      lastMaintenance: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      status: DeviceStatus.ONLINE,
      firmware: "MLK-FW-" + DataGenerators.randomFloat(3.0, 5.2).toFixed(1),
      serialNumber: "MLK" + Date.now().toString().slice(-8),
      linkPartner: linkPartnerId,
      specifications: {
        frequency: this.getRandomFrequency(),
        channelBandwidth: this.getRandomBandwidth(),
        modulation: this.getRandomModulation(),
        capacity: DataGenerators.randomFloat(100, 1000), // Mbps
        range: DataGenerators.randomFloat(1, 50), // km
        antennaSize: DataGenerators.randomFloat(0.3, 3.0), // meters
        transmitPower: 20, // dBm (typical microwave: 15-25 dBm, use 20 as standard)
        receiverSensitivity: -78, // dBm (FIXED spec - typical for microwave links: -75 to -85 dBm)
        adaptiveModulation: Math.random() > 0.2 // 80% have adaptive modulation (modern links)
      }
    };
  }

  private getRandomFrequency(): number {
    const frequencies = [6, 7, 8, 11, 13, 15, 18, 23, 26, 28, 32, 38, 42, 80]; // GHz
    return frequencies[Math.floor(Math.random() * frequencies.length)];
  }

  private getRandomBandwidth(): number {
    const bandwidths = [7, 14, 28, 40, 56, 80, 112]; // MHz
    return bandwidths[Math.floor(Math.random() * bandwidths.length)];
  }

  private getRandomModulation(): ModulationType {
    const modulations = Object.values(ModulationType);
    return modulations[Math.floor(Math.random() * modulations.length)];
  }

  generateTelemetry(): MicrolinkTelemetry {
    this.sequenceNumber++;

    const weather = this.generateWeatherEffects();
    const ambientTemp = DataGenerators.generateTemperature(25, 12);

    // Link performance calculations
    const pathLoss = this.calculatePathLoss();
    const rsl = this.device.specifications.transmitPower - pathLoss - weather.rainAttenuation;

    // Noise floor for microwave: thermal noise (-174 dBm/Hz) + 10*log10(BW) + noise figure (~5dB)
    const bandwidth = this.device.specifications.channelBandwidth * 1e6; // Hz
    const noiseFloor = -174 + 10 * Math.log10(bandwidth) + 5; // typically -95 to -85 dBm
    const snr = rsl - noiseFloor;

    // Link quality based on SNR and RSL
    const linkQuality = Math.max(70, Math.min(100, 70 + (snr - 10) * 1.5));

    return {
      deviceId: this.device.id,
      timestamp: new Date(),
      sequenceNumber: this.sequenceNumber,

      // Link Performance - REALISTIC VALUES
      receivedSignalLevel: Math.max(-90, Math.min(-30, rsl)), // typical range -40 to -85 dBm
      transmitPowerLevel: this.device.specifications.transmitPower + DataGenerators.randomFloat(-0.5, 0.5), // stable within ±0.5dB
      linkMargin: rsl - this.device.specifications.receiverSensitivity, // fade margin
      bitErrorRate: DataGenerators.generateBER(snr),
      blockErrorRate: DataGenerators.generateBER(snr) * 150, // BLER typically 50-200x higher than BER
      unavailableTime: linkQuality < 85 ? DataGenerators.randomFloat(1, 30) : DataGenerators.randomFloat(0, 2), // seconds in last hour

      // Adaptive Modulation
      currentModulation: this.selectCurrentModulation(snr),
      modulationEfficiency: this.getModulationEfficiency(),
      modulationChanges: DataGenerators.randomInt(0, 5),

      // Throughput
      currentCapacity: this.calculateCurrentCapacity(snr),
      utilization: {
        transmitted: DataGenerators.randomFloat(20, 80),
        received: DataGenerators.randomFloat(20, 80)
      },

      // Quality Metrics
      signalToNoiseRatio: snr,
      signalQuality: DataGenerators.randomFloat(20, 35),
      fading: {
        frequency: DataGenerators.randomFloat(0.1, 2.0), // Hz
        depth: DataGenerators.randomFloat(5, 20) // dB
      },

      // Environmental Effects
      rainAttenuation: weather.rainAttenuation,
      atmosphericAttenuation: this.calculateAtmosphericAttenuation(),
      multipathFading: DataGenerators.randomFloat(2, 8),

      // Equipment Status - REALISTIC TEMPERATURES
      temperature: {
        outdoor: ambientTemp,
        indoor: ambientTemp + DataGenerators.randomFloat(3, 10), // indoor unit cooler
        transmitter: Math.min(70, ambientTemp + DataGenerators.randomFloat(15, 30)), // TX runs hot: 40-70°C
        receiver: ambientTemp + DataGenerators.randomFloat(10, 20) // RX cooler: 35-55°C
      },
      humidity: weather.humidity,

      // Power System - FROM VENDOR SPEC (Ericsson MINI-LINK: 85W typical)
      dcVoltage: DataGenerators.randomFloat(47.5, 52.5), // -48V DC system (±10%)
      dcCurrent: DataGenerators.randomFloat(1.5, 2.2), // I = P/V = 85W/48V ≈ 1.77A
      powerConsumption: DataGenerators.randomFloat(75, 95), // watts (vendor spec: 85W typical)
      batteryBackup: {
        voltage: DataGenerators.randomFloat(47, 53),
        chargeLevel: DataGenerators.randomFloat(85, 100),
        timeRemaining: DataGenerators.randomFloat(180, 480) // minutes
      },

      // Antenna Alignment
      azimuthAlignment: DataGenerators.randomFloat(-0.5, 0.5), // degrees from optimal
      elevationAlignment: DataGenerators.randomFloat(-0.3, 0.3),
      crossPolarization: DataGenerators.randomFloat(25, 35), // dB isolation

      // Protection Switching
      protectionActive: Math.random() < 0.05, // 5% chance
      switchingCount: DataGenerators.randomInt(0, 3),
      lastSwitchTime: Math.random() < 0.1 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : undefined,

      // Ethernet Interface
      ethernetPorts: this.generateEthernetPorts(),

      // Link State
      linkState: this.determineLinkState(linkQuality),
      linkQuality
    };
  }

  private generateWeatherEffects(): { rainAttenuation: number; humidity: number } {
    const humidity = DataGenerators.randomFloat(30, 90);

    // Rain attenuation increases with frequency and rain rate
    const rainRate = humidity > 80 ? DataGenerators.randomFloat(0, 10) : 0; // mm/hr
    const rainAttenuation = this.calculateRainAttenuation(rainRate);

    return { rainAttenuation, humidity };
  }

  private calculatePathLoss(): number {
    // Free space path loss
    const frequency = this.device.specifications.frequency;
    const distance = this.device.specifications.range;
    return 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 32.45;
  }

  private calculateRainAttenuation(rainRate: number): number {
    const frequency = this.device.specifications.frequency;
    const distance = this.device.specifications.range;

    // ITU-R P.838 rain attenuation model (simplified)
    let k, alpha;
    if (frequency < 10) {
      k = 0.0001 * Math.pow(frequency, 2.3);
      alpha = 1.0;
    } else {
      k = 0.0004 * Math.pow(frequency, 1.8);
      alpha = 1.2;
    }

    const specificAttenuation = k * Math.pow(rainRate, alpha);
    return specificAttenuation * distance * 0.5; // 50% path factor
  }

  private calculateAtmosphericAttenuation(): number {
    const frequency = this.device.specifications.frequency;
    const distance = this.device.specifications.range;

    // Simplified atmospheric attenuation
    const attenuation = frequency > 20 ? 0.1 : 0.05; // dB/km
    return attenuation * distance;
  }

  private selectCurrentModulation(snr: number): ModulationType {
    if (!this.device.specifications.adaptiveModulation) {
      return this.device.specifications.modulation;
    }

    // Adaptive modulation based on SNR
    if (snr > 35) return ModulationType.QAM_1024;
    if (snr > 30) return ModulationType.QAM_512;
    if (snr > 25) return ModulationType.QAM_256;
    if (snr > 20) return ModulationType.QAM_128;
    if (snr > 15) return ModulationType.QAM_64;
    if (snr > 12) return ModulationType.QAM_32;
    if (snr > 10) return ModulationType.QAM_16;
    return ModulationType.QPSK;
  }

  private getModulationEfficiency(): number {
    const modEfficiency: { [key in ModulationType]: number } = {
      [ModulationType.QPSK]: 2,
      [ModulationType.QAM_16]: 4,
      [ModulationType.QAM_32]: 5,
      [ModulationType.QAM_64]: 6,
      [ModulationType.QAM_128]: 7,
      [ModulationType.QAM_256]: 8,
      [ModulationType.QAM_512]: 9,
      [ModulationType.QAM_1024]: 10
    };
    return modEfficiency[this.device.specifications.modulation];
  }

  private calculateCurrentCapacity(snr: number): number {
    const bandwidth = this.device.specifications.channelBandwidth;
    const efficiency = this.getModulationEfficiency();
    const maxCapacity = bandwidth * efficiency;

    // Reduce capacity based on link conditions
    const qualityFactor = Math.max(0.3, Math.min(1.0, snr / 30));
    return maxCapacity * qualityFactor;
  }

  private generateEthernetPorts(): Array<{
    portId: number;
    status: 'up' | 'down';
    speed: number;
    duplex: 'full' | 'half';
    errors: number;
  }> {
    const numPorts = DataGenerators.randomInt(2, 8);
    const ports = [];

    for (let i = 1; i <= numPorts; i++) {
      ports.push({
        portId: i,
        status: Math.random() > 0.05 ? 'up' : 'down' as 'up' | 'down',
        speed: Math.random() > 0.7 ? 1000 : 100, // Mbps
        duplex: 'full' as 'full' | 'half',
        errors: DataGenerators.randomInt(0, 100)
      });
    }

    return ports;
  }

  private determineLinkState(linkQuality: number): LinkState {
    if (linkQuality > 95) return LinkState.UP;
    if (linkQuality > 85) return LinkState.DEGRADED;
    if (linkQuality > 70) return LinkState.DOWN;
    return LinkState.MAINTENANCE;
  }

  getDevice(): MicrolinkDevice {
    return { ...this.device };
  }

  updateStatus(status: DeviceStatus): void {
    this.device.status = status;
  }
}