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

import React, { useContext, useEffect } from "react";
import { SettingsContext } from "../../services/SettingsContext";
import { NewHome } from "../home/NewHome";
import { ThemeProvider } from "../../theme/ThemeProvider";

export const HomeRoute = () => {
  const userSettings = useContext(SettingsContext);

  return (
    <ThemeProvider>
      <NewHome />
    </ThemeProvider>
  );
};
