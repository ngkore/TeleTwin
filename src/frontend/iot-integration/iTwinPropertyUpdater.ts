/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


/*---------------------------------------------------------------------------------------------
 * iTwin Property Updater
 *
 * This service manages property updates for iTwin model elements with telemetry data.
 * Since iTwin elements are typically read-only in viewer applications, this implementation
 * stores property updates locally for widget display and maintains a synchronized state.
 *
 * Key Features:
 * - Local storage of property updates for UI display
 * - Batch processing of multiple element updates
 * - Update statistics and tracking
 * - Cleanup and maintenance functions
 *
 * Production Note:
 * For full write capabilities, integration with iTwin's ElementEditor API would be required
 * with appropriate briefcase permissions and iModel Hub synchronization.
 *--------------------------------------------------------------------------------------------*/

import { IModelConnection } from "@itwin/core-frontend";
import { iTwinPropertyUpdate } from "./types";

export class iTwinPropertyUpdater {
  private iModelConnection: IModelConnection;
  private updateListeners: ((updates: iTwinPropertyUpdate[]) => void)[] = [];

  constructor(iModelConnection: IModelConnection) {
    this.iModelConnection = iModelConnection;
  }

  /**
   * Apply property updates to iTwin model elements
   * Stores updates locally and notifies listeners for UI synchronization
   *
   * @param updates - Array of property updates to apply
   */
  async updateElementProperties(updates: iTwinPropertyUpdate[]): Promise<void> {
    if (!updates || updates.length === 0) {
      return;
    }

    try {
      // Group updates by element ID for batch processing
      const updatesByElement = new Map<string, iTwinPropertyUpdate>();

      updates.forEach(update => {
        updatesByElement.set(update.elementId, update);
      });

      // Apply updates to each element
      for (const [elementId, update] of updatesByElement) {
        await this.updateSingleElement(elementId, update);
      }

      // Notify listeners about the updates
      this.notifyListeners(updates);

    } catch (error) {
      throw error;
    }
  }

  /**
   * Update properties for a single element
   * Stores the update locally for widget access
   *
   * @param elementId - Element identifier
   * @param update - Property update to apply
   */
  private async updateSingleElement(elementId: string, update: iTwinPropertyUpdate): Promise<void> {
    try {
      this.storePropertyUpdateLocally(elementId, update);
    } catch (error) {
      // Silent fail for individual updates
    }
  }

  /**
   * Store property update locally for widget display
   * Uses localStorage to persist updates across sessions
   *
   * @param elementId - Element identifier
   * @param update - Property update to store
   */
  private storePropertyUpdateLocally(elementId: string, update: iTwinPropertyUpdate): void {
    const key = `itwin_telemetry_${elementId}`;
    const updateData = {
      ...update,
      localUpdateTime: new Date().toISOString()
    };

    try {
      localStorage.setItem(key, JSON.stringify(updateData));
    } catch (error) {
      // Storage quota exceeded or unavailable
    }
  }

  /**
   * Get locally stored property updates for an element
   *
   * @param elementId - Element identifier
   * @returns Property update if found, null otherwise
   */
  getLocalPropertyUpdate(elementId: string): iTwinPropertyUpdate | null {
    try {
      const key = `itwin_telemetry_${elementId}`;
      const stored = localStorage.getItem(key);

      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      // Parse error or storage unavailable
    }

    return null;
  }

  /**
   * Clear all locally stored updates
   * Useful for cleanup or reset operations
   */
  clearLocalUpdates(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('itwin_telemetry_'));
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      // Storage unavailable
    }
  }

  /**
   * Get statistics about property updates
   * Provides overview of stored updates and recent activity
   *
   * @returns Statistics object with counts and timing info
   */
  getUpdateStatistics(): any {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('itwin_telemetry_'));
      const updates = keys.map(key => {
        try {
          return JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          return null;
        }
      }).filter(Boolean);

      const now = new Date();
      const recentUpdates = updates.filter(update => {
        const updateTime = new Date(update.localUpdateTime || 0);
        return (now.getTime() - updateTime.getTime()) < 300000; // Last 5 minutes
      });

      return {
        totalElements: updates.length,
        recentUpdates: recentUpdates.length,
        lastUpdate: updates.length > 0 ?
          Math.max(...updates.map(u => new Date(u.localUpdateTime || 0).getTime())) : null,
        elementIds: updates.map(u => u.elementId)
      };
    } catch (error) {
      return {
        totalElements: 0,
        recentUpdates: 0,
        lastUpdate: null,
        elementIds: []
      };
    }
  }

  /**
   * Add listener for property update events
   *
   * @param listener - Callback function to invoke on updates
   */
  addUpdateListener(listener: (updates: iTwinPropertyUpdate[]) => void): void {
    this.updateListeners.push(listener);
  }

  /**
   * Remove update listener
   *
   * @param listener - Listener to remove
   */
  removeUpdateListener(listener: (updates: iTwinPropertyUpdate[]) => void): void {
    const index = this.updateListeners.indexOf(listener);
    if (index > -1) {
      this.updateListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners about property updates
   *
   * @param updates - Array of updates to broadcast
   */
  private notifyListeners(updates: iTwinPropertyUpdate[]): void {
    this.updateListeners.forEach(listener => {
      try {
        listener(updates);
      } catch (error) {
        // Listener error should not affect other listeners
      }
    });
  }
}