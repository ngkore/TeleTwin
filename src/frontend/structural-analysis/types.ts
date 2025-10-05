/*---------------------------------------------------------------------------------------------
 * Structural Analysis Types
 *
 * TypeScript interfaces and types for monopole tower structural analysis
 *--------------------------------------------------------------------------------------------*/

export interface TowerSection {
  height: number;              // mm
  diameter_bottom: number;     // mm
  diameter_top: number;        // mm
  thickness: number;           // mm
}

export interface Antenna {
  type: string;
  weight_kg: number;
  wind_area_m2: number;
  cf: number;                  // drag coefficient
}

export interface RRU {
  type: string;
  weight_kg: number;
  wind_area_m2: number;
  cf: number;                  // drag coefficient
}

export interface Equipment {
  type: string;
  weight_kg: number;
  wind_area_m2?: number;
  cf?: number;
}

export interface CrownPlatform {
  height: number;              // meters
  platform_weight_kg: number;
  platform_wind_area_m2: number;
  cf: number;                  // drag coefficient for platform
  antennas: Antenna[];
  rrus: RRU[];
  other_equipment: Equipment[];
}

export interface FoundationParameters {
  base_plate_diameter: number;      // mm
  bolt_circle_diameter: number;     // mm
  number_of_bolts: number;
  bolt_diameter: number;            // mm
  bolt_grade: number;               // MPa
  concrete_strength: number;        // MPa
  anchor_length: number;            // mm
}

export type ExposureCategory = 'B' | 'C' | 'D';
export type SteelGrade = 'A36' | 'A572-50' | 'A992' | 'S355';

export interface LoadCombinations {
  'LRFD_1.4D': number;
  'LRFD_1.2D+1.6W': number;
  'LRFD_1.2D+1.0W': number;
  'LRFD_0.9D+1.6W': number;
  'ASD_D': number;
  'ASD_D+W': number;
  'ASD_D+0.75W': number;
  'ASD_0.6D+0.6W': number;
}

export interface AnalysisResults {
  pole_weight_kg: number;
  crown_weight_kg: number;
  total_dead_load_kg: number;
  wind_force_n: number;
  wind_moment_nm: number;
  governing_element: 'POLE' | 'FOUNDATION';
  governing_combo: keyof LoadCombinations;
  max_utilization: number;
  max_load_capacity_kg: number;
  remaining_capacity_kg: number;
  status: string;
  all_combinations: LoadCombinations;
  all_utilizations: Record<keyof LoadCombinations, number>;
  total_height_m: number;
  pole_moment_capacity_nm?: number;
  foundation_moment_capacity_nm?: number;
}

export interface AnalysisInput {
  sections: TowerSection[];
  applied_load_kg?: number;
  wind_speed_ms?: number;
  exposure?: ExposureCategory;
  steel_grade?: SteelGrade;
  foundation_params?: FoundationParameters;
  crown_platforms?: CrownPlatform[];
}
