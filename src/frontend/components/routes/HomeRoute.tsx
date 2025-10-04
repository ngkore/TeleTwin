/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import React, { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { TeleTwinViewerApp } from "../../app/TeleTwinViewerApp";
import { SettingsContext } from "../../services/SettingsContext";
import { NewHome } from "../home/NewHome";
import { ThemeProvider } from "../../theme/ThemeProvider";

export const HomeRoute = () => {
  const navigate = useNavigate();
  const userSettings = useContext(SettingsContext);

  useEffect(() => {
    // must be initialized here (child of the Router) in order to use the navigate function
    TeleTwinViewerApp.initializeMenuListeners(navigate, userSettings.addRecent);
  }, [navigate, userSettings]);

  return (
    <ThemeProvider>
      <NewHome />
    </ThemeProvider>
  );
};
