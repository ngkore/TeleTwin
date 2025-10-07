/*---------------------------------------------------------------------------------------------
 * Structural Analysis Engine
 *
 * Complete monopole tower structural analysis calculations based on ASCE 7 standards.
 * Ported from Python implementation.
 *--------------------------------------------------------------------------------------------*/

import {
  TowerSection,
  CrownPlatform,
  FoundationParameters,
  ExposureCategory,
  SteelGrade,
  LoadCombinations,
  AnalysisResults,
  AnalysisInput,
} from './types';

export class StructuralAnalysisEngine {
  private readonly STEEL_DENSITY = 7850; // kg/m³
  private readonly GRAVITY = 9.81; // m/s²

  /**
   * Calculate dead load (weight) of monopole and crown platforms
   */
  calculateDeadLoad(
    sections: TowerSection[],
    crownPlatforms?: CrownPlatform[]
  ): { poleWeight: number; crownWeight: number } {
    let totalWeightKg = 0;

    // Calculate pole sections
    for (const section of sections) {
      const heightM = section.height / 1000;
      const dAvgM = ((section.diameter_top + section.diameter_bottom) / 2) / 1000;
      const thicknessM = section.thickness / 1000;

      // Steel volume
      const outerVolume = Math.PI * Math.pow(dAvgM / 2, 2) * heightM;
      const innerVolume = Math.PI * Math.pow(dAvgM / 2 - thicknessM, 2) * heightM;
      const steelVolumeM3 = outerVolume - innerVolume;
      totalWeightKg += steelVolumeM3 * this.STEEL_DENSITY;
    }

    // Calculate crown platforms
    let crownWeightKg = 0;
    if (crownPlatforms) {
      for (const platform of crownPlatforms) {
        crownWeightKg += platform.platform_weight_kg || 0;
        crownWeightKg += platform.antennas.reduce((sum, ant) => sum + (ant.weight_kg || 0), 0);
        crownWeightKg += platform.rrus.reduce((sum, rru) => sum + (rru.weight_kg || 0), 0);
        crownWeightKg += platform.other_equipment.reduce((sum, eq) => sum + (eq.weight_kg || 0), 0);
      }
    }

    return { poleWeight: totalWeightKg, crownWeight: crownWeightKg };
  }

  /**
   * Calculate height-dependent velocity pressure coefficient (Kz)
   */
  calculateKz(heightM: number, exposure: ExposureCategory = 'C'): number {
    interface ExposureParams {
      base: number;
      zg: number;
      alpha: number;
      breakpoints: Array<[number, number]>;
    }

    const exposureParams: Record<ExposureCategory, ExposureParams> = {
      C: {
        base: 0.85,
        zg: 274.32,
        alpha: 9.5,
        breakpoints: [
          [4.6, 0.85],
          [6.1, 0.9],
          [9.1, 0.98],
          [12.2, 1.04],
          [15.2, 1.09],
        ],
      },
      B: {
        base: 0.57,
        zg: 365.76,
        alpha: 7.0,
        breakpoints: [
          [9.1, 0.57],
          [12.2, 0.62],
          [15.2, 0.66],
        ],
      },
      D: {
        base: 1.03,
        zg: 213.36,
        alpha: 11.5,
        breakpoints: [
          [4.6, 1.03],
          [6.1, 1.08],
          [9.1, 1.16],
        ],
      },
    };

    const params = exposureParams[exposure];

    // Check breakpoints
    for (const [heightLimit, kzValue] of params.breakpoints) {
      if (heightM < heightLimit) {
        return kzValue;
      }
    }

    // Use formula for heights above breakpoints
    return params.base * Math.pow(heightM / params.breakpoints[0][0], 2 / params.alpha);
  }

