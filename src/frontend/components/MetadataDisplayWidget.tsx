/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import {
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
  Widget,
  WidgetState,
  useActiveIModelConnection,
} from "@itwin/appui-react";
import { Text } from "@itwin/itwinui-react";
import React, { FunctionComponent, useState, useEffect } from "react";
import { MetadataManager, ElementMetadata } from "../../common/MetadataManager";

const MetadataDisplayWidget: FunctionComponent = () => {
  const iModel = useActiveIModelConnection();
  const metadataManager = MetadataManager.getInstance();
  const [selectedElementMetadata, setSelectedElementMetadata] = useState<ElementMetadata | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  useEffect(() => {
    // For now, display a simple message until selection is integrated
    setSelectedElementId(null);
    setSelectedElementMetadata(null);
  }, [iModel]);

  const renderSelectedMetadata = () => {
    if (!selectedElementMetadata) return null;

    const entries = Object.entries(selectedElementMetadata.metadata)
      .filter(([key]) => key.toLowerCase() !== 'name');

    return (
      <div style={{ marginTop: '10px' }}>
        <Text variant="subheading" style={{ marginBottom: '8px', color: '#0073e6' }}>
          📊 Selected Element Metadata
        </Text>
        
        <div style={{ marginBottom: '15px', border: '1px solid #e1e5e9', borderRadius: '4px', padding: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
            {selectedElementMetadata.annotation}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
            Element ID: {selectedElementMetadata.elementId.substring(0, 16)}...
          </div>
          
          <div style={{ 
            border: '1px solid #f0f0f0', 
            borderRadius: '3px', 
            overflow: 'hidden',
            fontSize: '12px'
          }}>
            {entries.map(([key, value], entryIndex) => (
              <div 
                key={key}
                style={{
                  display: 'flex',
                  backgroundColor: entryIndex % 2 === 0 ? '#f8f9fa' : 'white',
                  borderBottom: entryIndex < entries.length - 1 ? '1px solid #f0f0f0' : 'none'
                }}
              >
                <div style={{
                  padding: '6px 10px',
                  fontWeight: 'bold',
                  borderRight: '1px solid #f0f0f0',
                  flex: '0 0 35%',
                  wordBreak: 'break-word'
                }}>
                  {key}:
                </div>
                <div style={{
                  padding: '6px 10px',
                  flex: '1',
                  wordBreak: 'break-word'
                }}>
                  {value?.toString() || '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '15px', minWidth: '300px' }}>
      <Text variant="subheading">Selected Element</Text>
      
      {!selectedElementId && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666', 
          fontSize: '12px'
        }}>
          <div>👆</div>
          <div style={{ marginTop: '10px' }}>
            Element selection integration is being implemented.
            <br />
            For now, check the Properties panel for CSV metadata when you select elements.
          </div>
        </div>
      )}

      {selectedElementId && !selectedElementMetadata && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px', 
          color: '#666', 
          fontSize: '12px'
        }}>
          <div>Element ID: {selectedElementId.substring(0, 16)}...</div>
          <div style={{ marginTop: '10px' }}>
            No CSV metadata found for this element.
            <br />
            Make sure to upload CSV data that matches this element's annotation.
          </div>
        </div>
      )}

      {renderSelectedMetadata()}
    </div>
  );
};

export class MetadataDisplayWidgetProvider implements UiItemsProvider {
  public readonly id: string = "MetadataDisplayWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Right) {
      widgets.push({
        id: "MetadataDisplayWidget",
        label: "Selected Metadata",
        defaultState: WidgetState.Open,
        content: <MetadataDisplayWidget />
      });
    }
    return widgets;
  }
}