import math

class MonopoleStructuralAnalysis:
    def __init__(self):
        self.steel_density = 7850  # kg/m³
        self.gravity = 9.81  # m/s²
        self.verbose = False  # Control detailed output

    def calculate_dead_load(self, sections, crown_platforms=None):
        """Calculate dead load (weight) of monopole and crown platforms"""
        total_weight_kg = 0

        # Calculate pole sections
        for section in sections:
            height_m = section['height'] / 1000
            d_avg_m = ((section['diameter_top'] + section['diameter_bottom']) / 2) / 1000
            thickness_m = section['thickness'] / 1000
            
            # Steel volume
            outer_volume = math.pi * (d_avg_m / 2) ** 2 * height_m
            inner_volume = math.pi * ((d_avg_m / 2) - thickness_m) ** 2 * height_m
            steel_volume_m3 = outer_volume - inner_volume
            total_weight_kg += steel_volume_m3 * self.steel_density

        # Calculate crown platforms
        crown_weight_kg = 0
        if crown_platforms:
            for platform in crown_platforms:
                crown_weight_kg += platform.get('platform_weight_kg', 0)
                crown_weight_kg += sum(ant.get('weight_kg', 0) for ant in platform.get('antennas', []))
                crown_weight_kg += sum(rru.get('weight_kg', 0) for rru in platform.get('rrus', []))
                crown_weight_kg += sum(eq.get('weight_kg', 0) for eq in platform.get('other_equipment', []))

        return total_weight_kg, crown_weight_kg

    def calculate_kz(self, height_m, exposure='C'):
        """Calculate height-dependent velocity pressure coefficient"""
        exposure_params = {
            'C': {'base': 0.85, 'zg': 274.32, 'alpha': 9.5, 'breakpoints': [(4.6, 0.85), (6.1, 0.90), (9.1, 0.98), (12.2, 1.04), (15.2, 1.09)]},
            'B': {'base': 0.57, 'zg': 365.76, 'alpha': 7.0, 'breakpoints': [(9.1, 0.57), (12.2, 0.62), (15.2, 0.66)]},
            'D': {'base': 1.03, 'zg': 213.36, 'alpha': 11.5, 'breakpoints': [(4.6, 1.03), (6.1, 1.08), (9.1, 1.16)]}
        }
        
        params = exposure_params.get(exposure, exposure_params['C'])
        
        # Check breakpoints
        for height_limit, kz_value in params['breakpoints']:
            if height_m < height_limit:
                return kz_value
        
        # Use formula for heights above breakpoints
        return params['base'] * (height_m / params['breakpoints'][0][0]) ** (2 / params['alpha'])

    def calculate_wind_load(self, sections, wind_speed_ms, exposure='C', crown_platforms=None):
        """Calculate wind load based on ASCE 7"""
        kzt, kd, cf = 1.0, 0.95, 0.5
        total_wind_force, wind_moment, height_cumulative = 0, 0, 0

        # Wind on pole sections
        for section in sections:
            h = section['height'] / 1000
            d_avg = ((section['diameter_top'] + section['diameter_bottom']) / 2) / 1000
            projected_area = d_avg * h
            section_center_height = height_cumulative + h / 2
            
            kz = self.calculate_kz(section_center_height, exposure)
            qz = 0.613 * kz * kzt * kd * (wind_speed_ms ** 2)
            wind_force = qz * cf * projected_area
            
            total_wind_force += wind_force
            wind_moment += wind_force * section_center_height
            height_cumulative += h

        # Wind on crown platforms
        if crown_platforms:
            for platform in crown_platforms:
                platform_height = platform['height']
                kz = self.calculate_kz(platform_height, exposure)
                qz = 0.613 * kz * kzt * kd * (wind_speed_ms ** 2)
                
                # Antennas
                for antenna in platform.get('antennas', []):
                    force = qz * antenna.get('cf', 1.2) * antenna.get('wind_area_m2', 0)
                    total_wind_force += force
                    wind_moment += force * platform_height
                
                # RRUs
                for rru in platform.get('rrus', []):
                    force = qz * rru.get('cf', 1.0) * rru.get('wind_area_m2', 0)
                    total_wind_force += force
                    wind_moment += force * platform_height
                
                # Platform structure
                platform_area = platform.get('platform_wind_area_m2', 0)
                if platform_area > 0:
                    force = qz * platform.get('cf', 1.5) * platform_area
                    total_wind_force += force
                    wind_moment += force * platform_height

        return total_wind_force, wind_moment

    def calculate_moment_capacity(self, diameter_mm, thickness_mm, steel_grade='S355'):
        """Calculate bending moment capacity"""
        yield_strengths = {'A36': 248, 'A572-50': 345, 'A992': 345, 'S355': 355}
        fy_mpa = yield_strengths.get(steel_grade, 355)
        
        d_outer = diameter_mm / 1000
        thickness = thickness_mm / 1000
        d_inner = d_outer - 2 * thickness
        
        section_modulus_m3 = (math.pi / 32) * (d_outer**4 - d_inner**4) / d_outer
        moment_capacity_nm = section_modulus_m3 * fy_mpa * 1e6
        
        return moment_capacity_nm, section_modulus_m3

    def calculate_foundation_capacity(self, foundation_params):
        """Calculate foundation and anchor bolt capacity"""
        bolt_circle_dia = foundation_params['bolt_circle_diameter'] / 1000
        num_bolts = foundation_params['number_of_bolts']
        bolt_diameter = foundation_params['bolt_diameter'] / 1000
        bolt_grade = foundation_params['bolt_grade']
        
        bolt_area = math.pi * (bolt_diameter ** 2) / 4
        bolt_tensile_capacity = bolt_area * bolt_grade * 1e6 * 0.75
        
        lever_arm = bolt_circle_dia / 2
        bolts_in_tension = num_bolts / 2
        total_bolt_capacity = bolts_in_tension * bolt_tensile_capacity
        
        foundation_moment_capacity = total_bolt_capacity * lever_arm
        allowable_foundation_moment = foundation_moment_capacity / 2.0
        
        return allowable_foundation_moment, bolt_tensile_capacity

    def calculate_load_combinations(self, wind_moment_nm, applied_moment_nm, governing_moment):
        """Calculate utilization for load combinations per ASCE 7"""
        combinations = {
            'LRFD_1.4D': 0,
            'LRFD_1.2D+1.6W': applied_moment_nm + 1.6 * wind_moment_nm,
            'LRFD_1.2D+1.0W': applied_moment_nm + 1.0 * wind_moment_nm,
            'LRFD_0.9D+1.6W': applied_moment_nm + 1.6 * wind_moment_nm,
            'ASD_D': 0,
            'ASD_D+W': applied_moment_nm + wind_moment_nm,
            'ASD_D+0.75W': applied_moment_nm + 0.75 * wind_moment_nm,
            'ASD_0.6D+0.6W': applied_moment_nm + 0.6 * wind_moment_nm
        }
        
        utilizations = {name: moment / governing_moment for name, moment in combinations.items()}
        max_utilization = max(utilizations.values())
        governing_combo = max(utilizations.items(), key=lambda x: x[1])[0]
        
        return combinations, utilizations, governing_combo, max_utilization

    def analyze_monopole(self, sections, applied_load_kg=0, wind_speed_ms=0, exposure='C', 
                        steel_grade='S355', foundation_params=None, crown_platforms=None):
        """Complete monopole structural analysis"""
        
        # 1. Dead load
        pole_weight_kg, crown_weight_kg = self.calculate_dead_load(sections, crown_platforms)
        total_dead_load_kg = pole_weight_kg + crown_weight_kg
        
        # 2. Total height
        total_height_m = sum(section['height'] for section in sections) / 1000
        
        # 3. Structural capacity
        bottom_section = sections[0]
        pole_moment_capacity, _ = self.calculate_moment_capacity(
            bottom_section['diameter_bottom'], 
            bottom_section['thickness'], 
            steel_grade
        )
        allowable_pole_moment = pole_moment_capacity / 2.0
        
        # 4. Foundation capacity
        if foundation_params:
            allowable_foundation_moment, _ = self.calculate_foundation_capacity(foundation_params)
            governing_moment = min(allowable_pole_moment, allowable_foundation_moment)
            governing_element = "FOUNDATION" if allowable_foundation_moment < allowable_pole_moment else "POLE"
        else:
            governing_moment = allowable_pole_moment
            governing_element = "POLE"
        
        # 5. Wind loads
        wind_force, wind_moment = self.calculate_wind_load(sections, wind_speed_ms, exposure, crown_platforms) if wind_speed_ms > 0 else (0, 0)
        
        # 6. Applied load moment
        applied_moment = applied_load_kg * self.gravity * total_height_m
        
        # 7. Load combinations
        combinations, utilizations, governing_combo, max_utilization = self.calculate_load_combinations(
            wind_moment, applied_moment, governing_moment
        )
        
        # 8. Remaining capacity and max load
        remaining_moment = governing_moment - combinations[governing_combo]
        remaining_load_capacity = remaining_moment / (self.gravity * total_height_m) if total_height_m > 0 else 0
        
        # Calculate maximum load capacity (total capacity at top)
        max_load_capacity = governing_moment / (self.gravity * total_height_m) if total_height_m > 0 else 0
        
        # Status determination
        if max_utilization > 1.0:
            status = "FAIL - Structure is overstressed!"
        elif max_utilization > 0.9:
            status = "CRITICAL - Very high utilization"
        elif max_utilization > 0.8:
            status = "WARNING - High utilization"
        elif max_utilization > 0.6:
            status = "GOOD - Adequately designed"
        else:
            status = "CONSERVATIVE - Significant reserve capacity"
        
        # Print summary
        print("=" * 80)
        print("MONOPOLE STRUCTURAL ANALYSIS - BALANCED 15M TOWER")
        print("=" * 80)
        print(f"Tower Height:              {total_height_m:.1f} m")
        print(f"Pole Weight:               {pole_weight_kg:.1f} kg")
        print(f"Crown Equipment Weight:    {crown_weight_kg:.1f} kg")
        print(f"Total Dead Load:           {total_dead_load_kg:.1f} kg")
        print(f"Wind Speed:                {wind_speed_ms} m/s ({wind_speed_ms * 3.6:.1f} km/h)")
        print(f"Wind Force:                {wind_force:.0f} N")
        print(f"Wind Moment:               {wind_moment/1000:.0f} kN⋅m")
        print(f"Governing Element:         {governing_element}")
        print(f"Governing Capacity:        {governing_moment/1000:.0f} kN⋅m")
        print()
        print("LOAD COMBINATIONS & UTILIZATION RATIOS:")
        print("-" * 80)
        for combo_name, utilization in utilizations.items():
            marker = " ← GOVERNING" if combo_name == governing_combo else ""
            print(f"{combo_name:20s}  Utilization: {utilization:.3f} ({utilization*100:.1f}%){marker}")
        print("-" * 80)
        print()
        print(f"Maximum Utilization:       {max_utilization:.3f} ({max_utilization*100:.1f}%)")
        print(f"Maximum Load Capacity:     {max_load_capacity:.0f} kg (at tower top)")
        print(f"Remaining Load Capacity:   {remaining_load_capacity:.0f} kg")
        print(f"Status:                    {status}")
        print("=" * 80)
        
        return {
            'pole_weight_kg': pole_weight_kg,
            'crown_weight_kg': crown_weight_kg,
            'total_dead_load_kg': total_dead_load_kg,
            'wind_force_n': wind_force,
            'wind_moment_nm': wind_moment,
            'governing_element': governing_element,
            'governing_combo': governing_combo,
            'max_utilization': max_utilization,
            'max_load_capacity_kg': max_load_capacity,
            'remaining_capacity_kg': remaining_load_capacity,
            'status': status,
            'all_combinations': combinations,
            'all_utilizations': utilizations
        }


