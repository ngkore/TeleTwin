import { AntennaSimulator, RRUSimulator, MicrolinkSimulator } from './simulators';
import { BaseDevice, TelemetryData, DeviceStatus } from './types';
import { SimpleStorage } from './storage';
import { VENDOR_SPECS, DELHI_ENVIRONMENT } from './vendorSpecs';
import * as path from 'path';

export interface DelhiTowerConfig {
  towerName: string;
  location: { lat: number; lng: number; height: number };
  antennas: Array<{ position: string; vendor: string; model: string }>;
  rrus: Array<{ position: string; vendor: string; model: string }>;
  microlinks: Array<{ name: string; vendor: string; model: string; linkTo: string }>;
  interval: number;
  outputDir: string;
}

export class DelhiTowerSimulator {
  private antennas: AntennaSimulator[] = [];
  private rrus: RRUSimulator[] = [];
  private microlinks: MicrolinkSimulator[] = [];
  private storage: SimpleStorage;
  private analyzer: DelhiAnalyzer;
  private config: DelhiTowerConfig;
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private analysisIntervalId?: NodeJS.Timeout;

  constructor(config: DelhiTowerConfig) {
    this.config = config;
    this.storage = new SimpleStorage(config.outputDir);
    this.analyzer = new DelhiAnalyzer(this.storage);
    this.initializeEquipment();
  }

  private initializeEquipment(): void {
    console.log(`🗼 Initializing ${this.config.towerName}`);
    console.log(`📍 Location: ${this.config.location.lat}°N, ${this.config.location.lng}°E`);
    console.log(`📏 Tower Height: ${this.config.location.height}m`);

    // Initialize Vodafone antennas with specific positions
    this.config.antennas.forEach((antCfg, index) => {
      const specs = VENDOR_SPECS.antennas[antCfg.model];
      if (!specs) {
        console.warn(`⚠️ Unknown antenna model: ${antCfg.model}`);
        return;
      }

      // Calculate antenna position on 15m tower
      const antennaHeight = this.config.location.height - 2 + (index * 2); // Staggered heights

      const antenna = new AntennaSimulator(
        antCfg.position, // Use exact Vodafone ID: VF-ANT-001-N-L18-P1
        {
          lat: this.config.location.lat,
          lng: this.config.location.lng,
          alt: antennaHeight
        }
      );

      // Apply vendor specs to the antenna
      this.customizeAntennaWithSpecs(antenna, specs);
      this.antennas.push(antenna);

      console.log(`📶 ${specs.vendor} ${specs.model} @ ${antCfg.position} (${antennaHeight}m)`);
    });

    // Initialize RRUs
    this.config.rrus.forEach((rruCfg, index) => {
      const specs = VENDOR_SPECS.rrus[rruCfg.model];
      if (!specs) {
        console.warn(`⚠️ Unknown RRU model: ${rruCfg.model}`);
        return;
      }

      const rru = new RRUSimulator(
        rruCfg.position, // Use exact Vodafone ID: VF-RRU-001-N-40W-P1
        {
          lat: this.config.location.lat,
          lng: this.config.location.lng,
          alt: 8 // RRUs at 8m height
        }
      );

      this.customizeRRUWithSpecs(rru, specs);
      this.rrus.push(rru);

      console.log(`📻 ${specs.vendor} ${specs.model} @ ${rruCfg.position}`);
    });

    // Initialize microlink
    this.config.microlinks.forEach(mlCfg => {
      const specs = VENDOR_SPECS.microlinks[mlCfg.model];
      if (!specs) {
        console.warn(`⚠️ Unknown microlink model: ${mlCfg.model}`);
        return;
      }

      const microlink = new MicrolinkSimulator(
        mlCfg.name, // Use exact Vodafone ID: VF-MW-001-BH-750M-P1E
        {
          lat: this.config.location.lat,
          lng: this.config.location.lng,
          alt: this.config.location.height
        }
      );

      this.customizeMicrolinkWithSpecs(microlink, specs);
      this.microlinks.push(microlink);

      console.log(`🔗 ${specs.vendor} ${specs.model} → ${mlCfg.linkTo}`);
    });

    // Store all devices
    const allDevices = this.getAllDevices();
    this.storage.storeDevices(allDevices);

    console.log(`✅ Initialized ${allDevices.length} devices on Delhi tower`);
  }

