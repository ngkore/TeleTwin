/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import "./SelectITwin.scss";

import { useAccessToken } from "@itwin/desktop-viewer-react";
import { ITwinGrid } from "@itwin/imodel-browser-react";
import {
  SvgCalendar,
  SvgList,
  SvgStarHollow,
} from "@itwin/itwinui-icons-react";
import { PageLayout } from "@itwin/itwinui-layouts-react";
import { SearchBox, Tab, Tabs, Text } from "@itwin/itwinui-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


const ITWIN_TYPE_MAP = ["", "?recents", "?myitwins"];

const tabsWithIcons = [
  <Tab key="favorite" label="Favorite TeleTwins" startIcon={<SvgStarHollow />} />,
  <Tab key="recents" label="Recent TeleTwins" startIcon={<SvgCalendar />} />,
  <Tab key="all" label="My TeleTwins" startIcon={<SvgList />} />,
];

export const SelectITwin = () => {
  const [TeleTwinType, setITwinType] = useState(() =>
    ITWIN_TYPE_MAP.includes(window.location.search)
      ? ITWIN_TYPE_MAP.indexOf(window.location.search)
      : 0
  );

  const [searchValue, setSearchValue] = React.useState("");
  const [searchParam, setSearchParam] = React.useState("");
  const startSearch = React.useCallback(() => {
    setSearchParam(searchValue);
  }, [searchValue]);
  const accessToken = useAccessToken();
  const navigate = useNavigate();

  return (
    <div className="select-itwin">
      <PageLayout.TitleArea className="select-itwin-title">
        <Text variant="title">Select TeleTwin</Text>
      </PageLayout.TitleArea>
      <Tabs
        labels={tabsWithIcons}
        onTabSelected={setITwinType}
        activeIndex={TeleTwinType}
        type={"borderless"}
        contentClassName="grid-holding-tab"
        tabsClassName="grid-holding-tabs"
        orientation="horizontal"
      >
        <div className={"inline-input-with-button"}>
          <SearchBox>
            <SearchBox.Input
              onChange={(event) => {
                const {
                  target: { value },
                } = event;
                setSearchValue(value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  startSearch();
                }
                if (event.key === "Escape") {
                  setSearchValue("");
                  setSearchParam("");
                }
              }}
              placeholder={"Search by name or number"}
              title={"Search"}
            />
            <SearchBox.Button title="Search button" onClick={startSearch} />
          </SearchBox>
        </div>
        <ITwinGrid
          accessToken={accessToken || ""}
          requestType={
            TeleTwinType === 0
              ? "favorites"
              : TeleTwinType === 1
              ? "recents"
              : (searchParam as any) ?? ""
          }
          onThumbnailClick={(itwin) => {
            void navigate(`/itwins/${itwin.id}`, {
              state: { TeleTwinName: itwin.displayName },
            });
          }}
          stringsOverrides={{ noIModels: "No TeleTwins found" } as any}
          filterOptions={searchParam}
        />
      </Tabs>
    </div>
  );
};
