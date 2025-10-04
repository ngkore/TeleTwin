/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { useAccessToken } from "@itwin/desktop-viewer-react";
import type { Dispatch, SetStateAction } from "react";
import React, { createContext, useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { SelectIModel } from "../modelSelector";

interface IModelsRouteState {
  TeleTwinName?: string;
}

export interface IModelContextOptions {
  pendingIModel?: string;
  setPendingIModel: Dispatch<SetStateAction<string | undefined>>;
}

export const IModelContext = createContext({} as IModelContextOptions);

export const IModelsRoute = () => {
  const { TeleTwinId } = useParams();
  const location = useLocation();
  const [TeleTwinName, setITwinName] = useState<string>();
  const [pendingIModel, setPendingIModel] = useState<string>();
  const accessToken = useAccessToken();

  useEffect(() => {
    const routeState = location?.state as IModelsRouteState | undefined;
    if (routeState?.TeleTwinName) {
      setITwinName(routeState?.TeleTwinName);
    }
  }, [location?.state]);

  return (
    <IModelContext.Provider value={{ pendingIModel, setPendingIModel }}>
      <SelectIModel
        accessToken={accessToken || ""}
        iTwinId={TeleTwinId}
        TeleTwinName={TeleTwinName}
      />
    </IModelContext.Provider>
  );
};
