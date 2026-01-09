/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


/**
 * Test script to verify calculations match Python script exactly
 * Run with: npx ts-node src/frontend/structural-analysis/test-calculation.ts
 */

import { StructuralAnalysisEngine } from './StructuralAnalysisEngine';
import { AnalysisInput } from './types';

console.log('='.repeat(80));
console.log('CALCULATION VERIFICATION TEST - COMPARING WITH PYTHON SCRIPT');
console.log('='.repeat(80));
console.log();

const engine = new StructuralAnalysisEngine();

// EXACT configuration from Python script (lines 262-353)
const input: AnalysisInput = {
  sections: [
    {
      height: 15000,        // 15 meters in mm
      diameter_bottom: 628, // 628mm base
      diameter_top: 250,    // 250mm top
      thickness: 5,         // 5mm wall thickness
    },
  ],

  applied_load_kg: 0,
  wind_speed_ms: 20.0,  // NOTE: Python uses 20.0, not 25.0!
  exposure: 'C',
  steel_grade: 'S355',

  foundation_params: {
    base_plate_diameter: 750,
    bolt_circle_diameter: 750,
    number_of_bolts: 16,
    bolt_diameter: 22,
    bolt_grade: 420,
    concrete_strength: 25,
    anchor_length: 900,
  },

  crown_platforms: [
    {
      height: 14.0,
      platform_weight_kg: 150,
      platform_wind_area_m2: 1.5,
      cf: 1.5,

      // 4 Sector Antennas
      antennas: [
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
      ],

      // 6 RRUs
      rrus: [
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
      ],

      other_equipment: [
        { type: 'Microlink', weight_kg: 25, wind_area_m2: 0.3, cf: 1.0 },
      ],
    },
    {
      height: 11.0,
      platform_weight_kg: 120,
      platform_wind_area_m2: 1.3,
      cf: 1.5,

      // 4 Sector Antennas
      antennas: [
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
        { type: 'Sector Antenna', weight_kg: 40, wind_area_m2: 1.5, cf: 1.2 },
      ],

      // 6 RRUs
      rrus: [
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
        { type: 'RRU', weight_kg: 30, wind_area_m2: 0.6, cf: 1.0 },
      ],

      other_equipment: [
        { type: 'Power Distribution', weight_kg: 20, wind_area_m2: 0.25, cf: 1.0 },
      ],
    },
  ],
};

console.log('INPUT CONFIGURATION:');
console.log('-------------------');
console.log(`Tower: 15m height, 628mm base, 250mm top, 5mm thick`);
console.log(`Wind: ${input.wind_speed_ms} m/s, Exposure ${input.exposure}`);
console.log(`Steel: ${input.steel_grade}`);
console.log(`Platform 1 (14m): 4 antennas, 6 RRUs, 1 Microlink`);
console.log(`Platform 2 (11m): 4 antennas, 6 RRUs, 1 Power Dist`);
console.log();

// Step-by-step calculation verification
console.log('STEP-BY-STEP CALCULATION:');
console.log('-------------------------');
console.log();

// 1. Dead load
console.log('1. DEAD LOAD CALCULATION:');
const { poleWeight, crownWeight } = engine.calculateDeadLoad(input.sections, input.crown_platforms);
console.log(`   Pole Weight: ${poleWeight.toFixed(1)} kg`);
console.log(`   Crown Weight: ${crownWeight.toFixed(1)} kg`);
console.log(`   Expected (Python): Pole ~469.8 kg, Crown ~1075 kg`);
console.log();

// 2. Wind load - detailed breakdown
console.log('2. WIND LOAD CALCULATION (DETAILED):');
console.log(`   Wind Speed: ${input.wind_speed_ms} m/s`);
console.log(`   Exposure: ${input.exposure}`);

// Calculate Kz for different heights
const kz_7_5 = engine.calculateKz(7.5, 'C');  // Section center height
const kz_14 = engine.calculateKz(14.0, 'C');  // Platform 1
const kz_11 = engine.calculateKz(11.0, 'C');  // Platform 2
console.log(`   Kz at 7.5m (section center): ${kz_7_5.toFixed(4)}`);
console.log(`   Kz at 14.0m (Platform 1): ${kz_14.toFixed(4)}`);
console.log(`   Kz at 11.0m (Platform 2): ${kz_11.toFixed(4)}`);