  /**
   * Calculate wind load based on ASCE 7
   */
  calculateWindLoad(
    sections: TowerSection[],
    windSpeedMs: number,
    exposure: ExposureCategory = 'C',
    crownPlatforms?: CrownPlatform[]
  ): { windForce: number; windMoment: number } {
    const kzt = 1.0;
    const kd = 0.95;
    const cf = 0.5;

    let totalWindForce = 0;
    let windMoment = 0;
    let heightCumulative = 0;

    // Wind on pole sections
    for (const section of sections) {
      const h = section.height / 1000;
      const dAvg = ((section.diameter_top + section.diameter_bottom) / 2) / 1000;
      const projectedArea = dAvg * h;
      const sectionCenterHeight = heightCumulative + h / 2;

      const kz = this.calculateKz(sectionCenterHeight, exposure);
      const qz = 0.613 * kz * kzt * kd * Math.pow(windSpeedMs, 2);
      const windForce = qz * cf * projectedArea;

      totalWindForce += windForce;
      windMoment += windForce * sectionCenterHeight;
      heightCumulative += h;
    }

    // Wind on crown platforms
    if (crownPlatforms) {
      for (const platform of crownPlatforms) {
        const platformHeight = platform.height;
        const kz = this.calculateKz(platformHeight, exposure);
        const qz = 0.613 * kz * kzt * kd * Math.pow(windSpeedMs, 2);

        // Antennas
        for (const antenna of platform.antennas) {
          const force = qz * (antenna.cf || 1.2) * (antenna.wind_area_m2 || 0);
          totalWindForce += force;
          windMoment += force * platformHeight;
        }

        // RRUs
        for (const rru of platform.rrus) {
          const force = qz * (rru.cf || 1.0) * (rru.wind_area_m2 || 0);
          totalWindForce += force;
          windMoment += force * platformHeight;
        }

        // Platform structure
        const platformArea = platform.platform_wind_area_m2 || 0;
        if (platformArea > 0) {
          const force = qz * (platform.cf || 1.5) * platformArea;
          totalWindForce += force;
          windMoment += force * platformHeight;
        }
      }
    }

    return { windForce: totalWindForce, windMoment };
  }

  /**
   * Calculate bending moment capacity
   */
  calculateMomentCapacity(
    diameterMm: number,
    thicknessMm: number,
    steelGrade: SteelGrade = 'S355'
  ): { momentCapacity: number; sectionModulus: number } {
    const yieldStrengths: Record<SteelGrade, number> = {
      A36: 248,
      'A572-50': 345,
      A992: 345,
      S355: 355,
    };

    const fyMpa = yieldStrengths[steelGrade];

    const dOuter = diameterMm / 1000;
    const thickness = thicknessMm / 1000;
    const dInner = dOuter - 2 * thickness;

    const sectionModulusM3 = (Math.PI / 32) * (Math.pow(dOuter, 4) - Math.pow(dInner, 4)) / dOuter;
    const momentCapacityNm = sectionModulusM3 * fyMpa * 1e6;

    return { momentCapacity: momentCapacityNm, sectionModulus: sectionModulusM3 };
  }

  /**
   * Calculate foundation and anchor bolt capacity
   */
  calculateFoundationCapacity(foundationParams: FoundationParameters): {
    foundationMomentCapacity: number;
    boltTensileCapacity: number;
  } {
    const boltCircleDia = foundationParams.bolt_circle_diameter / 1000;
    const numBolts = foundationParams.number_of_bolts;
    const boltDiameter = foundationParams.bolt_diameter / 1000;
    const boltGrade = foundationParams.bolt_grade;

    const boltArea = Math.PI * Math.pow(boltDiameter, 2) / 4;
    const boltTensileCapacity = boltArea * boltGrade * 1e6 * 0.75;

    const leverArm = boltCircleDia / 2;
    const boltsInTension = numBolts / 2;
    const totalBoltCapacity = boltsInTension * boltTensileCapacity;

    const foundationMomentCapacity = totalBoltCapacity * leverArm;

    return { foundationMomentCapacity, boltTensileCapacity };
  }

  /**
   * Calculate utilization for load combinations per ASCE 7
   */
  calculateLoadCombinations(
    windMomentNm: number,
    appliedMomentNm: number,
    governingMoment: number
  ): {
    combinations: LoadCombinations;
    utilizations: Record<keyof LoadCombinations, number>;
    governingCombo: keyof LoadCombinations;
    maxUtilization: number;
  } {
    const combinations: LoadCombinations = {
      'LRFD_1.4D': 0,
      'LRFD_1.2D+1.6W': appliedMomentNm + 1.6 * windMomentNm,
      'LRFD_1.2D+1.0W': appliedMomentNm + 1.0 * windMomentNm,
      'LRFD_0.9D+1.6W': appliedMomentNm + 1.6 * windMomentNm,
      'ASD_D': 0,
      'ASD_D+W': appliedMomentNm + windMomentNm,
      'ASD_D+0.75W': appliedMomentNm + 0.75 * windMomentNm,
      'ASD_0.6D+0.6W': appliedMomentNm + 0.6 * windMomentNm,
    };

    const utilizations = Object.fromEntries(
      Object.entries(combinations).map(([name, moment]) => [name, moment / governingMoment])
    ) as Record<keyof LoadCombinations, number>;

    const maxUtilization = Math.max(...Object.values(utilizations));
    const governingCombo = (Object.entries(utilizations).reduce((max, entry) =>
      entry[1] > max[1] ? entry : max
    )[0] as keyof LoadCombinations);

    return { combinations, utilizations, governingCombo, maxUtilization };
  }

