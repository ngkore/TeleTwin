import { AntennaSimulator, RRUSimulator, MicrolinkSimulator } from './simulators';
import { BaseDevice, TelemetryData, DeviceStatus } from './types';
import { SimpleStorage } from './storage';
import * as path from 'path';

export interface SimulatorConfig {
  devices: {
    antennas: Array<{ name: string; location: { lat: number; lng: number; alt: number } }>;
    rrus: Array<{ name: string; location: { lat: number; lng: number; alt: number } }>;
    microlinks: Array<{ name: string; location: { lat: number; lng: number; alt: number } }>;
  };
  interval: number; // milliseconds
  outputDir: string;
}

export class IoTSimulator {
  private antennas: AntennaSimulator[] = [];
  private rrus: RRUSimulator[] = [];
  private microlinks: MicrolinkSimulator[] = [];
  private storage: SimpleStorage;
  private config: SimulatorConfig;
  private running = false;
  private intervalId?: NodeJS.Timeout;

  constructor(config: SimulatorConfig) {
    this.config = config;
    this.storage = new SimpleStorage(config.outputDir);
    this.initializeDevices();
  }

  private initializeDevices(): void {
    // Create antennas
    this.config.devices.antennas.forEach(cfg => {
      const antenna = new AntennaSimulator(cfg.name, cfg.location);
      this.antennas.push(antenna);
    });

    // Create RRUs
    this.config.devices.rrus.forEach(cfg => {
      const rru = new RRUSimulator(cfg.name, cfg.location);
      this.rrus.push(rru);
    });

    // Create microlinks
    this.config.devices.microlinks.forEach(cfg => {
      const microlink = new MicrolinkSimulator(cfg.name, cfg.location);
      this.microlinks.push(microlink);
    });

    // Store all devices
    const allDevices = this.getAllDevices();
    this.storage.storeDevices(allDevices);

    console.log(`🚀 Initialized ${allDevices.length} devices:`);
    console.log(`   📶 ${this.antennas.length} antennas`);
    console.log(`   📻 ${this.rrus.length} RRUs`);
    console.log(`   🔗 ${this.microlinks.length} microlinks`);
  }

  start(): void {
    if (this.running) {
      console.log('⚠️ Simulator already running');
      return;
    }

    console.log(`🚀 Starting simulation (${this.config.interval}ms interval)`);
    this.running = true;

    // Generate initial data
    this.generateTelemetry();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.generateTelemetry();
    }, this.config.interval);
  }

  stop(): void {
    if (!this.running) {
      console.log('⚠️ Simulator not running');
      return;
    }

    console.log('🛑 Stopping simulation...');
    this.running = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Show final database statistics
    console.log('💾 Final database statistics:', this.storage.getStatistics());
    this.displayStats();
    this.storage.close();

    console.log('✅ Simulation stopped');
  }

  private generateTelemetry(): void {
    const telemetryBatch: TelemetryData[] = [];

    // Collect from all devices
    this.antennas.forEach(antenna => {
      telemetryBatch.push(antenna.generateTelemetry());
    });

    this.rrus.forEach(rru => {
      telemetryBatch.push(rru.generateTelemetry());
    });

    this.microlinks.forEach(microlink => {
      telemetryBatch.push(microlink.generateTelemetry());
    });

    // Store all at once
    this.storage.storeTelemetry(telemetryBatch);

    console.log(`📊 Generated telemetry for ${telemetryBatch.length} devices at ${new Date().toISOString()}`);
  }

  getAllDevices(): BaseDevice[] {
    const devices: BaseDevice[] = [];

    this.antennas.forEach(a => devices.push(a.getDevice()));
    this.rrus.forEach(r => devices.push(r.getDevice()));
    this.microlinks.forEach(m => devices.push(m.getDevice()));

    return devices;
  }

  getLatestTelemetry(limit = 10): any[] {
    return this.storage.getLatestTelemetry(limit);
  }

  exportData(): string {
    const stats = this.storage.getStatistics();
    console.log('💾 Database statistics:', stats);
    return stats.databasePath;
  }

  displayStats(): void {
    const stats = this.storage.getStatistics();

    console.log('\n📊 === Simulation Statistics ===');
    console.log(`📡 Total Devices: ${stats.totalDevices}`);
    console.log(`📈 Total Records: ${stats.totalRecords}`);
    console.log(`🏃 Status: ${this.running ? 'Running' : 'Stopped'}`);

    console.log('\n📋 Records per Device:');
    Object.entries(stats.recordsPerDevice).forEach(([deviceId, count]) => {
      console.log(`   📱 ${deviceId.slice(-8)}: ${count} records`);
    });

    console.log('===============================\n');
  }

  isRunning(): boolean {
    return this.running;
  }
}