const { windForce, windMoment } = engine.calculateWindLoad(
  input.sections,
  input.wind_speed_ms!,
  input.exposure,
  input.crown_platforms
);
console.log(`   Total Wind Force: ${windForce.toFixed(2)} N`);
console.log(`   Total Wind Moment: ${(windMoment / 1000).toFixed(2)} kN⋅m`);
console.log();

// 3. Moment capacity
console.log('3. MOMENT CAPACITY:');
const { momentCapacity: poleMomentCapacity } = engine.calculateMomentCapacity(
  input.sections[0].diameter_bottom,
  input.sections[0].thickness,
  input.steel_grade
);
console.log(`   Pole Moment Capacity: ${(poleMomentCapacity / 1000).toFixed(2)} kN⋅m`);
console.log(`   Allowable Pole Moment (÷2): ${(poleMomentCapacity / 2000).toFixed(2)} kN⋅m`);

if (input.foundation_params) {
  const { foundationMomentCapacity } = engine.calculateFoundationCapacity(input.foundation_params);
  console.log(`   Foundation Moment Capacity: ${(foundationMomentCapacity / 1000).toFixed(2)} kN⋅m`);
  console.log(`   Allowable Foundation Moment (÷2): ${(foundationMomentCapacity / 2000).toFixed(2)} kN⋅m`);
}
console.log();

// Run full analysis
console.log('='.repeat(80));
console.log('FULL ANALYSIS RESULTS:');
console.log('='.repeat(80));
const results = engine.analyzeMonopole(input);

console.log();
console.log('EXPECTED PYTHON SCRIPT OUTPUT (with wind_speed=20 m/s):');
console.log('--------------------------------------------------------');
console.log('Tower Height:              15.0 m');
console.log('Pole Weight:               469.8 kg');
console.log('Crown Equipment Weight:    1075.0 kg');
console.log('Total Dead Load:           1544.8 kg');
console.log('Wind Speed:                20 m/s (72.0 km/h)');
console.log('Wind Force:                ~5000-6000 N');
console.log('Wind Moment:               ~60-70 kN⋅m');
console.log('Governing Element:         FOUNDATION');
console.log();

console.log('COMPARISON:');
console.log('-----------');
console.log(`Pole Weight:     ${results.pole_weight_kg.toFixed(1)} kg vs 469.8 kg (Python)`);
console.log(`Crown Weight:    ${results.crown_weight_kg.toFixed(1)} kg vs 1075.0 kg (Python)`);
console.log(`Wind Force:      ${results.wind_force_n.toFixed(0)} N`);
console.log(`Wind Moment:     ${(results.wind_moment_nm / 1000).toFixed(1)} kN⋅m`);
console.log(`Max Utilization: ${(results.max_utilization * 100).toFixed(1)}%`);
console.log(`Governing:       ${results.governing_element}`);
console.log();

// Manual wind calculation check
console.log('='.repeat(80));
console.log('MANUAL WIND CALCULATION VERIFICATION:');
console.log('='.repeat(80));
console.log();

const kzt = 1.0, kd = 0.95, cf_pole = 0.5;
const section = input.sections[0];

// Pole section wind
const h = section.height / 1000;
const d_avg = ((section.diameter_top + section.diameter_bottom) / 2) / 1000;
const projected_area = d_avg * h;
const section_center_height = h / 2;
const kz_section = engine.calculateKz(section_center_height, 'C');
const qz_section = 0.613 * kz_section * kzt * kd * Math.pow(input.wind_speed_ms!, 2);
const wind_force_section = qz_section * cf_pole * projected_area;

console.log('POLE SECTION:');
console.log(`  Height: ${h} m`);
console.log(`  Avg Diameter: ${d_avg.toFixed(4)} m`);
console.log(`  Projected Area: ${projected_area.toFixed(4)} m²`);
console.log(`  Center Height: ${section_center_height} m`);
console.log(`  Kz: ${kz_section.toFixed(4)}`);
console.log(`  qz: ${qz_section.toFixed(4)} N/m²`);
console.log(`  Wind Force: ${wind_force_section.toFixed(2)} N`);
console.log(`  Moment: ${(wind_force_section * section_center_height / 1000).toFixed(2)} kN⋅m`);
console.log();