  private customizeAntennaWithSpecs(antenna: AntennaSimulator, specs: any): void {
    const device = antenna.getDevice();
    // Update device specifications with real vendor data
    Object.assign(device.specifications, {
      frequencyBand: specs.frequencyBands[0], // Primary band
      gain: specs.gain,
      beamwidth: specs.beamwidth,
      maxPower: specs.maxPower,
      vswr: specs.vswr,
      impedance: specs.impedance,
      connectorType: specs.connectorType
    });
  }

  private customizeRRUWithSpecs(rru: RRUSimulator, specs: any): void {
    const device = rru.getDevice();
    Object.assign(device.specifications, {
      frequencyBands: specs.frequencyBands,
      maxOutputPower: specs.maxOutputPower,
      numberOfCarriers: specs.numberOfCarriers,
      numberOfSectors: specs.numberOfSectors
    });
  }

  private customizeMicrolinkWithSpecs(microlink: MicrolinkSimulator, specs: any): void {
    const device = microlink.getDevice();
    Object.assign(device.specifications, {
      frequency: specs.frequency,
      channelBandwidth: specs.channelBandwidth[0],
      capacity: specs.capacity,
      range: specs.range,
      antennaSize: specs.antennaSize,
      transmitPower: specs.transmitPower,
      receiverSensitivity: specs.receiverSensitivity
    });
  }

  start(): void {
    if (this.running) {
      console.log('⚠️ Delhi tower simulation already running');
      return;
    }

    console.log(`🚀 Starting Delhi tower simulation (${this.config.interval}ms interval)`);
    this.running = true;

    // Generate initial data
    this.generateTelemetry();

    // Set up telemetry generation
    this.intervalId = setInterval(() => {
      this.generateTelemetry();
    }, this.config.interval);

    // Set up analysis every 30 seconds
    this.analysisIntervalId = setInterval(() => {
      this.runAnalysis();
    }, 30000);
  }

  stop(): void {
    if (!this.running) {
      console.log('⚠️ Delhi tower simulation not running');
      return;
    }

    console.log('🛑 Stopping Delhi tower simulation...');
    this.running = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.analysisIntervalId) {
      clearInterval(this.analysisIntervalId);
      this.analysisIntervalId = undefined;
    }

    // Final analysis and export
    this.runAnalysis();
    console.log('💾 Final database statistics:', this.storage.getStatistics());
    this.displayStats();
    this.storage.close();

