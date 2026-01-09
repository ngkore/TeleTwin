/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


import { IoTSimulator, SimulatorConfig } from './simulator';
import * as path from 'path';

// Clean, simple configuration
const config: SimulatorConfig = {
  devices: {
    antennas: [
      { name: "Antenna-North-Tower", location: { lat: 40.7128, lng: -74.0060, alt: 150 } },
      { name: "Antenna-South-Tower", location: { lat: 40.7589, lng: -73.9851, alt: 180 } },
      { name: "Antenna-East-Building", location: { lat: 40.7505, lng: -73.9934, alt: 120 } }
    ],
    rrus: [
      { name: "RRU-Downtown-01", location: { lat: 40.7306, lng: -73.9866, alt: 100 } },
      { name: "RRU-Midtown-02", location: { lat: 40.7549, lng: -73.9840, alt: 140 } }
    ],
    microlinks: [
      { name: "Microlink-Backhaul-A", location: { lat: 40.7282, lng: -74.0776, alt: 200 } },
      { name: "Microlink-Backhaul-B", location: { lat: 40.7410, lng: -74.0040, alt: 180 } }
    ]
  },
  interval: 10000, // 10 seconds
  outputDir: path.join(__dirname, '..', 'output')
};

class CLI {
  private simulator: IoTSimulator;

  constructor() {
    this.simulator = new IoTSimulator(config);
  }

  start(): void {
    console.log('🚀 IoT Telecommunications Simulator V3');
    console.log('=====================================');
    console.log('✅ Clean single-file storage');
    console.log('✅ SQLite database backup');
    console.log('✅ CSV export for analysis');
    console.log('✅ No timestamp errors!');
    console.log('=====================================\n');

    this.simulator.start();

    // Display status every 30 seconds
    setInterval(() => {
      this.simulator.displayStats();
    }, 30000);

    // Demo features after 20 seconds
    setTimeout(() => this.demoFeatures(), 20000);

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private demoFeatures(): void {
    console.log('\n🎯 === Feature Demo ===');

    try {
      // Show latest data
      const latest = this.simulator.getLatestTelemetry(3);
      console.log(`📊 Retrieved ${latest.length} latest telemetry records`);

      // Export CSV
      const csvPath = this.simulator.exportData();
      console.log(`💾 Data exported to: ${csvPath}`);

      // Show stats
      this.simulator.displayStats();

      console.log('🎉 All features working perfectly!');
      console.log('=======================\n');

    } catch (error) {
      console.log(`❌ Demo error: ${error}`);
    }
  }

  private shutdown(): void {
    console.log('\n🛑 Shutting down simulator...');

    try {
      const csvPath = this.simulator.exportData();
      console.log(`💾 Final export: ${csvPath}`);
    } catch (error) {
      console.log(`⚠️ Export error: ${error}`);
    }

    this.simulator.stop();
    process.exit(0);
  }
}

// CLI help
function showHelp(): void {
  console.log(`
IoT Telecommunications Simulator V3
==================================

Usage: npm start

Features:
✅ Single JSON file storage (no more file spam!)
✅ SQLite database for queries
✅ CSV export for analysis
✅ Real-time telemetry generation
✅ Clean, error-free code

Output Files:
📁 telemetry_data.json    - All data in one file
🗄️ telemetry.db          - SQLite database
📊 telemetry_export.csv   - For analysis/graphs

Perfect for:
• Data analysis and visualization
• iTwin viewer integration
• Performance monitoring

Press Ctrl+C to stop and export data.
  `);
}

// Main entry point
function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('IoT Simulator V3.0.0 - Clean & Simple');
    return;
  }

  const cli = new CLI();
  cli.start();
}

// Export for programmatic use
export { IoTSimulator, SimulatorConfig };

// Run CLI
if (require.main === module) {
  main();
}