/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import {
  Viewer,
  ViewerContentToolsProvider,
  ViewerNavigationToolsProvider,
  ViewerStatusbarItemsProvider,
} from "@itwin/desktop-viewer-react";
import { StagePanelLocation, StagePanelSection, UiItemsProvider, Widget, WidgetState } from "@itwin/appui-react";
import { MeasureToolsUiItemsProvider } from "@itwin/measure-tools-react";
import {
  CategoriesTreeComponent,
  createTreeWidget,
  ModelsTreeComponent,
} from "@itwin/tree-widget-react";
import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import type { IModelConnection } from "@itwin/core-frontend";
import { ThemeProvider } from "@itwin/itwinui-react";

import { viewerRpcs } from "../../../common/ViewerConfig";
import { unifiedSelectionStorage } from "../../../selectionStorage";
import { IModelMergeItemsProvider } from "../../extensions";
import { GisProviderWidgetProvider } from "../GisProviderWidget";
import { MapLayersWidgetProvider } from "../MapLayersWidget";
import { MetadataWidgetProvider } from "../MetadataWidget";
import { PropertiesWidgetProvider } from "../PropertiesWidget";
import { MetadataManager } from "../../../common/MetadataManager";
import { TowerManager } from "../../../common/TowerManager";
import { ViewportHeader } from "../ViewportHeader";
import { InfoPanel } from "../InfoPanel";
import { TeleTwinViewerApp } from "../../app/TeleTwinViewerApp";
import { cleanupService } from "../../services/CleanupService";
import { IoTWidgetProvider, IoTDataWidgetProvider, CustomTooltipProvider, TelemetryGraphWidgetProvider } from "../../iot-integration";
import { StructuralAnalysisWidgetProvider, StructuralResultsWidgetProvider } from "../../structural-analysis";
import { TowerSimulationController } from "../../simulation";

export interface ViewerRouteState {
  filePath?: string;
  towerData?: {
    id: string;
    name: string;
    csvPath: string;
    metadataPath: string;
    bimPath: string;
  };
}

