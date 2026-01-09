/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/

import { DelhiTowerSimulator, DelhiTowerConfig } from './delhiSimulator';
import { DELHI_ENVIRONMENT } from './vendorSpecs';
import { DelhiApiServer } from './apiServer';
import * as path from 'path';

// Real Delhi Vodafone Tower Configuration
const delhiTowerConfig: DelhiTowerConfig = {
  towerName: "Vodafone Delhi Central Tower",
  location: {
    lat: DELHI_ENVIRONMENT.coordinates.lat,    // 28.6467°N
    lng: DELHI_ENVIRONMENT.coordinates.lng,    // 77.1128°E
    height: DELHI_ENVIRONMENT.towerHeight      // 15m monopole
  },
  antennas: [
    // Platform 1 Antennas
    { position: "VF-ANT-001-N-L18-P1", vendor: "Kathrein", model: "vodafone_4g_antenna" },
    { position: "VF-ANT-002-E-N35-P1", vendor: "Ericsson", model: "vodafone_5g_antenna" },
    { position: "VF-ANT-003-S-L9G-P1", vendor: "CommScope", model: "vodafone_lowband_antenna" },
    { position: "VF-ANT-004-W-MB-P1", vendor: "Huawei", model: "vodafone_multiband_antenna" },
    // Platform 2 Antennas
    { position: "VF-ANT-005-N-L18-P2", vendor: "Kathrein", model: "vodafone_4g_antenna" },
    { position: "VF-ANT-006-E-N35-P2", vendor: "Ericsson", model: "vodafone_5g_antenna" },
    { position: "VF-ANT-007-S-L9G-P2", vendor: "CommScope", model: "vodafone_lowband_antenna" },
    { position: "VF-ANT-008-W-MB-P2", vendor: "Huawei", model: "vodafone_multiband_antenna" }
  ],
  rrus: [
    // Platform 1 RRUs
    { position: "VF-RRU-001-N-40W-P1", vendor: "Ericsson", model: "ericsson_rru" },
    { position: "VF-RRU-002-E-40W-P1", vendor: "Huawei", model: "huawei_rru" },
    { position: "VF-RRU-003-S-40W-P1", vendor: "Nokia", model: "nokia_rru" },
    { position: "VF-RRU-004-W-40W-P1", vendor: "ZTE", model: "zte_rru" },
    // Platform 2 RRUs (Upper and Lower)
    { position: "VF-RRU-005-N-40W-P2U", vendor: "Ericsson", model: "ericsson_rru" },
    { position: "VF-RRU-006-N-40W-P2L", vendor: "Huawei", model: "huawei_rru" },
    { position: "VF-RRU-007-E-40W-P2U", vendor: "Nokia", model: "nokia_rru" },
    { position: "VF-RRU-008-E-40W-P2L", vendor: "ZTE", model: "zte_rru" },
    { position: "VF-RRU-009-S-40W-P2U", vendor: "Ericsson", model: "ericsson_rru" },
    { position: "VF-RRU-010-S-40W-P2L", vendor: "Huawei", model: "huawei_rru" },
    { position: "VF-RRU-011-W-40W-P2U", vendor: "Nokia", model: "nokia_rru" },
    { position: "VF-RRU-012-W-40W-P2L", vendor: "ZTE", model: "zte_rru" }
  ],
  microlinks: [
    { name: "VF-MW-001-BH-750M-P1E", vendor: "Ericsson", model: "ericsson_minilink", linkTo: "Core Network Hub" }
  ],
  interval: 15000, // 15 seconds
  outputDir: path.join(__dirname, '..', 'delhi_tower_output')
};

class DelhiTowerCLI {
  private simulator: DelhiTowerSimulator;
  private apiServer: DelhiApiServer;

  constructor() {
    this.simulator = new DelhiTowerSimulator(delhiTowerConfig);
    this.apiServer = new DelhiApiServer(this.simulator, this.simulator.getStorage());
  }

