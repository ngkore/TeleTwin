/*---------------------------------------------------------------------------------------------
 * Cleanup Service
 * Manages proper cleanup of all managers and data when switching between models or closing app
 * Ensures production-ready memory management and prevents data contamination
 *--------------------------------------------------------------------------------------------*/

import { MetadataManager } from "../../common/MetadataManager";
import { TowerManager } from "../../common/TowerManager";

export class CleanupService {
  private static _instance?: CleanupService;
  private _isCleanupInProgress = false;

  public static getInstance(): CleanupService {
    if (!this._instance) {
      this._instance = new CleanupService();
    }
    return this._instance;
  }

  /**
   * Perform complete cleanup before loading new model data
   * This prevents data contamination between different models
   */
  public async performCleanup(reason: string = 'general'): Promise<void> {
    if (this._isCleanupInProgress) {
      console.log('⏳ Cleanup already in progress, skipping...');
      return;
    }

    this._isCleanupInProgress = true;
    console.log(`🧹 Starting cleanup process: ${reason}`);

    try {
      // Clear all manager data
      await this.clearAllManagers();

      // Clear any window globals
      this.clearWindowGlobals();

      // Force garbage collection if available (development only)
      this.requestGarbageCollection();

      console.log(`✅ Cleanup completed successfully: ${reason}`);
    } catch (error) {
      console.error(`❌ Cleanup failed: ${reason}`, error);
    } finally {
      this._isCleanupInProgress = false;
    }
  }

  /**
   * Clear all data from managers
   */
  private async clearAllManagers(): Promise<void> {
    // Clear MetadataManager
    const metadataManager = MetadataManager.getInstance();
    metadataManager.clearMetadata();
    
    // Clear TowerManager  
    const towerManager = TowerManager.getInstance();
    towerManager.clearTowerData();
    
    console.log('🧹 All managers cleared');
  }

  /**
   * Perform complete reset including singleton instances
   * Use this for complete application reset
   */
  public async performCompleteReset(reason: string = 'complete reset'): Promise<void> {
    console.log(`🔄 Starting complete reset: ${reason}`);

    try {
      // Reset singleton instances
      MetadataManager.resetInstance();
      TowerManager.resetInstance();

      // Clear window globals
      this.clearWindowGlobals();

      // Force garbage collection
      this.requestGarbageCollection();

      console.log(`✅ Complete reset finished: ${reason}`);
    } catch (error) {
      console.error(`❌ Complete reset failed: ${reason}`, error);
    }
  }

  /**
   * Clear window globals that might store model data
   */
  private clearWindowGlobals(): void {
    // Clear iModel reference
    if ((window as any).iModelApp) {
      (window as any).iModelApp = undefined;
      console.log('🧹 Cleared window.iModelApp');
    }

    // Clear any other globals that might exist
    const globalsToClear = ['towerData', 'metadataCache', 'modelCache'];
    globalsToClear.forEach(globalName => {
      if ((window as any)[globalName]) {
        (window as any)[globalName] = undefined;
        console.log(`🧹 Cleared window.${globalName}`);
      }
    });
  }

  /**
   * Request garbage collection if available (development/debugging)
   */
  private requestGarbageCollection(): void {
    // Only available in development or with --enable-precise-memory-info flag
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
      console.log('🗑️ Garbage collection requested');
    }
    
    // Alternative method for memory pressure
    if ('memory' in performance && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      console.log('💾 Memory usage:', {
        used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024) + 'MB',
        total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024) + 'MB',
        limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024) + 'MB'
      });
    }
  }

  /**
   * Cleanup before navigating away from viewer
   */
  public async cleanupBeforeNavigation(): Promise<void> {
    await this.performCleanup('navigation');
  }

  /**
   * Cleanup before loading new tower data
   */
  public async cleanupBeforeNewTower(): Promise<void> {
    await this.performCleanup('new tower');
  }

  /**
   * Cleanup before app close/refresh
   */
  public async cleanupBeforeAppClose(): Promise<void> {
    await this.performCompleteReset('app close');
  }

  /**
   * Emergency cleanup - use when normal cleanup fails
   */
  public emergencyCleanup(): void {
    try {
      console.log('🚨 Emergency cleanup initiated');
      
      // Force clear all data without async operations
      MetadataManager.resetInstance();
      TowerManager.resetInstance();
      
      // Clear all window globals
      Object.keys(window).forEach(key => {
        if (key.includes('model') || key.includes('tower') || key.includes('metadata')) {
          try {
            delete (window as any)[key];
          } catch (e) {
            (window as any)[key] = undefined;
          }
        }
      });
      
      console.log('🚨 Emergency cleanup completed');
    } catch (error) {
      console.error('🚨 Emergency cleanup failed:', error);
    }
  }

  /**
   * Reset the singleton instance - for production use
   */
  public static resetInstance(): void {
    if (this._instance) {
      this._instance = undefined;
      console.log('🗑️ CleanupService: Singleton instance reset');
    }
  }

  /**
   * Get current memory usage statistics
   */
  public getMemoryStats(): any {
    const stats: any = {
      timestamp: new Date().toISOString()
    };

    // Manager statistics
    try {
      const metadataManager = MetadataManager.getInstance();
      const towerManager = TowerManager.getInstance();
      
      stats.metadata = metadataManager.getStatistics();
      stats.towers = towerManager.getStatistics();
    } catch (error) {
      stats.managersError = typeof error === 'object' && error !== null && 'message' in error
        ? (error as { message: string }).message
        : String(error);
    }
    // } catch (error) {
    //   stats.managersError = error.message;
    // }

    // Browser memory (if available)
    if ('memory' in performance && (performance as any).memory) {
      const memInfo = (performance as any).memory;
      stats.browserMemory = {
        used: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memInfo.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024)
      };
    }

    return stats;
  }
}

// Export singleton instance for convenience
export const cleanupService = CleanupService.getInstance();