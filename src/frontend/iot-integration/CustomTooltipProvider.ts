/*---------------------------------------------------------------------------------------------
 * Custom Tooltip Provider for iTwin IoT Integration
 * Provides enhanced tooltips with telemetry data when IoT is enabled
 *--------------------------------------------------------------------------------------------*/

import { HitDetail, IModelApp, ToolTipProvider } from "@itwin/core-frontend";
import { TooltipTelemetryData } from './types';

/**
 * Custom tooltip provider that enhances iTwin.js tooltips with real-time telemetry data
 * Only shows IoT data when IoT integration is active, otherwise shows default tooltips
 */
export class CustomTooltipProvider implements ToolTipProvider {
  private static _instance: CustomTooltipProvider | undefined;
  private _telemetryData: Map<string, TooltipTelemetryData> = new Map();
  private _isRegistered = false;
  private _isIoTActive = false;
  private _currentHoveredElement: string | null = null;
  private _lastHitDetail: HitDetail | null = null;
  private _updatePending = false;

  /**
   * Get singleton instance
   */
  public static getInstance(): CustomTooltipProvider {
    if (!CustomTooltipProvider._instance) {
      CustomTooltipProvider._instance = new CustomTooltipProvider();
    }
    return CustomTooltipProvider._instance;
  }

  /**
   * Register the tooltip provider with the ViewManager
   */
  public register(): void {
    if (this._isRegistered) return;

    IModelApp.viewManager.addToolTipProvider(this);
    this._isRegistered = true;
  }

  /**
   * Unregister the tooltip provider
   */
  public unregister(): void {
    if (!this._isRegistered) return;

    this.clearData();
    this._isRegistered = false;
  }

  /**
   * Set IoT active status
   */
  public setIoTActive(isActive: boolean): void {
    this._isIoTActive = isActive;
  }

  /**
   * Update telemetry data for tooltips with forced refresh
   */
  public updateTelemetryData(telemetryData: TooltipTelemetryData[]): void {
    this._telemetryData.clear();
    telemetryData.forEach(data => {
      this._telemetryData.set(data.elementId, data);
    });

    // Force tooltip update for currently hovered element
    setTimeout(() => {
      this.updateActiveTooltips();
    }, 100);
  }

  /**
   * Update telemetry data for a specific element
   */
  public updateElementData(elementId: string, data: TooltipTelemetryData): void {
    this._telemetryData.set(elementId, data);
  }

  /**
   * Clear all telemetry data
   */
  public clearData(): void {
    this._telemetryData.clear();
    this._currentHoveredElement = null;
    this._lastHitDetail = null;
    this._updatePending = false;
  }

  /**
   * Update active tooltips with real-time data (force refresh)
   */
  private updateActiveTooltips(): void {
    if (this._updatePending) return;

    if (IModelApp.notifications.isToolTipOpen && this._currentHoveredElement && this._lastHitDetail) {
      const telemetryData = this._telemetryData.get(this._currentHoveredElement);

      if (telemetryData) {
        try {
          const existingTooltip = this.findActiveTooltip();
          if (existingTooltip) {
            this.updateExistingTooltipContent(existingTooltip, telemetryData);
          }
        } catch (error) {
          console.warn('Error updating tooltip:', error);
          this._updatePending = false;
        }
      }
    }
  }

  /**
   * Find the active tooltip element
   */
  private findActiveTooltip(): HTMLElement | null {
    const strategies = [
      // Look for custom tooltip by data attributes
      () => document.querySelector('[data-metric="temperature"]')?.closest('div') as HTMLElement,
      () => document.querySelector('[data-metric="status"]')?.closest('div') as HTMLElement,
      () => document.querySelector('[data-metric="health"]')?.closest('div') as HTMLElement,

      // Common tooltip selectors
      () => document.querySelector('.imodeljs-tooltip') as HTMLElement,
      () => document.querySelector('[role="tooltip"]') as HTMLElement,

      // Positioned elements containing telemetry data
      () => {
        const tooltips = document.querySelectorAll('div[style*="position: absolute"], div[style*="position: fixed"]');
        for (const tooltip of tooltips) {
          if (tooltip.querySelector('[data-metric]')) {
            return tooltip as HTMLElement;
          }
        }
        return null;
      }
    ];

    for (const strategy of strategies) {
      try {
        const tooltip = strategy();
        if (tooltip) return tooltip;
      } catch (error) {
        // Continue with next strategy
      }
    }

    return null;
  }

