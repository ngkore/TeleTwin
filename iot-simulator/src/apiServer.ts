import express from 'express';
import cors from 'cors';
import * as path from 'path';
import { DelhiTowerSimulator } from './delhiSimulator';
import { SimpleStorage } from './storage';

export class DelhiApiServer {
  private app: express.Application;
  private simulator: DelhiTowerSimulator;
  private storage: SimpleStorage;
  private server?: any;

  constructor(simulator: DelhiTowerSimulator, storage: SimpleStorage) {
    this.app = express();
    this.simulator = simulator;
    this.storage = storage;
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enable CORS for all routes
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Parse JSON bodies
    this.app.use(express.json());

    // Serve static files from public directory
    const publicPath = path.join(__dirname, '..', 'public');
    this.app.use(express.static(publicPath));

    // Add request logging
    this.app.use((req, res, next) => {
      console.log(`📡 API Request: ${req.method} ${req.path}`);
      next();
    });
  }



  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        simulator: 'Delhi Vodafone Tower',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Get latest telemetry data
    this.app.get('/api/telemetry/latest', (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 20;
        const telemetryData = this.storage.getLatestTelemetry(limit);

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          count: telemetryData.length,
          telemetry: telemetryData
        });
      } catch (error) {
        console.error('❌ Error fetching latest telemetry:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch telemetry data',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get telemetry data by device ID
    this.app.get('/api/telemetry/device/:deviceId', (req, res) => {
      try {
        const { deviceId } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;
        const telemetryData = this.storage.getTelemetryByDevice(deviceId, limit);

        res.json({
          success: true,
          deviceId,
          timestamp: new Date().toISOString(),
          count: telemetryData.length,
          telemetry: telemetryData
        });
      } catch (error) {
        console.error(`❌ Error fetching telemetry for device ${req.params.deviceId}:`, error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch device telemetry',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get all devices
    this.app.get('/api/devices', (req, res) => {
      try {
        const devices = this.storage.getAllDevices();

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          count: devices.length,
          devices: devices
        });
      } catch (error) {
        console.error('❌ Error fetching devices:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch devices',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get telemetry statistics
    this.app.get('/api/stats', (req, res) => {
      try {
        const stats = this.storage.getStatistics();

        res.json({
          success: true,
          timestamp: new Date().toISOString(),
          statistics: stats
        });
      } catch (error) {
        console.error('❌ Error fetching statistics:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch statistics',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Get telemetry data within time range
    this.app.get('/api/telemetry/range', (req, res) => {
      try {
        const { start, end, limit } = req.query;
        const startTime = start ? new Date(start as string) : new Date(Date.now() - 3600000); // Default: last hour
        const endTime = end ? new Date(end as string) : new Date();
        const maxLimit = parseInt(limit as string) || 100;

        const telemetryData = this.storage.getTelemetryInRange(startTime, endTime, maxLimit);

        res.json({
          success: true,
          timeRange: {
            start: startTime.toISOString(),
            end: endTime.toISOString()
          },
          count: telemetryData.length,
          telemetry: telemetryData
        });
      } catch (error) {
        console.error('❌ Error fetching telemetry range:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch telemetry range',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Manual cleanup endpoint
    this.app.post('/api/cleanup', (req, res) => {
      try {
        this.storage.manualCleanup();
        const stats = this.storage.getStatistics();

        res.json({
          success: true,
          message: 'Manual cleanup completed',
          timestamp: new Date().toISOString(),
          statistics: stats
        });
      } catch (error) {
        console.error('❌ Error during manual cleanup:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to cleanup data',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Export telemetry data as CSV
    this.app.get('/api/export/csv', (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 200; // optional ?limit=500
        const telemetryData = this.storage.getLatestTelemetry(limit);

        if (!telemetryData || telemetryData.length === 0) {
          return res.status(404).send('No telemetry data found');
        }

        // Convert to CSV
        const headers = Object.keys(telemetryData[0]);
        const csvRows = [
          headers.join(','), // header row
          ...telemetryData.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
        ];
        const csvContent = csvRows.join('\n');

        // Set headers to force download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="telemetry_export_${Date.now()}.csv"`);
        res.send(csvContent);

        console.log(`📦 Exported ${telemetryData.length} records to CSV`);
      } catch (error) {
        console.error('❌ Error exporting CSV:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to export CSV',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });


    // Dashboard home
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        availableEndpoints: [
          'GET  /                           - Dashboard UI',
          'GET  /health                     - Server health',
          'GET  /api/telemetry/latest       - Latest telemetry',
          'GET  /api/telemetry/device/:id   - Device data',
          'GET  /api/telemetry/range        - Time range query',
          'GET  /api/devices                - All devices',
          'GET  /api/stats                  - Statistics',
          'POST /api/cleanup                - Manual cleanup'
        ]
      });
    });
  }

  start(port: number = 3001): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`🚀 Delhi Tower API Server running on http://localhost:${port}`);
        console.log(`🎯 Dashboard UI: http://localhost:${port}/`);
        console.log(`📡 Available endpoints:`);
        console.log(`   GET  /                           - Interactive Dashboard`);
        console.log(`   GET  /health                     - Server health check`);
        console.log(`   GET  /api/telemetry/latest       - Latest telemetry data`);
        console.log(`   GET  /api/telemetry/device/:id   - Device-specific data`);
        console.log(`   GET  /api/telemetry/range        - Time range query`);
        console.log(`   GET  /api/devices                - All devices info`);
        console.log(`   GET  /api/stats                  - Database statistics`);
        console.log(`   POST /api/cleanup                - Manual data cleanup`);
        console.log(``);
        console.log(`💡 Open http://localhost:${port}/ in your browser to view the dashboard`);
        console.log(``);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('🛑 Delhi Tower API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}