  /**
   * Complete monopole structural analysis
   */
  analyzeMonopole(input: AnalysisInput): AnalysisResults {
    ////console.log('[StructuralAnalysis] ▶ ENGINE: analyzeMonopole() START');
    ////console.log('[StructuralAnalysis] ─────────────────────────────────────');

    const {
      sections,
      applied_load_kg = 0,
      wind_speed_ms = 0,
      exposure = 'C',
      steel_grade = 'S355',
      foundation_params,
      crown_platforms,
    } = input;

    // 1. Dead load
    ////console.log('[StructuralAnalysis] 📐 Step 1: Calculating Dead Load...');
    const { poleWeight, crownWeight } = this.calculateDeadLoad(sections, crown_platforms);
    const totalDeadLoadKg = poleWeight + crownWeight;
    console.log(`[StructuralAnalysis]   ├─ Pole Weight: ${poleWeight.toFixed(1)} kg`);
    console.log(`[StructuralAnalysis]   ├─ Crown Equipment Weight: ${crownWeight.toFixed(1)} kg`);
    console.log(`[StructuralAnalysis]   └─ Total Dead Load: ${totalDeadLoadKg.toFixed(1)} kg`);

    // 2. Total height
    const totalHeightM = sections.reduce((sum, section) => sum + section.height, 0) / 1000;
    console.log(`[StructuralAnalysis] 📏 Step 2: Tower Height = ${totalHeightM.toFixed(1)} m`);

    // 3. Structural capacity
    console.log('[StructuralAnalysis] 💪 Step 3: Calculating Pole Moment Capacity...');
    const bottomSection = sections[0];
    console.log(`[StructuralAnalysis]   ├─ Base Diameter: ${bottomSection.diameter_bottom} mm`);
    console.log(`[StructuralAnalysis]   ├─ Wall Thickness: ${bottomSection.thickness} mm`);
    console.log(`[StructuralAnalysis]   └─ Steel Grade: ${steel_grade}`);

    const { momentCapacity: poleMomentCapacity } = this.calculateMomentCapacity(
      bottomSection.diameter_bottom,
      bottomSection.thickness,
      steel_grade
    );
    const allowablePoleMoment = poleMomentCapacity / 2.0;
    console.log(`[StructuralAnalysis]   ├─ Pole Moment Capacity: ${(poleMomentCapacity / 1000).toFixed(0)} kN⋅m`);
    console.log(`[StructuralAnalysis]   └─ Allowable Pole Moment (÷2): ${(allowablePoleMoment / 1000).toFixed(0)} kN⋅m`);

    // 4. Foundation capacity
    console.log('[StructuralAnalysis] 🔩 Step 4: Calculating Foundation Capacity...');
    let governingMoment: number;
    let governingElement: 'POLE' | 'FOUNDATION';
    let foundationMomentCapacity: number | undefined;

    if (foundation_params) {
      const { foundationMomentCapacity: foundationCapacity } =
        this.calculateFoundationCapacity(foundation_params);
      foundationMomentCapacity = foundationCapacity / 2.0;
      governingMoment = Math.min(allowablePoleMoment, foundationMomentCapacity);
      governingElement = foundationMomentCapacity < allowablePoleMoment ? 'FOUNDATION' : 'POLE';

      console.log(`[StructuralAnalysis]   ├─ Foundation Moment Capacity: ${(foundationCapacity / 1000).toFixed(2)} kN⋅m`);
      console.log(`[StructuralAnalysis]   ├─ Allowable Foundation Moment (÷2): ${(foundationMomentCapacity / 1000).toFixed(2)} kN⋅m`);
      console.log(`[StructuralAnalysis]   ├─ Governing Moment: ${(governingMoment / 1000).toFixed(2)} kN⋅m`);
      console.log(`[StructuralAnalysis]   └─ Governing Element: ${governingElement}`);
    } else {
      governingMoment = allowablePoleMoment;
      governingElement = 'POLE';
      console.log(`[StructuralAnalysis]   └─ No foundation params, using POLE capacity: ${(governingMoment / 1000).toFixed(2)} kN⋅m`);
    }

    // 5. Wind loads
    console.log('[StructuralAnalysis] 💨 Step 5: Calculating Wind Loads...');
    console.log(`[StructuralAnalysis]   ├─ Wind Speed: ${wind_speed_ms} m/s`);
    console.log(`[StructuralAnalysis]   └─ Exposure Category: ${exposure}`);

    const { windForce, windMoment } =
      wind_speed_ms > 0
        ? this.calculateWindLoad(sections, wind_speed_ms, exposure, crown_platforms)
        : { windForce: 0, windMoment: 0 };

    console.log(`[StructuralAnalysis]   ├─ Wind Force: ${windForce.toFixed(0)} N`);
    console.log(`[StructuralAnalysis]   └─ Wind Moment: ${(windMoment / 1000).toFixed(2)} kN⋅m`);

    // 6. Applied load moment
    const appliedMoment = applied_load_kg * this.GRAVITY * totalHeightM;
    console.log(`[StructuralAnalysis] ⚖️ Step 6: Applied Load Moment = ${(appliedMoment / 1000).toFixed(2)} kN⋅m`);

    // 7. Load combinations
    console.log('[StructuralAnalysis] 🔢 Step 7: Evaluating Load Combinations...');
    const { combinations, utilizations, governingCombo, maxUtilization } =
      this.calculateLoadCombinations(windMoment, appliedMoment, governingMoment);

    console.log('[StructuralAnalysis]   Load Combination Utilizations:');
    Object.entries(utilizations).forEach(([combo, util]) => {
      const marker = combo === governingCombo ? ' ← GOVERNING' : '';
      console.log(`[StructuralAnalysis]     ${combo}: ${(util * 100).toFixed(1)}%${marker}`);
    });
    console.log(`[StructuralAnalysis]   └─ Max Utilization: ${(maxUtilization * 100).toFixed(1)}%`);

    // 8. Remaining capacity and max load
    const remainingMoment = governingMoment - combinations[governingCombo];
    const remainingLoadCapacity = totalHeightM > 0 ? remainingMoment / (this.GRAVITY * totalHeightM) : 0;

    // Calculate maximum load capacity (total capacity at top)
    const maxLoadCapacity = totalHeightM > 0 ? governingMoment / (this.GRAVITY * totalHeightM) : 0;

    // Status determination
    //console.log('[StructuralAnalysis] ✅ Step 8: Determining Status...');
    let status: string;
    if (maxUtilization > 1.0) {
      status = 'FAIL - Structure is overstressed!';
    } else if (maxUtilization > 0.9) {
      status = 'CRITICAL - Very high utilization';
    } else if (maxUtilization > 0.8) {
      status = 'WARNING - High utilization';
    } else if (maxUtilization > 0.6) {
      status = 'GOOD - Adequately designed';
    } else {
      status = 'CONSERVATIVE - Significant reserve capacity';
    }
    //console.log(`[StructuralAnalysis]   └─ Status: ${status}`);
    //console.log('[StructuralAnalysis] ─────────────────────────────────────');
    //console.log('[StructuralAnalysis] ▶ ENGINE: analyzeMonopole() COMPLETE');

    return {
      pole_weight_kg: poleWeight,
      crown_weight_kg: crownWeight,
      total_dead_load_kg: totalDeadLoadKg,
      wind_force_n: windForce,
      wind_moment_nm: windMoment,
      governing_element: governingElement,
      governing_combo: governingCombo,
      max_utilization: maxUtilization,
      max_load_capacity_kg: maxLoadCapacity,
      remaining_capacity_kg: remainingLoadCapacity,
      status,
      all_combinations: combinations,
      all_utilizations: utilizations,
      total_height_m: totalHeightM,
      pole_moment_capacity_nm: poleMomentCapacity,
      foundation_moment_capacity_nm: foundationMomentCapacity,
    };
  }
}
