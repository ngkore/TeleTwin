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



import { IModelHostConfiguration, IpcHost } from "@itwin/core-backend";
import { Logger, LogLevel } from "@itwin/core-bentley";
import type { ElectronHostOptions } from "@itwin/core-electron/lib/cjs/ElectronBackend";
import { ElectronHost } from "@itwin/core-electron/lib/cjs/ElectronBackend";
import { ECSchemaRpcImpl } from "@itwin/ecschema-rpcinterface-impl";
import { BackendIModelsAccess } from "@itwin/imodels-access-backend";
import { Presentation } from "@itwin/presentation-backend";
import * as dotenvFlow from "dotenv-flow";
import { Menu, shell, nativeImage } from "electron";
import type { MenuItemConstructorOptions } from "electron/main";
import * as path from "path";

import { AppLoggerCategory } from "../common/LoggerCategory";
import { channelName, viewerRpcs } from "../common/ViewerConfig";
import { appInfo } from "./AppInfo";
import ViewerHandler from "./ViewerHandler";

dotenvFlow.config();

/** This is the function that gets called when we start TeleTwinViewer via `electron ViewerMain.js` from the command line.
 * It runs in the Electron main process and hosts the iModeljs backend (IModelHost) code. It starts the render (frontend) process
 * that starts from the file "index.ts". That launches the viewer frontend (IModelApp).
 */
const viewerMain = async () => {
  // Setup logging immediately to pick up any logging during IModelHost.startup()
  Logger.initializeToConsole();
  Logger.setLevelDefault(LogLevel.Trace);
  Logger.setLevel(AppLoggerCategory.Backend, LogLevel.Info);

  // Create icon from SVG
  const iconPath = path.join(__dirname, "..", "..", "public", "favicon.svg");
  const icon = nativeImage.createFromPath(iconPath);

  const electronHost: ElectronHostOptions = {
    webResourcesPath: path.join(__dirname, "..", "..", "build"),
    rpcInterfaces: viewerRpcs,
    developmentServer: process.env.NODE_ENV === "development",
    ipcHandlers: [ViewerHandler],
    iconName: icon.isEmpty() ? "favicon.ico" : undefined,
  };

  await ElectronHost.startup({ electronHost });

  Presentation.initialize();

  await ElectronHost.openMainWindow({
    width: 1920,
    height: 1080,
    show: true,
    title: appInfo.title,
    autoHideMenuBar: false,
  });

  ECSchemaRpcImpl.register();

  // uncomment this line to open the app in debug format
  if (process.env.NODE_ENV === "development") {
    // ElectronHost.mainWindow?.webContents.toggleDevTools();
  }
  
};


try {
  void viewerMain();
} catch (error) {
  Logger.logError(AppLoggerCategory.Backend, error as string);
  process.exitCode = 1;
}
