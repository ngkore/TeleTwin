import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { TelemetryData, BaseDevice } from './types';

export class SimpleStorage {
  private dbPath: string;
  private db: Database.Database;
  private outputDir: string;

  constructor(outputDir: string) {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    this.outputDir = outputDir;
    this.dbPath = path.join(outputDir, 'telemetry.db');
    this.db = this.initializeDatabase();
  }


  private initializeDatabase(): Database.Database {
    const db = new Database(this.dbPath);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        timestamp TEXT,
        data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better query performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_telemetry_device_id ON telemetry(device_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp)`);

    console.log(`🗄️ Database storage: ${this.dbPath}`);
    return db;
  }

  storeDevices(devices: BaseDevice[]): void {
    // Store only in database
    const stmt = this.db.prepare('INSERT OR REPLACE INTO devices (id, name, type, data) VALUES (?, ?, ?, ?)');
    devices.forEach(device => {
      stmt.run(device.id, device.name, device.type, JSON.stringify(device));
    });
  }

  storeTelemetry(telemetryBatch: TelemetryData[]): void {
    // Convert all timestamps to strings to avoid type issues
    const normalizedBatch = telemetryBatch.map(t => ({
      ...t,
      timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : t.timestamp
    }));

    // Store in database
    const stmt = this.db.prepare('INSERT INTO telemetry (device_id, timestamp, data) VALUES (?, ?, ?)');
    normalizedBatch.forEach(t => {
      stmt.run(t.deviceId, t.timestamp, JSON.stringify(t));
    });

    // Also append to JSON file

    console.log(`💾 Stored ${normalizedBatch.length} telemetry records (DB + JSON)`);
  }

  // private appendToJsonFile(telemetryBatch: TelemetryData[]): void {
  //   try {
  //     let existingData: any[] = [];

  //     // Read existing data if file exists
  //     if (fs.existsSync(this.jsonPath)) {
  //       const fileContent = fs.readFileSync(this.jsonPath, 'utf-8');
  //       if (fileContent.trim()) {
  //         existingData = JSON.parse(fileContent);
  //       }
  //     }

  //     // Append new data
  //     existingData.push(...telemetryBatch);

  //     // Keep only last 1000 records to prevent file from getting too large
  //     if (existingData.length > 1000) {
  //       existingData = existingData.slice(-1000);
  //     }

  //     // Write back to file
  //     fs.writeFileSync(this.jsonPath, JSON.stringify(existingData, null, 2));
  //   } catch (error) {
  //     console.error('⚠️ Error writing to JSON file:', error);
  //   }
  // }

  // Get latest telemetry records from database
  getLatestTelemetry(limit = 50): any[] {
    const stmt = this.db.prepare('SELECT data FROM telemetry ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return rows.map(row => JSON.parse(row.data));
  }

  // Get telemetry data by device ID
  getTelemetryByDevice(deviceId: string, limit = 10): any[] {
    const stmt = this.db.prepare('SELECT data FROM telemetry WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(deviceId, limit) as any[];
    return rows.map(row => JSON.parse(row.data));
  }

  // Get all devices from database
  getAllDevices(): any[] {
    const stmt = this.db.prepare('SELECT data FROM devices');
    const rows = stmt.all() as any[];
    return rows.map(row => JSON.parse(row.data));
  }

  // Get telemetry data within time range
  getTelemetryInRange(startTime: Date, endTime: Date, limit = 100): any[] {
    const stmt = this.db.prepare(`
      SELECT data FROM telemetry
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(startTime.toISOString(), endTime.toISOString(), limit) as any[];
    return rows.map(row => JSON.parse(row.data));
  }

  // Get database statistics
  getStatistics(): any {
    const deviceCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM devices');
    const telemetryCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM telemetry');
    const deviceStatsStmt = this.db.prepare(`
      SELECT device_id, COUNT(*) as count
      FROM telemetry
      GROUP BY device_id
    `);

    const deviceCount = (deviceCountStmt.get() as any).count;
    const telemetryCount = (telemetryCountStmt.get() as any).count;
    const deviceStats = deviceStatsStmt.all() as any[];

    const recordsPerDevice: { [key: string]: number } = {};
    deviceStats.forEach((stat: any) => {
      recordsPerDevice[stat.device_id] = stat.count;
    });

    return {
      totalDevices: deviceCount,
      totalRecords: telemetryCount,
      recordsPerDevice: recordsPerDevice,
      databasePath: this.dbPath,
      lastUpdate: new Date().toISOString()
    };
  }

  close(): void {
    this.db.close();
    console.log('💾 Storage closed');
  }
}