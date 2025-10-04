/*---------------------------------------------------------------------------------------------
 * Telemetry Mapper
 *
 * This service maps raw telemetry data from IoT devices to iTwin element properties.
 * It applies transformation rules, calculates derived metrics, and determines equipment
 * health status based on telemetry readings.
 *
 * Key Features:
 * - Equipment-specific mapping rules for antennas, RRUs, and microlinks
 * - Automatic unit conversion and value transformation
 * - Health score calculation based on operational parameters
 * - Performance index computation for equipment monitoring
 *--------------------------------------------------------------------------------------------*/

import { ModelElement, VodafoneElement, TelemetryData, iTwinPropertyUpdate, MappingRule } from "./types";

export class TelemetryMapper {
  private mappingRules: Map<string, MappingRule[]> = new Map();

  constructor() {
    this.initializeMappingRules();
  }

  /**
   * Initialize telemetry-to-property mapping rules for each equipment type
   * Defines how telemetry fields map to iTwin properties with units and transformations
   */
  private initializeMappingRules(): void {
    // Antenna telemetry mappings
    this.mappingRules.set('antenna', [
      { telemetryField: 'transmitPower', iTwinProperty: 'Transmit_Power_dBm', unit: 'dBm' },
      { telemetryField: 'receivePower', iTwinProperty: 'Receive_Power_dBm', unit: 'dBm' },
      { telemetryField: 'signalStrength', iTwinProperty: 'Signal_Strength_dBm', unit: 'dBm' },
      { telemetryField: 'snr', iTwinProperty: 'SNR_dB', unit: 'dB' },
      { telemetryField: 'temperature', iTwinProperty: 'Temperature_Celsius', unit: '°C' },
      { telemetryField: 'humidity', iTwinProperty: 'Humidity_Percent', unit: '%' },
      { telemetryField: 'powerConsumption', iTwinProperty: 'Power_Consumption_Watts', unit: 'W' },
      { telemetryField: 'voltage', iTwinProperty: 'Voltage_DC', unit: 'V' },
      { telemetryField: 'current', iTwinProperty: 'Current_Amperes', unit: 'A' },
      { telemetryField: 'uptime', iTwinProperty: 'Uptime_Percent', unit: '%' },
      { telemetryField: 'vswr', iTwinProperty: 'VSWR' },
      { telemetryField: 'returnLoss', iTwinProperty: 'Return_Loss_dB', unit: 'dB' }
    ]);

    // RRU telemetry mappings
    this.mappingRules.set('rru', [
      { telemetryField: 'transmitPower', iTwinProperty: 'Transmit_Power_dBm', unit: 'dBm' },
      { telemetryField: 'receiveSensitivity', iTwinProperty: 'Receive_Sensitivity_dBm', unit: 'dBm' },
      { telemetryField: 'powerConsumption', iTwinProperty: 'Power_Consumption_Watts', unit: 'W' },
      { telemetryField: 'temperature.internal', iTwinProperty: 'Internal_Temperature_Celsius', unit: '°C' },
      { telemetryField: 'temperature.external', iTwinProperty: 'External_Temperature_Celsius', unit: '°C' },
      { telemetryField: 'humidity', iTwinProperty: 'Humidity_Percent', unit: '%' },
      { telemetryField: 'dcVoltage', iTwinProperty: 'DC_Voltage', unit: 'V' },
      { telemetryField: 'dcCurrent', iTwinProperty: 'DC_Current_Amperes', unit: 'A' },
      { telemetryField: 'uptime', iTwinProperty: 'Uptime_Percent', unit: '%' },
      { telemetryField: 'availability', iTwinProperty: 'Availability_Percent', unit: '%' }
    ]);

    // Microlink telemetry mappings
    this.mappingRules.set('microlink', [
      { telemetryField: 'receivedSignalLevel', iTwinProperty: 'Received_Signal_Level_dBm', unit: 'dBm' },
      { telemetryField: 'transmitPowerLevel', iTwinProperty: 'Transmit_Power_Level_dBm', unit: 'dBm' },
      { telemetryField: 'linkMargin', iTwinProperty: 'Link_Margin_dB', unit: 'dB' },
      { telemetryField: 'signalToNoiseRatio', iTwinProperty: 'Signal_To_Noise_Ratio_dB', unit: 'dB' },
      { telemetryField: 'currentCapacity', iTwinProperty: 'Current_Capacity_Mbps', unit: 'Mbps' },
      { telemetryField: 'linkQuality', iTwinProperty: 'Link_Quality_Percent', unit: '%' },
      { telemetryField: 'temperature.outdoor', iTwinProperty: 'Outdoor_Temperature_Celsius', unit: '°C' },
      { telemetryField: 'temperature.indoor', iTwinProperty: 'Indoor_Temperature_Celsius', unit: '°C' },
      { telemetryField: 'powerConsumption', iTwinProperty: 'Power_Consumption_Watts', unit: 'W' },
      { telemetryField: 'dcVoltage', iTwinProperty: 'DC_Voltage', unit: 'V' },
      { telemetryField: 'dcCurrent', iTwinProperty: 'DC_Current_Amperes', unit: 'A' },
      { telemetryField: 'linkState', iTwinProperty: 'Link_State' }
    ]);
  }

