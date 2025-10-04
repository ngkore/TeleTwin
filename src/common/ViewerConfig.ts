/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import type { InternetConnectivityStatus } from "@itwin/core-common";
import {
  IModelReadRpcInterface,
  IModelTileRpcInterface,
  iTwinChannel,
  SnapshotIModelRpcInterface,
} from "@itwin/core-common";
import { PresentationRpcInterface } from "@itwin/presentation-common";
import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from "electron";
import { ECSchemaRpcInterface } from "@itwin/ecschema-rpcinterface-common";

export const channelName = iTwinChannel("desktop-viewer");

export interface ViewerIpc {
  getConfig: () => Promise<ViewerConfig>;
  openFile: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
  openFolder: (options?: { title?: string }) => Promise<{ canceled: boolean; filePaths: string[] }>;
  scanFolder: (folderPath: string) => Promise<string[]>;
  readFile: (filePath: string) => Promise<string>;
  getFileInfo: (filePath: string) => Promise<{
    size: number;
    sizeFormatted: string;
    lastModified: Date;
    exists: boolean;
  }>;
  getSettings: () => Promise<ViewerSettings>;
  addRecentFile: (file: ViewerFile) => Promise<void>;
  removeRecentFile: (file: ViewerFile) => Promise<void>;
  checkFileExists: (file: ViewerFile) => Promise<boolean>;
  saveFile: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
  setConnectivity: (
    connectivityStatus: InternetConnectivityStatus
  ) => Promise<void>;
}

export interface ViewerConfig {
  snapshotName?: string;
}

/** RPC interfaces required by the viewer */
export const viewerRpcs = [
  IModelReadRpcInterface,
  IModelTileRpcInterface,
  PresentationRpcInterface,
  SnapshotIModelRpcInterface,
  ECSchemaRpcInterface,
];

export interface ViewerFile {
  displayName: string;
  path: string;
  TeleTwinId?: string;
  iModelId?: string;
}

export interface ViewerSettings {
  defaultRecent?: boolean;
  recents?: ViewerFile[];
}
