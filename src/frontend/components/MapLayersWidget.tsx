/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/

import { StagePanelLocation, StagePanelSection, UiItemsProvider, useActiveViewport, Widget, WidgetState } from "@itwin/appui-react";
import {  ModelMapLayerProps, ModelMapLayerSettings } from "@itwin/core-common";
import { MapLayerSource, MapLayerSourceStatus } from "@itwin/core-frontend";
import { Button } from "@itwin/itwinui-react";
import React, { FunctionComponent } from "react";


const MapLayersWidget: FunctionComponent = () => {
  const viewport = useActiveViewport();

  //////////////////////
  // Component rendering
  return (
    <div>
  {viewport ?  
      <div>
        {/************************* 
        'Attach layer button'*/}
        <div>
        <Button onClick={async ()=>{


          const name = "PhilyCityLandmarks";
          const formatId = "ArcGIS";
          const url = "https://services3.arcgis.com/RRwXxn3KKYHT7QV6/arcgis/rest/services/PhilyCityLandmarks/MapServer";

          const source = MapLayerSource.fromJSON({name, formatId, url});
          try {
            const validation = await source?.validateSource();
            if (validation?.status === MapLayerSourceStatus.Valid)
            {
              const settings = source?.toLayerSettings(validation.subLayers);
              if (settings)
                viewport.view.displayStyle.attachMapLayer({settings, mapLayerIndex: {isOverlay: false, index: -1}});
            }
          } catch (error) {
          }


        }
        }>Attach layer</Button>
        </div>

        {/************************* 
        'Attach model layer button'*/}
        <div>
        <Button onClick={async ()=>{


          const model: ModelMapLayerProps = {
            name: "CompleteStreets",
            modelId: "0xe0000000004"
          }
          // Attach model layer for this model
          const settings = ModelMapLayerSettings.fromJSON(model);
          viewport.view.displayStyle.attachMapLayer({settings, mapLayerIndex: {isOverlay: false, index: -1}});

          // Turn OFF display of model geometries
          viewport.changeModelDisplay(model.modelId, false);

        }

        }>Attach Model layer</Button>
        </div>
      </div>
      :
      <span>No active viewport</span>
    }
    </div>
  );
};

export class MapLayersWidgetProvider implements UiItemsProvider {
  public readonly id: string = "MapLayersWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets:Widget[] =  [];
    if (location === StagePanelLocation.Right) {
      widgets.push(
        {
          id: "MapLayersWidget",
          label: "Map Layers",
          defaultState: WidgetState.Floating,
          content:  <MapLayersWidget />
        }
      );
    }
    return widgets;
  }
}