    console.log('✅ Delhi tower simulation stopped');
  }

  private generateTelemetry(): void {
    const telemetryBatch: TelemetryData[] = [];

    // Apply Delhi environmental effects to all devices
    const delhiWeather = this.getDelhiWeatherConditions();

    this.antennas.forEach(antenna => {
      const telemetry = antenna.generateTelemetry();
      this.applyDelhiEnvironmentalEffects(telemetry, delhiWeather);
      telemetryBatch.push(telemetry);
    });

    this.rrus.forEach(rru => {
      const telemetry = rru.generateTelemetry();
      this.applyDelhiEnvironmentalEffects(telemetry, delhiWeather);
      telemetryBatch.push(telemetry);
    });

    this.microlinks.forEach(microlink => {
      const telemetry = microlink.generateTelemetry();
      this.applyDelhiEnvironmentalEffects(telemetry, delhiWeather);
      telemetryBatch.push(telemetry);
    });

    this.storage.storeTelemetry(telemetryBatch);

    const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`📊 Delhi Tower telemetry: ${telemetryBatch.length} devices @ ${currentTime} IST`);
  }

  private getDelhiWeatherConditions(): any {
    const now = new Date();
    const month = now.getMonth() + 1;
    const hour = now.getHours();

    // Delhi seasonal conditions
    let season = 'summer';
    if (month >= 12 || month <= 2) season = 'winter';
    else if (month >= 6 && month <= 9) season = 'monsoon';

    const temp = DELHI_ENVIRONMENT.tempVariation[season as keyof typeof DELHI_ENVIRONMENT.tempVariation] +
                 (hour > 12 ? 5 : -3) + // Day/night variation
                 (Math.random() - 0.5) * 6; // Random variation

    const humidity = DELHI_ENVIRONMENT.humidity[season as keyof typeof DELHI_ENVIRONMENT.humidity] +
                     (Math.random() - 0.5) * 20;

    return {
      temperature: temp,
      humidity: Math.max(20, Math.min(95, humidity)),
      airQuality: DELHI_ENVIRONMENT.airQuality.pm25 + (Math.random() - 0.5) * 50,
      windSpeed: DELHI_ENVIRONMENT.windSpeed.average + Math.random() * 10,
      season
    };
  }

  private applyDelhiEnvironmentalEffects(telemetry: any, weather: any): void {
    // Apply Delhi-specific environmental effects
    if (telemetry.temperature !== undefined) {
      telemetry.temperature = weather.temperature;
    }

    if (telemetry.humidity !== undefined) {
      telemetry.humidity = weather.humidity;
    }

    // Air pollution affects signal quality in Delhi
    if (telemetry.signalStrength !== undefined) {
      const pollutionEffect = (weather.airQuality - 50) / 1000; // Pollution degrades signal
      telemetry.signalStrength -= pollutionEffect;
    }

    // Temperature affects power consumption
    if (telemetry.powerConsumption !== undefined && weather.temperature > 35) {
      telemetry.powerConsumption *= 1.15; // 15% more power for cooling in Delhi heat
    }
  }

  private runAnalysis(): void {
    try {
      const analysis = this.analyzer.analyzeDelhi();

      if (analysis.alerts.length > 0) {
        console.log(`🚨 Delhi Tower Alerts: ${analysis.alerts.length}`);
        analysis.alerts.slice(0, 2).forEach((alert: any) => {
          console.log(`   ${this.getAlertEmoji(alert.severity as string)} ${alert.message}`);
        });
      }

      if (analysis.delhiSpecific.airQualityImpact > 0.1) {
        console.log(`🌫️ High pollution affecting signal quality: ${analysis.delhiSpecific.airQualityImpact.toFixed(2)}dB loss`);
      }

    } catch (error) {
      console.log(`❌ Analysis error: ${error}`);
    }
  }

  private getAlertEmoji(severity: string): string {
    switch (severity) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  }

  getAllDevices(): BaseDevice[] {
    const devices: BaseDevice[] = [];
    this.antennas.forEach(a => devices.push(a.getDevice()));
    this.rrus.forEach(r => devices.push(r.getDevice()));
    this.microlinks.forEach(m => devices.push(m.getDevice()));
    return devices;
  }

  displayStats(): void {
    const stats = this.storage.getStatistics();
    const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    console.log('\n🗼 === Delhi Tower Statistics ===');
    console.log(`📍 Location: ${DELHI_ENVIRONMENT.coordinates.lat}°N, ${DELHI_ENVIRONMENT.coordinates.lng}°E`);
    console.log(`⏰ Current Time: ${currentTime} IST`);
    console.log(`📡 Total Equipment: ${stats.totalDevices}`);
    console.log(`   📶 Vodafone Antennas: ${this.antennas.length}`);
    console.log(`   📻 RRUs: ${this.rrus.length}`);
    console.log(`   🔗 Microlinks: ${this.microlinks.length}`);
    console.log(`📈 Total Records: ${stats.totalRecords}`);
    console.log(`🏃 Status: ${this.running ? 'Running' : 'Stopped'}`);
    console.log('================================\n');
  }

  getLatestTelemetry(limit = 10): any[] {
    return this.storage.getLatestTelemetry(limit);
  }

  getStorage(): SimpleStorage {
    return this.storage;
  }


  isRunning(): boolean {
    return this.running;
  }
}

// Simple Delhi-specific analyzer
class DelhiAnalyzer {
  constructor(private storage: SimpleStorage) {}

  analyzeDelhi(): any {
    const latest = this.storage.getLatestTelemetry(20);
    const alerts: any[] = [];
    let totalPollutionImpact = 0;

    latest.forEach(telemetry => {
      // Temperature alerts for Delhi conditions
      if (telemetry.temperature > 45) {
        alerts.push({
          deviceId: telemetry.deviceId,
          type: 'extreme_heat',
          message: `Extreme Delhi heat: ${telemetry.temperature.toFixed(1)}°C`,
          severity: 'high',
          timestamp: telemetry.timestamp
        });
      }

      // Power consumption alerts
      if (telemetry.powerConsumption > 300) {
        alerts.push({
          deviceId: telemetry.deviceId,
          type: 'high_power',
          message: `High power consumption: ${telemetry.powerConsumption.toFixed(1)}W`,
          severity: 'medium',
          timestamp: telemetry.timestamp
        });
      }

      // Signal degradation due to pollution
      if (telemetry.signalStrength < -85) {
        totalPollutionImpact += Math.abs(telemetry.signalStrength + 80) / latest.length;
      }
    });

    return {
      alerts: alerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
      delhiSpecific: {
        airQualityImpact: totalPollutionImpact,
        averageTemp: latest.reduce((sum, t) => sum + (t.temperature || 25), 0) / latest.length,
        equipmentStress: alerts.filter(a => a.type === 'extreme_heat').length / latest.length
      }
    };
  }
}