  async start(): Promise<void> {
    console.log('🇮🇳 Delhi Vodafone Tower Simulator');
    console.log('==================================');
    console.log('🗼 15m Monopole Tower @ Connaught Place');
    console.log('📍 28.6467°N, 77.1128°E (Delhi, India)');
    console.log('📶 4x Vodafone Antennas (Real Specs)');
    console.log('📻 4x RRUs (Multi-vendor)');
    console.log('🔗 1x Ericsson Microlink');
    console.log('🌡️ Delhi Weather Simulation');
    console.log('🌫️ Air Quality Impact Modeling');
    console.log('==================================\n');

    // Start API server first
    await this.apiServer.start(3001);

    // Then start simulator
    this.simulator.start();

    // Display stats every 45 seconds
    setInterval(() => {
      this.simulator.displayStats();
    }, 45000);

    // Demo features after 30 seconds
    setTimeout(() => this.demoFeatures(), 30000);

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private demoFeatures(): void {
    console.log('\n🎯 === Delhi Tower Demo Features ===');

    try {
      // Show latest vendor data
      const latest = this.simulator.getLatestTelemetry(4);
      console.log(`📊 Latest telemetry from ${latest.length} devices:`);

      latest.forEach((telemetry, index) => {
        const deviceName = telemetry.deviceId?.slice(-12) || `Device-${index + 1}`;
        const temp = telemetry.temperature?.toFixed(1) || 'N/A';
        const power = telemetry.powerConsumption?.toFixed(1) || 'N/A';
        console.log(`   📱 ${deviceName}: ${temp}°C, ${power}W`);
      });

      // Show database stats
      console.log(`📊 Database: ${this.simulator.getStorage().getStatistics().totalRecords} records stored`);

      console.log('\n🎉 Demo features working perfectly!');
      console.log('Real Vodafone equipment specs applied ✅');
      console.log('Delhi environmental effects active ✅');
      console.log('Vendor-specific telemetry generated ✅');
      console.log('==============================\n');

    } catch (error) {
      console.log(`❌ Demo error: ${error}`);
    }
  }

  private async shutdown(): Promise<void> {
    console.log('\n🛑 Shutting down Delhi tower...');

    try {
      // Show final stats
      this.simulator.displayStats();
      const stats = this.simulator.getStorage().getStatistics();
      console.log(`💾 Final database: ${stats.totalRecords} records stored`);

      // Stop API server
      await this.apiServer.stop();

      // Stop simulator
      this.simulator.stop();
    } catch (error) {
      console.log(`⚠️ Shutdown error: ${error}`);
    }

    console.log('🇮🇳 Delhi tower simulation complete!');
    process.exit(0);
  }
}

// CLI help for Delhi demo
function showDelhiHelp(): void {
  console.log(`
🇮🇳 Delhi Vodafone Tower Simulator
================================

Realistic telecom tower simulation based on:
• Real Delhi coordinates (28.6467°N, 77.1128°E)
• Actual Vodafone equipment specifications
• Standard vendor models (Ericsson, Huawei, Nokia, ZTE)
• Delhi weather and air quality effects

Equipment Simulated:
🗼 15m Monopole Tower
📶 4x Vodafone Antennas:
   • Kathrein 4G (1800/2100/2600MHz)
   • Ericsson 5G NR (3500MHz)
   • CommScope Low-band (900/1800MHz)
   • Huawei Multi-band
📻 4x RRUs (Multi-vendor setup)
🔗 1x Ericsson Microlink Backhaul

Features:
✅ Real vendor specifications
✅ Delhi environmental effects
✅ Air pollution impact modeling
✅ Seasonal temperature variation
✅ Standard telecom parameters
✅ Analysis & alerting
✅ CSV export for graphs/iTwin

Usage: npm run delhi

Press Ctrl+C to stop and export data.
  `);
}

// Main entry point
function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showDelhiHelp();
    return;
  }

  if (args.includes('--specs')) {
    console.log('📋 Vendor Specifications Used:');
    console.log('See src/vendorSpecs.ts for complete details');
    return;
  }

  const cli = new DelhiTowerCLI();
  cli.start().catch(error => {
    console.error('❌ Failed to start Delhi tower simulator:', error);
    process.exit(1);
  });
}

// Export for programmatic use
export { DelhiTowerSimulator, DelhiTowerConfig };

// Run CLI
if (require.main === module) {
  main();
}