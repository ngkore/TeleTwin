/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


// Simple utility functions for data generation

export class DataGenerators {
  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateTemperature(base = 25, variation = 10): number {
    return base + this.randomFloat(-variation, variation);
  }

  static generateSignalStrength(distance: number, frequency: number, basePower: number): number {
    const pathLoss = 20 * Math.log10(distance) + 20 * Math.log10(frequency) + 32.45;
    return basePower - pathLoss + this.randomFloat(-10, 5);
  }

  static generatePowerConsumption(maxPower: number, load: number): number {
    const basePower = maxPower * 0.1;
    const variablePower = maxPower * 0.9 * (load / 100);
    return basePower + variablePower + this.randomFloat(-maxPower * 0.05, maxPower * 0.05);
  }

  static generateBER(snr: number): number {
    const ber = 0.5 * Math.exp(-snr / 10);
    return Math.max(1e-12, Math.min(1e-3, ber));
  }

  static generateWind(): { speed: number; direction: number } {
    return {
      speed: this.randomFloat(0, 20),
      direction: this.randomFloat(0, 360)
    };
  }

  static generateVibration(windSpeed: number): { x: number; y: number; z: number } {
    const windEffect = windSpeed / 100;
    return {
      x: this.randomFloat(-0.1, 0.1) + windEffect * this.randomFloat(-0.05, 0.05),
      y: this.randomFloat(-0.1, 0.1) + windEffect * this.randomFloat(-0.05, 0.05),
      z: this.randomFloat(-0.05, 0.05)
    };
  }

  static generateUptime(mtbf = 8760): number {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const hoursInMonth = (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60);
    const expectedDowntime = hoursInMonth / mtbf;
    const actualDowntime = expectedDowntime * this.randomFloat(0.5, 2);
    return Math.max(95, Math.min(100, 100 - (actualDowntime / hoursInMonth) * 100));
  }
}