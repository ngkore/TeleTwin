# Structural Analysis Architecture

## Overview
Clean, production-ready structural analysis system that extracts equipment counts from iTwin model and combines with Python script defaults for analysis.

## Core Principle
**Single Source of Truth:** Python script (`15m (2).py`) defines all structural parameters. Only equipment counts are extracted from the model.

---

## System Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. MODEL EXTRACTION (ModelDataExtractor)                    │
│    ├─ Extract equipment counts from model elements          │
│    ├─ Antennas: Count by platform (-P1, -P2)               │
│    ├─ RRUs: Count by platform                              │
│    ├─ Other equipment: Count by platform                    │
│    └─ Use default specs (40kg antennas, 30kg RRUs, etc.)   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CONFIGURATION (StructuralAnalysisManager)                │
│    ├─ Tower: 15m height, 628mm base, 250mm top, 5mm wall   │
│    ├─ Foundation: 16 bolts, 750mm circle, grade 420        │
│    ├─ Platforms: 2 platforms at 14m and 11m                │
│    ├─ Environmental: 25 m/s wind, Exposure C, S355 steel   │
│    └─ Equipment: FROM MODEL EXTRACTION (dynamic)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ANALYSIS (StructuralAnalysisEngine)                      │
│    ├─ Calculate weights (pole + equipment)                  │
│    ├─ Calculate wind loads (ASCE 7)                        │
│    ├─ Calculate moment capacity                             │
│    ├─ Evaluate load combinations                            │
│    └─ Return utilization & capacity results                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DISPLAY (StructuralAnalysisWidget + ResultsWidget)       │
│    ├─ Show equipment counts                                 │
│    ├─ Show analysis results                                 │
│    └─ Allow user modifications                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Python Script Alignment

### Tower Configuration (from `15m (2).py`)
| Parameter | Python Value | Our Value | Notes |
|-----------|-------------|-----------|-------|
| Height | 15000 mm | 15000 mm | ✅ Match |
| Base Diameter | 628 mm | 628 mm | ✅ Match |
| Top Diameter | 250 mm | 250 mm | ✅ Match |
| Wall Thickness | 5 mm | 5 mm | ✅ Match |
| Wind Speed | 20 m/s | 25 m/s (default) | ⚙️ User configurable |
| Exposure | C | C | ✅ Match |
| Steel Grade | S355 | S355 | ✅ Match |

### Platform Configuration
| Parameter | Python Value | Our Value | Notes |
|-----------|-------------|-----------|-------|
| Platform 1 Height | 14.0 m | 14.0 m | ✅ Match |
| Platform 1 Weight | 150 kg | 150 kg | ✅ Match |
| Platform 2 Height | 11.0 m | 11.0 m | ✅ Match |
| Platform 2 Weight | 120 kg | 120 kg | ✅ Match |

### Equipment Specs
| Equipment | Weight | Wind Area | Drag Coeff | Notes |
|-----------|--------|-----------|------------|-------|
| Sector Antenna | 40 kg | 1.5 m² | 1.2 | ✅ Match |
| RRU | 30 kg | 0.6 m² | 1.0 | ✅ Match |
| Microwave Dish | 25 kg | 0.3 m² | 1.2 | ✅ Match |

**Equipment Counts:** Extracted from model (not hardcoded)

### Foundation Parameters
| Parameter | Python Value | Our Value | Notes |
|-----------|-------------|-----------|-------|
| Bolt Circle Diameter | 750 mm | 750 mm | ✅ Match |
| Number of Bolts | 16 | 16 | ✅ Match |
| Bolt Diameter | 22 mm | 22 mm | ✅ Match |
| Bolt Grade | 420 MPa | 420 MPa | ✅ Match |

---

## File Responsibilities

### `ModelDataExtractor.ts`
**Purpose:** Extract equipment counts from model
- ✅ Extract antennas, RRUs, other equipment by platform
- ✅ Use default weight/wind specs (no calculations)
- ✅ Return tower defaults (15m from Python script)
- ❌ NO weight calculations or summations
- ❌ NO complex geometry extraction

### `StructuralAnalysisManager.ts`
**Purpose:** Orchestrate analysis flow and state
- ✅ Provide Python script defaults via `getDefaultTowerConfiguration()`
- ✅ Combine extracted equipment + defaults in `runAnalysisWithExtractedData()`
- ✅ Manage equipment updates via `updateEquipmentCounts()`
- ✅ Track analysis state and notify listeners
- ❌ NO hardcoded equipment counts in defaults

### `StructuralAnalysisWidget.tsx`
**Purpose:** User interface for analysis inputs
- ✅ Display equipment counts with update controls
- ✅ Allow tower dimension modifications
- ✅ Preserve equipment state when running analysis
- ✅ Trigger re-extraction and analysis
- ❌ NO losing equipment on "Run Analysis" click