  /**
   * Update existing tooltip content without repositioning
   */
  private updateExistingTooltipContent(tooltipElement: HTMLElement, data: TooltipTelemetryData): void {
    try {
      // Update temperature
      const tempElement = tooltipElement.querySelector('[data-metric="temperature"]');
      if (tempElement && data.temperature !== undefined) {
        tempElement.textContent = `${data.temperature.toFixed(1)}°C`;
      }

      // Update power consumption
      const powerElement = tooltipElement.querySelector('[data-metric="power"]');
      if (powerElement && data.powerConsumption !== undefined) {
        powerElement.textContent = `${data.powerConsumption.toFixed(1)}W`;
      }

      // Update signal strength
      const signalElement = tooltipElement.querySelector('[data-metric="signal"]');
      if (signalElement && data.signalStrength !== undefined) {
        signalElement.textContent = `${data.signalStrength.toFixed(1)}dBm`;
      }

      // Update health score
      const healthElement = tooltipElement.querySelector('[data-metric="health"]');
      if (healthElement && data.healthScore !== undefined) {
        healthElement.textContent = `${data.healthScore.toFixed(0)}%`;
      }

      // Update status badge
      const statusElement = tooltipElement.querySelector('[data-metric="status"]') as HTMLElement;
      if (statusElement && data.status) {
        statusElement.textContent = data.status;
        statusElement.style.backgroundColor = this.getStatusColor(data.status);
      }

      // Update timestamp
      const timestampElement = tooltipElement.querySelector('[data-metric="timestamp"]');
      if (timestampElement && data.lastUpdate) {
        timestampElement.textContent = new Date(data.lastUpdate).toLocaleString();
      }
    } catch (error) {
      console.warn('Error updating tooltip content:', error);
    }
  }

  /**
   * Main tooltip augmentation method called by iTwin.js
   */
  public async augmentToolTip(hit: HitDetail, tooltip: Promise<string | HTMLElement>): Promise<string | HTMLElement> {
    try {
      const originalTooltip = await tooltip;
      const elementId = hit.sourceId;

      // Store current hover context for live updates
      this._currentHoveredElement = elementId;
      this._lastHitDetail = hit;
      this._updatePending = false;

      // If IoT is not active, return default tooltip
      if (!this._isIoTActive) {
        return this.createDefaultTooltip(originalTooltip, hit);
      }

      const telemetryData = this._telemetryData.get(elementId);

      // If no telemetry data, return default tooltip
      if (!telemetryData) {
        return this.createDefaultTooltip(originalTooltip, hit);
      }

      // Create custom tooltip with telemetry data
      return this.createTelemetryTooltip(originalTooltip, telemetryData);
    } catch (error) {
      console.warn("Error augmenting tooltip:", error);
      this._currentHoveredElement = null;
      this._lastHitDetail = null;
      this._updatePending = false;
      return tooltip;
    }
  }

  /**
   * Create default tooltip for elements without telemetry data or when IoT is disabled
   */
  private createDefaultTooltip(originalTooltip: string | HTMLElement, hit: HitDetail): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      padding: 12px 0px;
      line-height: 1.4;
      max-width: 300px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `margin-bottom: 8px;`;

    if (typeof originalTooltip === 'string') {
      content.textContent = originalTooltip || 'Element';
    } else {
      content.appendChild(originalTooltip);
    }
    container.appendChild(content);

    const info = document.createElement('div');
    info.style.cssText = `
      font-size: 11px;
      color: #666666;
      border-top: 1px solid #e0e0e0;
      padding-top: 8px;
    `;
    info.innerHTML = `<div>Element ID: ${hit.sourceId}</div>`;
    container.appendChild(info);