  /**
   * Map telemetry data to iTwin properties for a specific element
   * Applies all relevant mapping rules and calculates derived metrics
   *
   * @param telemetryData - Raw telemetry data from device
   * @param elementInfo - Element and equipment information for mapping context
   * @returns Property update object ready to apply to iTwin element
   */
  mapTelemetryToiTwin(
    telemetryData: TelemetryData,
    elementInfo: { element: ModelElement; vodafone: VodafoneElement }
  ): iTwinPropertyUpdate {
    const equipmentType = elementInfo.vodafone.equipmentType;
    const mappingRules = this.mappingRules.get(equipmentType) || [];

    const iTwinProperties: { [key: string]: any } = {
      Device_ID: telemetryData.deviceId,
      Last_Update_Timestamp: telemetryData.timestamp,
      Sequence_Number: telemetryData.sequenceNumber,
      Equipment_Type: equipmentType.toUpperCase(),
      Vendor: elementInfo.vodafone.vendor,
      Model: elementInfo.vodafone.model,
      Platform: elementInfo.vodafone.platform,
      Sector: elementInfo.vodafone.sector,
      Status: this.determineEquipmentStatus(telemetryData)
    };

    // Apply mapping rules to transform telemetry to iTwin properties
    mappingRules.forEach(rule => {
      const value = this.getNestedValue(telemetryData, rule.telemetryField);

      if (value !== undefined && value !== null) {
        let mappedValue = value;

        // Apply transformation if specified
        if (rule.transform) {
          mappedValue = rule.transform(value);
        }

        // Store property value and unit separately
        if (rule.unit) {
          iTwinProperties[rule.iTwinProperty] = mappedValue;
          iTwinProperties[`${rule.iTwinProperty}_Unit`] = rule.unit;
        } else {
          iTwinProperties[rule.iTwinProperty] = mappedValue;
        }
      }
    });

    // Add calculated derived properties
    this.addCalculatedProperties(iTwinProperties, telemetryData, equipmentType);

    return {
      elementId: elementInfo.element.elementId,
      properties: iTwinProperties,
      timestamp: telemetryData.timestamp
    };
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue(obj, 'temperature.internal') returns obj.temperature.internal
   *
   * @param obj - Source object
   * @param path - Dot-notation path to value
   * @returns Value at path, or undefined if not found
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Determine equipment operational status based on telemetry readings
   * Evaluates temperature, power consumption, uptime, and alarm conditions
   *
   * @param telemetryData - Telemetry data to evaluate
   * @returns Status string: OPERATIONAL, DEGRADED, ALARM, OVERHEATING, or HIGH_POWER
   */
  private determineEquipmentStatus(telemetryData: TelemetryData): string {
    const temp = this.getNestedValue(telemetryData, 'temperature') ||
                  this.getNestedValue(telemetryData, 'temperature.internal');

    const powerConsumption = telemetryData.powerConsumption;
    const uptime = telemetryData.uptime;

    if (temp && temp > 70) return 'OVERHEATING';
    if (powerConsumption && powerConsumption > 400) return 'HIGH_POWER';
    if (uptime && uptime < 95) return 'DEGRADED';

    // Check for active alarms
    const alarms = ['overTemperatureAlarm', 'highVswrAlarm', 'powerSupplyAlarm', 'communicationAlarm'];
    const hasAlarms = alarms.some(alarm => this.getNestedValue(telemetryData, alarm));

    if (hasAlarms) return 'ALARM';

    return 'OPERATIONAL';
  }

  /**
   * Add equipment-specific calculated properties
   * Includes health scores, performance indices, and derived metrics
   *
   * @param properties - Property object to augment
   * @param telemetryData - Source telemetry data
   * @param equipmentType - Type of equipment for specific calculations
   */
  private addCalculatedProperties(
    properties: { [key: string]: any },
    telemetryData: TelemetryData,
    equipmentType: string
  ): void {
    properties.Health_Score = this.calculateHealthScore(telemetryData, equipmentType);
    properties.Performance_Index = this.calculatePerformanceIndex(telemetryData, equipmentType);
  }

  /**
   * Calculate equipment health score (0-100)
   * Based on temperature, power consumption, and uptime
   *
   * @param telemetryData - Telemetry data for scoring
   * @param equipmentType - Equipment type for threshold adjustments
   * @returns Health score from 0-100
   */
  private calculateHealthScore(telemetryData: TelemetryData, equipmentType: string): number {
    let score = 100;

    // Temperature penalty
    const temp = this.getNestedValue(telemetryData, 'temperature') ||
                  this.getNestedValue(telemetryData, 'temperature.internal') || 25;

    if (temp > 50) score -= (temp - 50) * 2;
    if (temp > 70) score -= 20;

    // Power consumption penalty
    const power = telemetryData.powerConsumption || 0;
    const maxExpectedPower = equipmentType === 'microlink' ? 100 :
                            equipmentType === 'antenna' ? 150 : 300;

    if (power > maxExpectedPower * 1.2) score -= 15;

    // Uptime penalty
    const uptime = telemetryData.uptime || 100;
    if (uptime < 99) score -= (99 - uptime) * 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate equipment performance index (0-100)
   * Equipment-specific metric based on key performance indicators
   *
   * @param telemetryData - Telemetry data for calculation
   * @param equipmentType - Equipment type for specific metrics
   * @returns Performance index from 0-100
   */
  private calculatePerformanceIndex(telemetryData: TelemetryData, equipmentType: string): number {
    let index = 100;

    switch (equipmentType) {
      case 'antenna':
        const snr = telemetryData.snr || 0;
        const vswr = telemetryData.vswr || 1;
        index = Math.min(100, (snr / 25) * 50 + ((2 - vswr) / 1) * 50);
        break;

      case 'rru':
        const availability = telemetryData.availability || 99;
        index = (availability / 100) * 100;
        break;

      case 'microlink':
        const linkQuality = telemetryData.linkQuality || 90;
        index = (linkQuality / 100) * 100;
        break;
    }

    return Math.max(0, Math.min(100, index));
  }

  /**
   * Get mapping rules for specific equipment type
   *
   * @param equipmentType - Equipment type to get rules for
   * @returns Array of mapping rules
   */
  getMappingRules(equipmentType: string): MappingRule[] {
    return this.mappingRules.get(equipmentType) || [];
  }

  /**
   * Generate comprehensive mapping report
   * Shows all configured rules for validation and documentation
   *
   * @returns Report object with mapping statistics and rule details
   */
  generateMappingReport(): any {
    const report: any = {
      timestamp: new Date().toISOString(),
      equipmentTypes: Array.from(this.mappingRules.keys()),
      totalMappingRules: 0,
      rulesByType: {}
    };

    this.mappingRules.forEach((rules, type) => {
      report.rulesByType[type] = {
        ruleCount: rules.length,
        properties: rules.map(rule => ({
          telemetryField: rule.telemetryField,
          iTwinProperty: rule.iTwinProperty,
          hasTransform: !!rule.transform,
          unit: rule.unit
        }))
      };
      report.totalMappingRules += rules.length;
    });

    return report;
  }
}