export const ViewerRoute = () => {
  const location = useLocation();
  const [filePath, setFilePath] = useState<string>();
  const [towerData, setTowerData] = useState<ViewerRouteState['towerData']>();
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isModelConnected, setIsModelConnected] = useState(false);
  const [infoPanelData, setInfoPanelData] = useState<{
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>({ title: '', message: '', type: 'info' });

  // Set dark theme on document root for all iTwinUI widgets
  useEffect(() => {
    document.documentElement.setAttribute('data-iui-theme', 'dark');
    document.documentElement.classList.add('iui-root');

    return () => {
      // Cleanup on unmount
      document.documentElement.removeAttribute('data-iui-theme');
      document.documentElement.classList.remove('iui-root');
    };
  }, []);

  const onIModelConnected = useCallback(async (iModel: IModelConnection) => {
    (window as any).iModelApp = { iModel };
    setIsModelConnected(true);

    // Register custom tooltip provider
    const tooltipProvider = CustomTooltipProvider.getInstance();
    tooltipProvider.register();

    // Initialize tower simulation controller
    try {
      const simulationController = TowerSimulationController.getInstance();
      await simulationController.initialize(iModel);
      console.log('[ViewerRoute] Tower simulation controller initialized');
    } catch (error) {
      console.error('[ViewerRoute] Failed to initialize simulation controller:', error);
    }

    if (towerData) {
      await autoLoadTowerFiles(iModel);
    }

    const metadataManager = MetadataManager.getInstance();
    if (metadataManager.getCSVData().length > 0) {
      try {
        await metadataManager.matchElementsWithMetadata(iModel);
      } catch (error) {
        console.error("Failed to auto-match metadata:", error);
      }
    }
  }, [towerData]);

  const autoLoadTowerFiles = useCallback(async (iModel: IModelConnection) => {
    if (!towerData) return;

    try {
      await cleanupService.cleanupBeforeNewTower();

      if (towerData.metadataPath) {
        const metadataContent = await TeleTwinViewerApp.ipcCall.readFile(towerData.metadataPath);
        const metadataManager = MetadataManager.getInstance();
        await metadataManager.loadCSVData(metadataContent);
        await metadataManager.matchElementsWithMetadata(iModel);
      }

      if (towerData.csvPath) {
        const towerContent = await TeleTwinViewerApp.ipcCall.readFile(towerData.csvPath);
        const towerManager = TowerManager.getInstance();
        await towerManager.loadTowerCSVData(towerContent);
      }

      setInfoPanelData({
        title: `Tower Data Loaded: ${towerData.name}`,
        message: `Successfully loaded tower details and metadata for ${towerData.name}. All previous data has been cleared.`,
        type: 'success'
      });
      setShowInfoPanel(true);
    } catch (error) {
      console.error("Failed to auto-load tower files:", error);
      setInfoPanelData({
        title: 'Auto-Load Error',
        message: `Failed to load some tower files for ${towerData.name}. You may need to upload them manually.`,
        type: 'warning'
      });
      setShowInfoPanel(true);
    }
  }, [towerData]);

  const handleMetadataCSVUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const csvData = e.target?.result as string;
            const metadataManager = MetadataManager.getInstance();
            await metadataManager.loadCSVData(csvData);

            const iModel = (window as any).iModelApp?.iModel;
            if (iModel) {
              try {
                await metadataManager.matchElementsWithMetadata(iModel);
                setInfoPanelData({
                  title: 'CSV Upload Success',
                  message: `Successfully loaded ${file.name} and matched with model elements. Metadata is now available for selection.`,
                  type: 'success'
                });
              } catch (matchError) {
                setInfoPanelData({
                  title: 'CSV Upload Partial Success',
                  message: `Successfully loaded ${file.name}, but some metadata matching failed. Manual selection may be needed.`,
                  type: 'warning'
                });
              }
            } else {
              setInfoPanelData({
                title: 'CSV Upload Success',
                message: `Successfully loaded ${file.name}. CSV data is now available for metadata matching.`,
                type: 'success'
              });
            }
            setShowInfoPanel(true);
          } catch (error) {
            setInfoPanelData({
              title: 'CSV Upload Error',
              message: 'Failed to load CSV file. Please check the file format and try again.',
              type: 'error'
            });
            setShowInfoPanel(true);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const handleTowerCSVUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const csvData = e.target?.result as string;
            const towerManager = TowerManager.getInstance();
            await towerManager.loadTowerCSVData(csvData);

            setInfoPanelData({
              title: 'Tower CSV Upload Success',
              message: `Successfully loaded ${file.name} with tower details. Tower information is now available.`,
              type: 'success'
            });
            setShowInfoPanel(true);
          } catch (error) {
            setInfoPanelData({
              title: 'Tower CSV Upload Error',
              message: 'Failed to load tower CSV file. Please check the file format and required columns.',
              type: 'error'
            });
            setShowInfoPanel(true);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  useEffect(() => {
    const routeState = location?.state as ViewerRouteState | undefined;
    if (routeState?.filePath) {
      setFilePath(routeState.filePath);
    }
    if (routeState?.towerData) {
      setTowerData(routeState.towerData);
    }
  }, [location?.state]);

  useEffect(() => {
    return () => {
      // Cleanup simulation controller
      try {
        const simulationController = TowerSimulationController.getInstance();
        simulationController.cleanup();
        console.log('[ViewerRoute] Simulation controller cleaned up');
      } catch (error) {
        console.error('[ViewerRoute] Simulation cleanup failed:', error);
      }

      cleanupService.cleanupBeforeNavigation().catch(error => {
        console.error('Cleanup failed during unmount:', error);
      });
    };
  }, []);

  // Memoize UI providers to prevent widget re-registration on re-renders
  const uiProviders = useMemo(() => [
    new ViewerNavigationToolsProvider(),
    new ViewerContentToolsProvider({
      vertical: {
        measureGroup: true,
      },
    }),
    new ViewerStatusbarItemsProvider(),
    new TreeWidgetUIProvider(),
    // new GisProviderWidgetProvider(), // Priority 1 - Top of right panel
    new StructuralAnalysisWidgetProvider(), // Priority 150 - Structural analysis input
    new StructuralResultsWidgetProvider(), // Priority 160 - Structural analysis results
    // new IoTWidgetProvider(), // Priority 200
    // new IoTDataWidgetProvider(), // Priority 210
    // new PropertiesWidgetProvider(), // Priority 300
    // new TelemetryGraphWidgetProvider(), // Priority 100 - Bottom panel
  ], []);

  return filePath ? (
    <ThemeProvider theme="dark">
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0D1117', color: '#EAEAEA' }}>
        {!isModelConnected && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 9999,
            color: 'white',
            fontSize: '18px'
          }}>
            Loading 3D Model...
          </div>
        )}

        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          visibility: isModelConnected ? 'visible' : 'hidden',
          position: isModelConnected ? 'relative' : 'absolute'
        }}>
          <ViewportHeader
            modelName={towerData?.name || filePath.split('\\').pop()?.split('/').pop() || 'Unknown Model'}
            onSaveScreenshot={() => {
              console.log('Screenshot functionality to be implemented');
            }}
            onToggleFullscreen={() => {
              console.log('Fullscreen functionality to be implemented');
            }}
            onShowSettings={() => {
              console.log('Settings functionality to be implemented');
            }}
            onUploadCSV={handleMetadataCSVUpload}
            onUploadTowerCSV={handleTowerCSVUpload}
            hasAutoLoadedFiles={!!towerData}
          />
          <div style={{ flex: 1, position: 'relative' }}>
            <Viewer
              rpcInterfaces={viewerRpcs}
              filePath={filePath}
              mapLayerOptions={{}}
              onIModelConnected={onIModelConnected}
              tileAdmin={{
                cesiumIonKey: process.env.REACT_APP_CESIUM_ION_KEY ?? process.env.IMJS_CESIUM_ION_KEY ?? "",
              }}
              uiProviders={uiProviders}
              enablePerformanceMonitors={true}
              selectionStorage={unifiedSelectionStorage}
            />
          </div>
        </div>

      </div>
      {showInfoPanel && createPortal(
        <InfoPanel
          title={infoPanelData.title}
          message={infoPanelData.message}
          type={infoPanelData.type}
          onClose={() => setShowInfoPanel(false)}
        />,
        document.body
      )}
    </ThemeProvider>
  ) : (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1e1e1e',
      color: 'white',
      fontSize: '18px'
    }}>
      Preparing viewer...
    </div>
  );
};

class TreeWidgetUIProvider implements UiItemsProvider {
  public readonly id: string = "TreeWidgetUIProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Left) {
      widgets.push({
        id: "HierarchyWidget",
        label: "Hierarchy",
        defaultState: WidgetState.Open,
        canPopout: false,
        priority: 100,
        content: (
          <div style={{ padding: '8px', height: '100%', overflow: 'auto' }}>
            <ModelsTreeComponent
              getSchemaContext={(iModel) => iModel.schemaContext}
              selectionStorage={unifiedSelectionStorage}
              selectionMode={"extended"}
              
            />
          </div>
        )
      });
    }
    return widgets;
  }
}