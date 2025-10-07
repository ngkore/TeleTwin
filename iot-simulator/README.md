# IoT Simulator V3 - Clean & Simple 🚀

## ✅ **FIXED - No More Timestamp Errors!**

Clean, simple IoT simulator with perfect single-file storage.

## 🎯 **What You Get:**

### 📁 **Clean Output** (Only 2 Files!)
```
output/
├── telemetry_data.json  ← All your IoT data in ONE file!
└── telemetry.db         ← SQLite backup for queries
```

### 🚀 **How to Use:**
```bash
cd iot-simulator

# Start simulator
npm run dev

# Or build and run
npm start
```

## 📊 **Perfect Data Structure:**

### Single JSON File:
```json
{
  "metadata": { "created": "2025-09-27T...", "description": "IoT Telemetry Data" },
  "devices": [ { "id": "...", "name": "Antenna-North-Tower", ... } ],
  "telemetry": [
    { "deviceId": "...", "timestamp": "2025-09-27T...", ...data... }
  ]
}
```

## 🎯 **Key Features:**

✅ **Single file storage** - No more file spam!
✅ **Clean timestamps** - All stored as ISO strings
✅ **Auto CSV export** - Perfect for analysis
✅ **SQLite backup** - For complex queries
✅ **File rotation** - Keeps files manageable
✅ **Real-time stats** - Monitor performance
✅ **No type errors** - Rock solid TypeScript

## 📱 **Device Types:**
- **3 Antennas** - RF performance, environmental data
- **2 RRUs** - Power, carriers, thermal management  
- **2 Microlinks** - Link quality, weather effects

**Perfect for your data analysis and iTwin integration!** 🎯