// Platform 1 wind
console.log('PLATFORM 1 (14m):');
const p1 = input.crown_platforms![0];
const kz_p1 = engine.calculateKz(p1.height, 'C');
const qz_p1 = 0.613 * kz_p1 * kzt * kd * Math.pow(input.wind_speed_ms!, 2);
console.log(`  Kz: ${kz_p1.toFixed(4)}`);
console.log(`  qz: ${qz_p1.toFixed(4)} N/m²`);

let p1_force = 0;
// Antennas
const ant_force = qz_p1 * 1.2 * 1.5;
p1_force += ant_force * p1.antennas.length;
console.log(`  Antenna force (each): ${ant_force.toFixed(2)} N × ${p1.antennas.length} = ${(ant_force * p1.antennas.length).toFixed(2)} N`);

// RRUs
const rru_force = qz_p1 * 1.0 * 0.6;
p1_force += rru_force * p1.rrus.length;
console.log(`  RRU force (each): ${rru_force.toFixed(2)} N × ${p1.rrus.length} = ${(rru_force * p1.rrus.length).toFixed(2)} N`);

// Other equipment
const eq_force = qz_p1 * 1.0 * 0.3;
p1_force += eq_force;
console.log(`  Microlink force: ${eq_force.toFixed(2)} N`);

// Platform structure
const plat_force = qz_p1 * 1.5 * 1.5;
p1_force += plat_force;
console.log(`  Platform force: ${plat_force.toFixed(2)} N`);
console.log(`  Total P1 Force: ${p1_force.toFixed(2)} N`);
console.log(`  P1 Moment: ${(p1_force * p1.height / 1000).toFixed(2)} kN⋅m`);
console.log();

// Platform 2 wind
console.log('PLATFORM 2 (11m):');
const p2 = input.crown_platforms![1];
const kz_p2 = engine.calculateKz(p2.height, 'C');
const qz_p2 = 0.613 * kz_p2 * kzt * kd * Math.pow(input.wind_speed_ms!, 2);
console.log(`  Kz: ${kz_p2.toFixed(4)}`);
console.log(`  qz: ${qz_p2.toFixed(4)} N/m²`);

let p2_force = 0;
// Antennas
const ant_force_p2 = qz_p2 * 1.2 * 1.5;
p2_force += ant_force_p2 * p2.antennas.length;
console.log(`  Antenna force (each): ${ant_force_p2.toFixed(2)} N × ${p2.antennas.length} = ${(ant_force_p2 * p2.antennas.length).toFixed(2)} N`);

// RRUs
const rru_force_p2 = qz_p2 * 1.0 * 0.6;
p2_force += rru_force_p2 * p2.rrus.length;
console.log(`  RRU force (each): ${rru_force_p2.toFixed(2)} N × ${p2.rrus.length} = ${(rru_force_p2 * p2.rrus.length).toFixed(2)} N`);

// Other equipment
const eq_force_p2 = qz_p2 * 1.0 * 0.25;
p2_force += eq_force_p2;
console.log(`  Power Dist force: ${eq_force_p2.toFixed(2)} N`);

// Platform structure
const plat_force_p2 = qz_p2 * 1.5 * 1.3;
p2_force += plat_force_p2;
console.log(`  Platform force: ${plat_force_p2.toFixed(2)} N`);
console.log(`  Total P2 Force: ${p2_force.toFixed(2)} N`);
console.log(`  P2 Moment: ${(p2_force * p2.height / 1000).toFixed(2)} kN⋅m`);
console.log();

console.log('TOTAL WIND:');
const total_manual_force = wind_force_section + p1_force + p2_force;
const total_manual_moment = (wind_force_section * section_center_height) + (p1_force * p1.height) + (p2_force * p2.height);
console.log(`  Force: ${total_manual_force.toFixed(2)} N`);
console.log(`  Moment: ${(total_manual_moment / 1000).toFixed(2)} kN⋅m`);
console.log(`  Engine Force: ${windForce.toFixed(2)} N`);
console.log(`  Engine Moment: ${(windMoment / 1000).toFixed(2)} kN⋅m`);
console.log(`  Match: ${Math.abs(total_manual_force - windForce) < 0.01 ? '✅ YES' : '❌ NO'}`);
