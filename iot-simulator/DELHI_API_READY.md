# 🎯 **Delhi Tower API Server - READY!**

## ✅ **Successful Integration Complete**

The Delhi Vodafone tower simulator now runs as a **full HTTP API server on port 3001** with **database-only storage** for optimal performance and analysis.

## 🚀 **Start the API Server**

```bash
cd iot-simulator
npm run delhi
```

**The simulator now provides:**
- 🖥️ **HTTP API Server** on `http://localhost:3001`
- 🗄️ **SQLite Database** storage only (no JSON/CSV files)
- 📡 **Real-time API endpoints** for telemetry data
- 🔄 **Live data generation** every 15 seconds

## 📡 **API Endpoints Available**

### **Health Check:**
```
GET http://localhost:3001/health
```

### **Latest Telemetry Data:**
```
GET http://localhost:3001/api/telemetry/latest
GET http://localhost:3001/api/telemetry/latest?limit=50
```

### **Device-Specific Data:**
```
GET http://localhost:3001/api/telemetry/device/VF-ANT-001-N-L18-P1
GET http://localhost:3001/api/telemetry/device/VF-RRU-001-N-40W-P1
```

### **Time Range Queries:**
```
GET http://localhost:3001/api/telemetry/range?start=2025-09-27T10:00:00Z&end=2025-09-27T12:00:00Z
```

### **All Devices:**
```
GET http://localhost:3001/api/devices
```

### **Database Statistics:**
```
GET http://localhost:3001/api/stats
```

## 🔗 **iTwin Integration Ready**

The iTwin viewer integration is **automatically configured** to connect to:
```
http://localhost:3001/api/telemetry/latest
```

## 📊 **API Response Format**

```json
{
  "success": true,
  "timestamp": "2025-09-27T17:45:30.123Z",
  "count": 17,
  "telemetry": [
    {
      "deviceId": "VF-ANT-001-N-L18-P1",
      "timestamp": "2025-09-27T17:45:30.123Z",
      "sequenceNumber": 1234,
      "temperature": 42.5,
      "transmitPower": 43.2,
      "signalStrength": -45.8,
      "powerConsumption": 125.3,
      "uptime": 99.98,
      // ... more telemetry fields
    }
    // ... 16 more devices
  ]
}
```

## 🎯 **Data Storage**

- **Database Only**: `delhi_tower_output/telemetry.db`
- **No File Outputs**: Removed JSON/CSV file generation
- **Optimized for Analysis**: SQLite database with indexes
- **API Performance**: Fast queries with prepared statements

## 🌟 **Features**

### **Real Equipment IDs:**
- **Platform 1**: `VF-ANT-001-N-L18-P1` to `VF-ANT-004-W-MB-P1` (4 antennas)
- **Platform 1**: `VF-RRU-001-N-40W-P1` to `VF-RRU-004-W-40W-P1` (4 RRUs)
- **Platform 1**: `VF-MW-001-BH-750M-P1E` (1 microlink)
- **Platform 2**: `VF-ANT-005-N-L18-P2` to `VF-ANT-008-W-MB-P2` (4 antennas)
- **Platform 2**: `VF-RRU-005-N-40W-P2U` to `VF-RRU-012-W-40W-P2L` (8 RRUs)

### **Telemetry Data:**
- 🌡️ Temperature, power consumption, signal strength
- 📶 SNR, VSWR, uptime, availability
- 🔌 Power amplifier efficiency, active carriers
- 🌍 Delhi environmental effects (temperature, air quality)
- ⚡ Real vendor specifications applied

## 🎬 **Usage Flow**

1. **Start Simulator**: `npm run delhi`
2. **API Server Starts**: `http://localhost:3001`
3. **Real-time Data**: Generated every 15 seconds
4. **iTwin Integration**: Automatically fetches from API
5. **Dashboard Widget**: Shows live equipment status

## 📈 **API Server Logs**

```
🇮🇳 Delhi Vodafone Tower Simulator
==================================
🗼 15m Monopole Tower @ Connaught Place
📍 28.6467°N, 77.1128°E (Delhi, India)
🚀 Delhi Tower API Server running on http://localhost:3001
📡 Available endpoints:
   GET  /health                     - Server health check
   GET  /api/telemetry/latest       - Latest telemetry data
   GET  /api/telemetry/device/:id   - Device-specific data
   GET  /api/telemetry/range        - Time range query
   GET  /api/devices                - All devices info
   GET  /api/stats                  - Database statistics
```

## ✅ **Ready for iTwin Integration!**

Your Delhi Vodafone tower simulator is now **fully API-enabled** and ready for real-time iTwin viewer integration!

The system will:
1. **Generate telemetry** for 17 Vodafone tower elements
2. **Store in database** for analysis and graphs
3. **Serve via HTTP API** on port 3001
4. **Integrate with iTwin** for live monitoring

**Perfect for real-time Delhi tower visualization in your iTwin viewer!** 🎯📡