# BALANCED 15M TOWER CONFIGURATION
if __name__ == "__main__":
    analyzer = MonopoleStructuralAnalysis()
    
    # Balanced single section monopole - 15 meters
    monopole_sections = [
        {
            'height': 15000,  # 15 meters in mm
            'diameter_bottom': 628,  # 628mm base
            'diameter_top': 250,  # 250mm top
            'thickness': 5  # 5mm wall thickness
        }
    ]
    
    # Two crown platforms with equipment
    # Platform 1 at 14m: 4 Antennas + 6 RRUs
    # Platform 2 at 11m: 4 Antennas + 6 RRUs
    crown_platforms = [
        {
            'height': 14.0,
            'platform_weight_kg': 150,
            'platform_wind_area_m2': 1.5,
            'cf': 1.5,

            # 4 Sector Antennas
            'antennas': [
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
            ],

            # 6 RRUs
            'rrus': [
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                # {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                # {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0}
            ],

            'other_equipment': [
                {'type': 'Microlink', 'weight_kg': 25, 'wind_area_m2': 0.3, 'cf': 1.0}
            ]
        },
        {
            'height': 11.0,
            'platform_weight_kg': 120,
            'platform_wind_area_m2': 1.3,
            'cf': 1.5,

            # 4 Sector Antennas
            'antennas': [
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                {'type': 'Sector Antenna', 'weight_kg': 40, 'wind_area_m2': 1.5, 'cf': 1.2},
                
            ],

            # 6 RRUs
            'rrus': [
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0},
                {'type': 'RRU', 'weight_kg': 30, 'wind_area_m2': 0.6, 'cf': 1.0}
            ],

'other_equipment': [
                {'type': 'Microlink', 'weight_kg': 25, 'wind_area_m2': 0.3, 'cf': 1.0}
            ]
            # 'other_equipment': [
            #     {'type': 'Power Distribution', 'weight_kg': 20, 'wind_area_m2': 0.25, 'cf': 1.0}
            # ]
        }
    ]
    
    # Foundation parameters for 15m tower
    foundation_parameters = {
        'base_plate_diameter': 750,
        'bolt_circle_diameter': 750,
        'number_of_bolts': 16,
        'bolt_diameter': 22,
        'bolt_grade': 420,
        'concrete_strength': 25,
        'anchor_length': 900
    }
    
    # Run structural analysis
    results = analyzer.analyze_monopole(
        monopole_sections,
        applied_load_kg=0,
        wind_speed_ms=20.0,
        exposure='C',
        steel_grade='S355',
        foundation_params=foundation_parameters,
        crown_platforms=crown_platforms
    )