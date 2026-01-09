/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/



import type { DesktopInitializerParams } from "@itwin/desktop-viewer-react";
import { useConnectivity } from "@itwin/desktop-viewer-react";
import { useDesktopViewerInitializer } from "@itwin/desktop-viewer-react";
import { Logo } from "./icons";
import { PageLayout } from "@itwin/itwinui-layouts-react";
import { Flex, ThemeProvider } from "@itwin/itwinui-react";
import {
  MeasurementActionToolbar,
  MeasureTools,
} from "@itwin/measure-tools-react";
import { PropertyGridManager } from "@itwin/property-grid-react";
import { TreeWidget } from "@itwin/tree-widget-react";
import React, { useCallback, useEffect, useMemo } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import { viewerRpcs } from "../../common/ViewerConfig";
import { unifiedSelectionStorage } from "../../selectionStorage";
import { TeleTwinViewerApp } from "../app/TeleTwinViewerApp";
import { SettingsContextProvider } from "../services/SettingsContext";
import { cleanupService } from "../services/CleanupService";
import { HomeRoute, IModelsRoute, ITwinsRoute, ViewerRoute } from "./routes";

const App = () => {
  window.ITWIN_VIEWER_HOME = window.location.origin;

  const onIModelAppInit = useCallback(async () => {
    await TreeWidget.initialize();
    await PropertyGridManager.initialize();
    await MeasureTools.startup();
    MeasurementActionToolbar.setDefaultActionProvider();
  }, []);

  const desktopInitializerProps = useMemo<DesktopInitializerParams>(
    () => ({
      clientId: "",
      // clientId: process.env.IMJS_VIEWER_CLIENT_ID ?? "",
      rpcInterfaces: viewerRpcs,
      additionalI18nNamespaces: ["TeleTwinDesktopViewer"],
      enablePerformanceMonitors: true,
      selectionStorage: unifiedSelectionStorage,
      onIModelAppInit
    }),
    [onIModelAppInit]
  );

  const initialized = useDesktopViewerInitializer(desktopInitializerProps);
  const connectivityStatus = useConnectivity();

  useEffect(() => {
    if (initialized) {
      // setup connectivity events to let the backend know the status
      void TeleTwinViewerApp.ipcCall.setConnectivity(connectivityStatus);
    }
  }, [initialized, connectivityStatus]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      cleanupService.cleanupBeforeAppClose();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return (
    <ThemeProvider theme="light" style={{ height: "100%" }}>
      {initialized ? (
        <BrowserRouter>
          <SettingsContextProvider>
            <PageLayout>
              <Routes>
                <Route
                  element={
                    <PageLayout.Content>
                      <Outlet />
                    </PageLayout.Content>
                  }
                >
                  <Route path="/" element={<HomeRoute />} />
                  <Route path="/itwins/:TeleTwinId" element={<IModelsRoute />} />
                  <Route path="/itwins" element={<ITwinsRoute />} />
                </Route>
                <Route
                  element={
                    <PageLayout.Content>
                      <Outlet />
                    </PageLayout.Content>
                  }
                >
                  <Route path="/viewer" element={<ViewerRoute />} />
                </Route>
              </Routes>
            </PageLayout>
          </SettingsContextProvider>
        </BrowserRouter>
      ) : (
        <Flex justifyContent="center" alignItems="center" style={{ height: "100%", flexDirection: "column" }}>
          <Logo
            data-testid="loader-wrapper"
            style={{
              height: "120px",
              width: "120px",
              animation: "pulse 2s infinite"
            }}
          />
          <div style={{ 
            marginTop: "20px", 
            color: "#0970B7", 
            fontSize: "18px", 
            fontWeight: "600" 
          }}>
            Loading TeleTwin...
          </div>
        </Flex>
      )}
    </ThemeProvider>
  );
};

export default App;