### `StructuralAnalysisEngine.ts`
**Purpose:** Pure calculation engine (ASCE 7 standards)
- ✅ Calculate dead loads (weights) - ONLY PLACE weights are calculated
- ✅ Calculate wind loads with height-dependent coefficients
- ✅ Calculate moment capacity (pole + foundation)
- ✅ Evaluate load combinations (LRFD + ASD)
- ✅ Production-ready, no changes needed

### `StructuralResultsWidget.tsx`
**Purpose:** Display detailed analysis results
- ✅ Show utilization ratios
- ✅ Display load combinations
- ✅ Status indicators (PASS/FAIL/WARNING)
- ✅ Production-ready, no changes needed

---

## Data Flow Examples

### Scenario 1: Auto-Extraction on Load
```javascript
1. User opens model
2. Manager.initialize(iModel)
   └─> ModelDataExtractor.extractTowerData()
       ├─ Find equipment: 4 antennas on P1, 6 RRUs on P1, etc.
       └─ Return platforms with equipment arrays
3. Manager.runAnalysisWithExtractedData()
   ├─ Get Python script defaults (tower, foundation, wind)
   ├─ Use extracted equipment from model
   └─> Engine.analyzeMonopole()
       └─ Calculate weights here (first time)
4. Display results
```

### Scenario 2: User Updates Equipment
```javascript
1. User changes Platform 1: 4 antennas → 6 antennas
2. Widget.updatePlatformEquipment(0, { antennas: 6 })
3. Manager.updateEquipmentCounts(0, { antennas: 6 })
   ├─ Update crown_platforms[0].antennas array
   └─> Manager.runAnalysis(currentInput)
       └─> Engine.analyzeMonopole()
           └─ Recalculate weights with new counts
4. Display updated results
```

### Scenario 3: User Clicks "Run Analysis"
```javascript
1. User modifies wind speed: 25 → 30 m/s
2. User clicks "Run Analysis"
3. Widget.runAnalysis()
   ├─ Get current equipment state (preserve!)
   ├─ Combine with new wind speed
   └─> Manager.runAnalysis(input)
       └─> Engine.analyzeMonopole()
           └─ Calculate with preserved equipment + new wind
4. Display results
```

---

## Key Design Decisions

### ✅ What We Keep from Python Script
- Tower dimensions (15m, 628mm base, 250mm top, 5mm thick)
- Foundation parameters (16 bolts, 750mm circle, grade 420)
- Platform heights and weights (14m/150kg, 11m/120kg)
- Environmental defaults (25 m/s wind, Exposure C, S355 steel)
- Equipment specifications (40kg antennas, 30kg RRUs, etc.)
- Calculation methodology (ASCE 7 standards)

### 🔄 What We Extract from Model
- Equipment counts per platform
  - Antennas on P1
  - Antennas on P2
  - RRUs on P1
  - RRUs on P2
  - Other equipment (microwave, etc.)

### ⚙️ What Users Can Modify
- Tower dimensions (height, diameters, thickness)
- Wind speed
- Exposure category
- Steel grade
- Equipment counts via UI controls

---

## Production Readiness Checklist

- [x] Single source of truth for calculations
- [x] No duplicate weight calculations
- [x] Clean separation of concerns
- [x] Equipment state preservation
- [x] Python script alignment
- [x] TypeScript compilation passes
- [x] Proper error handling
- [x] Clear documentation
- [x] Scalable architecture (easy to add platforms/equipment types)
- [x] Extraction logs for debugging

---

## Future Enhancements

### Potential Improvements
1. **Multiple Tower Configurations:** Support different tower heights (10m, 15m, 20m, etc.)
2. **Custom Equipment Specs:** Allow users to define custom equipment weights/wind areas
3. **Database Integration:** Store analysis results and history
4. **Batch Analysis:** Analyze multiple towers at once
5. **3D Visualization:** Show stress distribution on tower model
6. **Report Generation:** Export PDF reports with results

### Scalability Notes
- Add new equipment types: Extend `Equipment` interface in `types.ts`
- Add new platforms: Increase `crownPlatforms` array in defaults
- Add new load combinations: Extend `LoadCombinations` interface
- Add new materials: Extend `SteelGrade` type and yield strength map

---

## Troubleshooting

### Issue: Results differ from Python script
**Check:**
1. Equipment counts match between model and expected values
2. Tower dimensions are 15m/628mm/250mm/5mm
3. Foundation params are 16 bolts/750mm circle/grade 420
4. Wind speed matches (default 25 m/s, Python example uses 20 m/s)

### Issue: Equipment updates lost
**Solution:** Already fixed - Widget now preserves `currentInput.crown_platforms`

### Issue: Weight calculations inconsistent
**Solution:** Already fixed - Weights calculated ONLY in Engine, not in Extractor

---

## References

- **Python Script:** `c:\Users\USER\Downloads\15m (2).py`
- **ASCE 7 Standards:** Wind load calculations and load combinations
- **iTwin.js Docs:** Model element extraction and queries