    return container;
  }

  /**
   * Create custom tooltip with telemetry data (when IoT is enabled)
   */
  private createTelemetryTooltip(originalTooltip: string | HTMLElement, data: TooltipTelemetryData): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 16px 0px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      max-width: 320px;
    `;

    // Header section
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    `;

    const titleSection = document.createElement('div');
    titleSection.style.cssText = `
      font-weight: bold;
      color: #E2E8F0;
      font-size: 14px;
    `;
    titleSection.textContent = data.displayLabel;

    const statusBadge = document.createElement('div');
    statusBadge.style.cssText = `
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: ${this.getStatusColor(data.status)};
      color: white;
    `;
    statusBadge.setAttribute('data-metric', 'status');
    statusBadge.textContent = data.status || 'N/A';

    header.appendChild(titleSection);
    header.appendChild(statusBadge);
    container.appendChild(header);

    // // Equipment information section
    // if (data.vendor || data.model) {
    //   const equipmentInfo = document.createElement('div');
    //   equipmentInfo.style.cssText = `
    //     margin-bottom: 12px;
    //     padding: 8px;
    //     background: #f5f5f5;
    //     border-radius: 4px;
    //     font-size: 12px;
    //   `;

    //   const equipmentItems = [];
    //   if (data.vendor) equipmentItems.push(`<div><strong>Vendor:</strong> ${data.vendor}</div>`);
    //   if (data.model) equipmentItems.push(`<div><strong>Model:</strong> ${data.model}</div>`);
    //   if (data.platform) equipmentItems.push(`<div><strong>Platform:</strong> ${data.platform}</div>`);
    //   if (data.sector) equipmentItems.push(`<div><strong>Sector:</strong> ${data.sector}</div>`);

    //   equipmentInfo.innerHTML = equipmentItems.join('');
    //   container.appendChild(equipmentInfo);
    // }

    // Telemetry data section
    const telemetrySection = document.createElement('div');
    // telemetrySection.style.cssText = `
    //   margin-bottom: 12px;
    // `;

    const telemetryTitle = document.createElement('div');
    telemetryTitle.style.cssText = `
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 13px;
    `;
    telemetryTitle.textContent = 'Live Telemetry Feed';
    telemetrySection.appendChild(telemetryTitle);

    const metricsGrid = document.createElement('div');
    metricsGrid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 12px;
    `;

    // Add telemetry metrics with data-metric attributes for live updates
    const metrics = [
      { label: 'Temp', value: data.temperature !== undefined ? `${data.temperature.toFixed(1)} °C` : 'N/A', metric: 'temperature' },
      { label: 'Power', value: data.powerConsumption !== undefined ? `${data.powerConsumption.toFixed(1)} W` : 'N/A', metric: 'power' },
      { label: 'Signal', value: data.signalStrength !== undefined ? `${data.signalStrength.toFixed(1)} dBm` : 'N/A', metric: 'signal' },
      { label: 'Health', value: data.healthScore !== undefined ? `${data.healthScore.toFixed(0)} %` : 'N/A', metric: 'health' }
    ];

    metrics.forEach(metric => {
      const metricDiv = document.createElement('div');
      metricDiv.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        margin-bottom: 8px;

        `;

      const labelSpan = document.createElement('span');
      labelSpan.style.fontWeight = '500';
      labelSpan.textContent = metric.label + ':';

      const valueSpan = document.createElement('span');
      valueSpan.setAttribute('data-metric', metric.metric);
      valueSpan.style.cssText = `
        font-weight: 600;
        `;
        // color: #1976d2;
      valueSpan.textContent = metric.value;

      metricDiv.appendChild(labelSpan);
      metricDiv.appendChild(valueSpan);
      metricsGrid.appendChild(metricDiv);
    });

    telemetrySection.appendChild(metricsGrid);
    container.appendChild(telemetrySection);

    // Last update timestamp
    const updateInfo = document.createElement('div');
    updateInfo.style.cssText = `
      font-size: 11px;
      color: #666666;
      text-align: center;
      border-top: 1px solid #e0e0e0;
      padding-top: 8px;
    `;

    const timestampSpan = document.createElement('span');
    timestampSpan.setAttribute('data-metric', 'timestamp');
    timestampSpan.textContent = data.lastUpdate ? new Date(data.lastUpdate).toLocaleString() : 'Never';

    updateInfo.innerHTML = 'Last Update: ';
    updateInfo.appendChild(timestampSpan);
    container.appendChild(updateInfo);

    return container;
  }

  /**
   * Get appropriate color for status indicator
   */
  private getStatusColor(status?: string): string {
    if (!status) return '#757575';
    switch (status.toUpperCase()) {
      case 'OPERATIONAL': return '#2e7d32';
      case 'DEGRADED': return '#ed6c02';
      case 'ALARM': return '#d32f2f';
      case 'OVERHEATING': return '#c62828';
      case 'HIGH_POWER': return '#d84315';
      default: return '#757575';
    }
  }
}