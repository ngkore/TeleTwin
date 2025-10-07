# 🇮🇳 Delhi Vodafone Tower Simulator

## ✅ **Customized for Your Demo**

Realistic simulation of a **15m monopole tower** in **Delhi, India** with **real Vodafone equipment** and **standard vendor specifications**.

## 🗼 **Tower Specifications:**

### 📍 **Location:**
- **Coordinates:** 28.6467°N, 77.1128°E (Connaught Place, Delhi)
- **Tower Type:** 15m Monopole
- **Operator:** Vodafone India

### 📶 **4x Vodafone Antennas (Real Models):**
1. **North Sector:** Kathrein KMW APXVAALL18-43-1D65 (1800/2100/2600MHz)
2. **East Sector:** Ericsson AIR 3268 (5G NR 3500MHz)
3. **South Sector:** CommScope AHLX-65C15V-VTM (900/1800MHz)
4. **West Sector:** Huawei ATR4518R6v06 (Multi-band)

### 📻 **4x RRUs (Multi-Vendor Setup):**
1. **Ericsson Radio 4449 B66** (4G/5G, 40W output)
2. **Huawei RRU5502** (5G NR, 40W output)
3. **Nokia FRMA B66** (4G LTE, 40W output)
4. **ZTE ZXSDR R8882** (4G LTE, 40W output)

### 🔗 **1x Microlink Backhaul:**
- **Ericsson MINI-LINK 6351** (23GHz, 750Mbps)

## 🚀 **How to Run:**

```bash
cd iot-simulator

# Run Delhi tower simulation
npm run delhi

# Or build and run
npm run delhi:build

# Show help
npm run delhi -- --help
```

## 📊 **Features:**

✅ **Real vendor specifications** - Actual equipment models and specs
✅ **Delhi environmental effects** - Temperature, humidity, air quality
✅ **Standard telecom parameters** - Industry-standard values
✅ **Pollution impact modeling** - Delhi air quality affects signals
✅ **Seasonal variations** - Summer/Winter/Monsoon conditions
✅ **Multi-vendor RRU setup** - Realistic operator deployment
✅ **Analysis & alerting** - Real-time performance monitoring
✅ **Single file storage** - Clean data for analysis

## 🌡️ **Delhi-Specific Simulation:**

- **Temperature:** 8°C (winter) to 45°C (summer)
- **Air Quality:** PM2.5 ~150 μg/m³ (affects signal quality)
- **Humidity:** 40% (winter) to 85% (monsoon)
- **Seasonal Effects:** Equipment stress modeling
- **IST Timezone:** All timestamps in Indian Standard Time

## 📁 **Output:**

```
delhi_tower_output/
├── telemetry_data.json  ← All Delhi tower data
├── telemetry.db         ← SQLite database
└── telemetry_export.csv ← For analysis/graphs
```

## 📈 **Data Structure:**

Each telemetry record includes:
- **Real vendor equipment IDs**
- **Standard telecom parameters**
- **Delhi environmental conditions**
- **Pollution impact on signals**
- **Equipment-specific specifications**

## 🎯 **Perfect For:**

- **Demo presentations** with real equipment names
- **iTwin viewer integration** with Delhi coordinates
- **Performance analysis** with standard parameters
- **Vendor comparison** across multi-vendor setup
- **Environmental impact** studies

**Ready for your demo with authentic Vodafone Delhi tower data!** 🎯

---

### 🔧 **Commands:**
- `npm run delhi` - Start Delhi tower simulation
- `npm run delhi -- --specs` - Show vendor specifications
- `Ctrl+C` - Stop and export final data