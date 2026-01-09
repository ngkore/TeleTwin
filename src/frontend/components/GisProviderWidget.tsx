/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


import { StagePanelLocation, StagePanelSection, UiItemsProvider, useActiveViewport, Widget, WidgetState } from "@itwin/appui-react";
import { BaseMapLayerSettings, BackgroundMapType } from "@itwin/core-common";
import { Select, Button } from "@itwin/itwinui-react";
import React, { FunctionComponent, useState } from "react";
import { theme } from "../theme/theme";

interface GisProvider {
  name: string;
  url?: string;
  formatId?: string;
  provider?: string;
  type?: BackgroundMapType;
  description: string;
  requiresKey: boolean;
}

const gisProviders: GisProvider[] = [
  {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{level}/{column}/{row}.png",
    formatId: "TileURL",
    description: "Free, open-source map tiles",
    requiresKey: false
  },
  {
    name: "OpenStreetMap (Alternative)",
    url: "https://b.tile.openstreetmap.org/{level}/{column}/{row}.png",
    formatId: "TileURL",
    description: "Alternative OSM server",
    requiresKey: false
  },
  {
    name: "CartoDB Positron",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{level}/{column}/{row}.png",
    formatId: "TileURL",
    description: "Clean, light theme map",
    requiresKey: false
  },
  {
    name: "CartoDB Dark Matter",
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{level}/{column}/{row}.png",
    formatId: "TileURL",
    description: "Dark theme map",
    requiresKey: false
  },
  {
    name: "Stamen Terrain",
    url: "https://stamen-tiles.a.ssl.fastly.net/terrain/{level}/{column}/{row}.jpg",
    formatId: "TileURL",
    description: "Terrain-focused map style",
    requiresKey: false
  },
  {
    name: "Stamen Toner",
    url: "https://stamen-tiles.a.ssl.fastly.net/toner/{level}/{column}/{row}.png",
    formatId: "TileURL",
    description: "High contrast black & white",
    requiresKey: false
  },
  {
    name: "ESRI World Street Map",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{level}/{row}/{column}",
    formatId: "TileURL",
    description: "ESRI street map",
    requiresKey: false
  },
  {
    name: "ESRI World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{level}/{row}/{column}",
    formatId: "TileURL",
    description: "ESRI satellite imagery",
    requiresKey: false
  },
];

const GisProviderWidget: FunctionComponent = () => {
  const viewport = useActiveViewport();
  const [selectedProvider, setSelectedProvider] = useState<string>(gisProviders[0].name);
  const [terrainEnabled, setTerrainEnabled] = useState<boolean>(true);

  const applyGisProvider = (providerName: string) => {
    if (!viewport) return;

    const provider = gisProviders.find(p => p.name === providerName);
    if (!provider) return;

    try {
      if (provider.url && provider.formatId) {
        // Custom tile URL provider
        const settings = BaseMapLayerSettings.fromJSON({
          formatId: provider.formatId,
          url: provider.url,
          name: provider.name
        });
        viewport.view.displayStyle.backgroundMapBase = settings;
      } else if (provider.provider && provider.type !== undefined) {
        // Built-in provider (Bing, MapBox)
        viewport.view.displayStyle.changeBackgroundMapProvider({
          name: provider.provider as any,
          type: provider.type
        });
      }

      console.log(`Applied GIS provider: ${provider.name}`);
    } catch (error) {
      console.error(`Failed to apply GIS provider ${provider.name}:`, error);
    }
  };

  const toggleTerrain = () => {
    if (!viewport) return;

    const newTerrainState = !terrainEnabled;
    viewport.view.displayStyle.changeBackgroundMapProps({
      applyTerrain: newTerrainState,
      useDepthBuffer: newTerrainState
    });
    setTerrainEnabled(newTerrainState);
    console.log(`Terrain ${newTerrainState ? 'enabled' : 'disabled'}`);
  };

  const enableBackgroundMap = () => {
    if (!viewport) return;

    viewport.view.viewFlags = viewport.view.viewFlags.copy({
      backgroundMap: true,
    });
    console.log("Background map enabled");
  };

  return (
    <div style={{ padding: '10px', minWidth: '250px', color: theme.colors.textPrimary }}>
      {/* <h4 style={{ color: theme.colors.textPrimary }}>GIS Providers</h4> */}
      <h3 style={{  fontWeight: 'bold',marginBottom: '8px 0px', fontSize: '18px'}}>
      GIS Providers
    </h3>
      <div style={{ marginBottom: '10px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: theme.colors.textPrimary }}>
          Map Provider:
        </label>
        <Select
          options={gisProviders.map(provider => ({
            value: provider.name,
            label: provider.name,
            sublabel: provider.description
          }))}
          value={selectedProvider}
          onChange={(value) => {
            if (value) {
              setSelectedProvider(value);
              applyGisProvider(value);
            }
          }}
          placeholder="Select GIS provider..."
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <Button 
          size="small" 
          onClick={enableBackgroundMap}
          style={{ marginRight: '5px', width: '100%', marginBottom: '5px' }}
        >
          Enable Map
        </Button>
        
        <Button 
          size="small" 
          onClick={toggleTerrain}
          style={{ width: '100%' }}
          styleType={terrainEnabled ? "high-visibility" : "default"}
        >
          {terrainEnabled ? 'Disable' : 'Enable'} Terrain
        </Button>
      </div>

      <div style={{ fontSize: '11px', color: theme.colors.textSecondary, marginTop: '10px' }}>
        <strong>Selected:</strong> {gisProviders.find(p => p.name === selectedProvider)?.description}
        {gisProviders.find(p => p.name === selectedProvider)?.requiresKey && (
          <div style={{ color: theme.colors.warning, marginTop: '2px' }}>
            ⚠️ Requires API key
          </div>
        )}
      </div>
    </div>
  );
};

export class GisProviderWidgetProvider implements UiItemsProvider {
  public readonly id: string = "GisProviderWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Right && section === StagePanelSection.Start) {
      widgets.push({
        id: "GisProviderWidget",
        label: "GIS",
        defaultState: WidgetState.Open,
        priority: 1,
        content: <GisProviderWidget />
      });
    }
    return widgets;
  }
}