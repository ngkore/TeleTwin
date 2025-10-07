// Standard vendor specifications based on real equipment

export interface VendorSpecs {
  antennas: {
    [key: string]: {
      model: string;
      vendor: string;
      frequencyBands: string[];
      gain: number; // dBi
      beamwidth: { horizontal: number; vertical: number };
      maxPower: number; // watts
      vswr: number;
      polarization: string;
      impedance: number;
      connectorType: string;
      dimensions: { length: number; width: number; height: number }; // meters
      weight: number; // kg
    };
  };
  rrus: {
    [key: string]: {
      model: string;
      vendor: string;
      technology: string[];
      frequencyBands: string[];
      maxOutputPower: number; // dBm
      numberOfCarriers: number;
      numberOfSectors: number;
      powerConsumption: number; // watts
      operatingTemp: { min: number; max: number }; // celsius
      dimensions: { width: number; depth: number; height: number }; // cm
      weight: number; // kg
    };
  };
  microlinks: {
    [key: string]: {
      model: string;
      vendor: string;
      frequency: number; // GHz
      channelBandwidth: number[]; // MHz
      capacity: number; // Mbps
      range: number; // km
      antennaSize: number; // meters
      transmitPower: number; // dBm
      receiverSensitivity: number; // dBm
      modulation: string[];
      powerConsumption: number; // watts
    };
  };
}

// Real vendor specifications based on industry standards
export const VENDOR_SPECS: VendorSpecs = {
  antennas: {
    vodafone_4g_antenna: {
      model: "KMW APXVAALL18-43-1D65",
      vendor: "Kathrein (Vodafone Standard)",
      frequencyBands: ["1800MHz", "2100MHz", "2600MHz"],
      gain: 17.5, // dBi
      beamwidth: { horizontal: 65, vertical: 7 },
      maxPower: 100, // watts
      vswr: 1.4,
      polarization: "±45° Dual Slant",
      impedance: 50,
      connectorType: "7/16 DIN",
      dimensions: { length: 1.8, width: 0.25, height: 0.1 },
      weight: 15.2
    },
    vodafone_5g_antenna: {
      model: "Ericsson AIR 3268",
      vendor: "Ericsson (Vodafone 5G)",
      frequencyBands: ["2100MHz", "2600MHz", "3500MHz"],
      gain: 21.0,
      beamwidth: { horizontal: 65, vertical: 6 },
      maxPower: 200,
      vswr: 1.3,
      polarization: "±45° Dual Slant",
      impedance: 50,
      connectorType: "7/16 DIN",
      dimensions: { length: 1.9, width: 0.3, height: 0.12 },
      weight: 28.5
    },
    vodafone_lowband_antenna: {
      model: "Commscope AHLX-65C15V-VTM",
      vendor: "CommScope (Vodafone 900MHz)",
      frequencyBands: ["900MHz", "1800MHz"],
      gain: 15.5,
      beamwidth: { horizontal: 65, vertical: 15 },
      maxPower: 150,
      vswr: 1.5,
      polarization: "±45° Dual Slant",
      impedance: 50,
      connectorType: "7/16 DIN",
      dimensions: { length: 2.1, width: 0.28, height: 0.08 },
      weight: 18.7
    },
    vodafone_multiband_antenna: {
      model: "Huawei ATR4518R6v06",
      vendor: "Huawei (Vodafone Multi-band)",
      frequencyBands: ["1800MHz", "2100MHz", "2300MHz", "2600MHz"],
      gain: 18.2,
      beamwidth: { horizontal: 65, vertical: 8 },
      maxPower: 120,
      vswr: 1.35,
      polarization: "±45° Dual Slant",
      impedance: 50,
      connectorType: "7/16 DIN",
      dimensions: { length: 1.85, width: 0.27, height: 0.11 },
      weight: 22.3
    }
  },
  rrus: {
    ericsson_rru: {
      model: "Ericsson Radio 4449 B66",
      vendor: "Ericsson",
      technology: ["4G LTE", "5G NR"],
      frequencyBands: ["1800MHz", "2100MHz", "2600MHz"],
      maxOutputPower: 46, // dBm (40W)
      numberOfCarriers: 6,
      numberOfSectors: 3,
      powerConsumption: 280, // watts typical
      operatingTemp: { min: -40, max: 55 },
      dimensions: { width: 48, depth: 26, height: 62 }, // cm
      weight: 25.5
    },
    huawei_rru: {
      model: "Huawei RRU5502",
      vendor: "Huawei",
      technology: ["4G LTE", "5G NR"],
      frequencyBands: ["2100MHz", "2600MHz", "3500MHz"],
      maxOutputPower: 46, // dBm (40W)
      numberOfCarriers: 8,
      numberOfSectors: 3,
      powerConsumption: 320,
      operatingTemp: { min: -40, max: 50 },
      dimensions: { width: 50, depth: 28, height: 65 },
      weight: 28.2
    },
    nokia_rru: {
      model: "Nokia FRMA B66",
      vendor: "Nokia",
      technology: ["4G LTE", "5G NR"],
      frequencyBands: ["1800MHz", "2100MHz"],
      maxOutputPower: 46,
      numberOfCarriers: 4,
      numberOfSectors: 2,
      powerConsumption: 260,
      operatingTemp: { min: -40, max: 55 },
      dimensions: { width: 46, depth: 24, height: 60 },
      weight: 22.8
    },
    zte_rru: {
      model: "ZTE ZXSDR R8882",
      vendor: "ZTE",
      technology: ["4G LTE"],
      frequencyBands: ["900MHz", "1800MHz"],
      maxOutputPower: 46,
      numberOfCarriers: 4,
      numberOfSectors: 2,
      powerConsumption: 240,
      operatingTemp: { min: -40, max: 55 },
      dimensions: { width: 44, depth: 22, height: 58 },
      weight: 20.5
    }
  },
  microlinks: {
    ericsson_minilink: {
      model: "Ericsson MINI-LINK 6351",
      vendor: "Ericsson",
      frequency: 23, // GHz
      channelBandwidth: [7, 14, 28, 56],
      capacity: 750, // Mbps
      range: 15, // km
      antennaSize: 0.6, // meters
      transmitPower: 20, // dBm
      receiverSensitivity: -88,
      modulation: ["QPSK", "16QAM", "32QAM", "64QAM", "128QAM", "256QAM"],
      powerConsumption: 85
    }
  }
};

// Delhi specific environmental constants
export const DELHI_ENVIRONMENT = {
  coordinates: { lat: 28.6467, lng: 77.1128 },
  towerHeight: 15, // meters
  averageTemp: 25, // celsius
  tempVariation: { summer: 35, winter: 8, monsoon: 28 },
  humidity: { summer: 60, winter: 40, monsoon: 85 },
  windSpeed: { average: 8, gusts: 25 }, // km/h
  airQuality: {
    pm25: 150, // μg/m³ (Delhi average)
    pm10: 250
  },
  rainfall: { monsoon: 200, other: 5 } // mm/month
};