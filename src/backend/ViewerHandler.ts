/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { IModelHost, IpcHandler } from "@itwin/core-backend";
import { InternetConnectivityStatus } from "@itwin/core-common";
import type {
  OpenDialogOptions,
  OpenDialogReturnValue,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from "electron";
import { dialog, Menu } from "electron";
import * as minimist from "minimist";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

import type {
  ViewerConfig,
  ViewerFile,
  ViewerIpc,
  ViewerSettings,
} from "../common/ViewerConfig";
import { channelName } from "../common/ViewerConfig";
import { getAppEnvVar } from "./AppInfo";
import UserSettings from "./UserSettings";

class ViewerHandler extends IpcHandler implements ViewerIpc {

  public get channelName() {
    return channelName;
  }
  /**
   * create the config object to send to the frontend
   * @returns Promise<ViewerConfig>
   */
  public async getConfig(): Promise<ViewerConfig> {
    const parsedArgs = minimist(process.argv.slice(2)); // first two arguments are .exe name and the path to ViewerMain.js. Skip them.
    return {
      snapshotName: parsedArgs._[0] ?? getAppEnvVar("SNAPSHOT"),
    };
  }
  /**
   * Open file dialog
   * @param options
   * @returns
   */
  public async openFile(
    options: OpenDialogOptions
  ): Promise<OpenDialogReturnValue> {
    return dialog.showOpenDialog(options);
  }

  /**
   * Open folder dialog
   * @param options
   * @returns
   */
  public async openFolder(
    options?: { title?: string }
  ): Promise<{ canceled: boolean; filePaths: string[] }> {
    const dialogOptions: OpenDialogOptions = {
      properties: ["openDirectory"],
      title: options?.title || "Select Folder"
    };
    
    const result = await dialog.showOpenDialog(dialogOptions);
    return {
      canceled: result.canceled,
      filePaths: result.filePaths
    };
  }

  /**
   * Scan folder for files
   * @param folderPath
   * @returns array of file paths
   */
  public async scanFolder(folderPath: string): Promise<string[]> {
    try {
      if (!existsSync(folderPath)) {
        throw new Error(`Folder does not exist: ${folderPath}`);
      }

      const files = readdirSync(folderPath, { withFileTypes: true });
      const filePaths: string[] = [];

      for (const file of files) {
        if (file.isFile()) {
          const fileName = file.name.toLowerCase();
          const ext = path.extname(fileName);
          
          // Only include .bim and .csv files
          if (ext === '.bim' || ext === '.csv') {
            filePaths.push(path.join(folderPath, file.name));
          }
        }
      }

      return filePaths;
    } catch (error) {
      console.error('Error scanning folder:', error);
      throw error;
    }
  }

  /**
   * Read file content
   * @param filePath
   * @returns file content as string
   */
  public async readFile(filePath: string): Promise<string> {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  }

  /**
   * Get file information
   * @param filePath
   * @returns file info including size, modified date
   */
  public async getFileInfo(filePath: string): Promise<{
    size: number;
    sizeFormatted: string;
    lastModified: Date;
    exists: boolean;
  }> {
    try {
      if (!existsSync(filePath)) {
        return {
          size: 0,
          sizeFormatted: '0 B',
          lastModified: new Date(),
          exists: false
        };
      }

      const stats = statSync(filePath);
      const size = stats.size;
      
      // Format file size
      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      return {
        size: size,
        sizeFormatted: formatBytes(size),
        lastModified: stats.mtime,
        exists: true
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return {
        size: 0,
        sizeFormatted: '0 B',
        lastModified: new Date(),
        exists: false
      };
    }
  }

  /**
   * Save file dialog
   * @param options
   * @returns
   */
  public async saveFile(
    options: SaveDialogOptions
  ): Promise<SaveDialogReturnValue> {
    return dialog.showSaveDialog(options);
  }

  /**
   * Get user settings
   * @returns ViewerSettings
   */
  public async getSettings(): Promise<ViewerSettings> {
    return UserSettings.settings;
  }

  /**
   * Add a recent file
   * @param file
   */
  public async addRecentFile(file: ViewerFile): Promise<void> {
    UserSettings.addRecent(file);
  }

  /**
   * Remove file from recent settings
   * @param file
   */
  public async removeRecentFile(file: ViewerFile): Promise<void> {
    UserSettings.removeRecent(file);
  }

  /**
   * Check if file exists in the given path, returns false if path is blank
   * @param file
   */
  public async checkFileExists(file: ViewerFile): Promise<boolean> {
    return file.path ? existsSync(file.path) : false;
  }

  /**
   * Changes due to connectivity status
   * @param connectivityStatus
   */
  public async setConnectivity(
    connectivityStatus: InternetConnectivityStatus
  ): Promise<void> {
    const downloadMenuItem =
      Menu.getApplicationMenu()?.getMenuItemById("download-menu-item");
    if (connectivityStatus === InternetConnectivityStatus.Offline) {
      // offline, disable the download menu item
      if (downloadMenuItem) {
        downloadMenuItem.enabled = false;
      }
    } else if (connectivityStatus === InternetConnectivityStatus.Online) {
      if (downloadMenuItem) {
        // online so enable the download menu item
        downloadMenuItem.enabled = true;
      }
    }
  }
}

export default ViewerHandler;
