/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
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
import { theme } from "../theme/theme";

// TEXT SIZE OPTIONS - Change these values to adjust font sizes
const TEXT_SIZES = {
  header: '18px',      // Header name size
  key: '13px',         // Property key size  
  value: '13px'        // Property value size
};

// Helper function to convert text to Title Case (First Letter Big)
const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

const PropertiesWidget: FunctionComponent = () => {
  const iModel = useActiveIModelConnection();
  const metadataManager = MetadataManager.getInstance();
  const [selectedElementMetadata, setSelectedElementMetadata] = useState<ElementMetadata | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [allMetadata, setAllMetadata] = useState<ElementMetadata[]>([]);

  useEffect(() => {
    const updateMetadata = (metadata: ElementMetadata[]) => {
      setAllMetadata(metadata);
    };

    metadataManager.addListener(updateMetadata);
    updateMetadata(metadataManager.getAllElementMetadata());

    return () => {
      metadataManager.removeListener(updateMetadata);
    };
  }, []);

  useEffect(() => {
    if (!iModel) {
      console.log("PropertiesWidget: No iModel available");
      return;
    }

    console.log("PropertiesWidget: Setting up selection listener for iModel:", iModel.name);

    const handleSelectionChange = async () => {
      try {
        console.log("PropertiesWidget: Selection changed!");
        console.log("Selection set:", iModel.selectionSet);
        console.log("Selection size:", iModel.selectionSet.size);
        
        const selection = iModel.selectionSet;
        if (selection && selection.size > 0) {
          const elements = selection.elements;
          console.log("Elements collection:", elements);
          console.log("Elements size:", elements.size);
          
          if (elements.size > 0) {
            const elementsArray = Array.from(elements);
            const firstElementId = elementsArray[0] as string;
            console.log("Selected element ID:", firstElementId);
            console.log("All selected elements:", elementsArray);
            setSelectedElementId(firstElementId);
            
            // Store iModel reference for dynamic matching
            (window as any).iModelApp = { iModel };
            
            // Try synchronous lookup first
            let metadata = metadataManager.getElementMetadata(firstElementId);
            console.log("Sync metadata result:", metadata);
            
            if (!metadata) {
              console.log("Attempting async metadata lookup...");
              try {
                metadata = await metadataManager.getElementMetadataAsync(firstElementId);
                console.log("Async metadata result:", metadata);
              } catch (error) {
                console.error("Async metadata lookup failed:", error);
              }
            }
            
            setSelectedElementMetadata(metadata || null);
          }
        } else {
          console.log("No selection");
          setSelectedElementId(null);
          setSelectedElementMetadata(null);
        }
      } catch (error) {
        console.error("Error handling selection change:", error);
        setSelectedElementId(null);
        setSelectedElementMetadata(null);
      }
    };

    // Listen for selection changes
    console.log("Adding selection change listener");
    const removeListener = iModel.selectionSet.onChanged.addListener(handleSelectionChange);
    
    // Initial call
    console.log("Initial selection check");
    handleSelectionChange();

    return () => {
      console.log("Removing selection listener");
      removeListener();
    };
  }, [iModel, metadataManager]);

  const renderSelectedMetadata = () => {
    // Only show CSV metadata
    if (!selectedElementMetadata) return null;

    const entries = Object.entries(selectedElementMetadata.metadata);
    const nameEntry = entries.find(([key]) => key.toLowerCase() === 'displayname');
    const displayName = nameEntry ? nameEntry[1] : (selectedElementMetadata.annotation || 'Element Properties');

    return (
      <div style={{
  marginTop: '12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.08)',
  overflow: 'hidden',
  fontFamily: '"Segoe UI", Arial, sans-serif'
}}>
  {/* Header */}
  <div style={{
    padding: '12px 14px',
    fontWeight: 600,
    fontSize: '15px',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  }}>
    {displayName}
  </div>

  {/* Entries */}
  {entries.map(([key, value], index) => (
    <div
      key={key}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        fontSize: '14px',
        borderBottom: index !== entries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
      }}
    >
      {/* Parameter */}
      <div style={{
        flex: '0 0 40%',
        color: '#9CA3AF', // muted gray
        fontWeight: 600,
        marginRight: '12px'
      }}>
        {toTitleCase(key?.toString() || '-')}
      </div>

      {/* Value */}
      <div style={{
        flex: 1,
        color: value?.toString() === '-' ? '#6B7280' : '#EAEAEA',
        fontWeight: 500
      }}>
        {toTitleCase(value?.toString() || '-')}
      </div>
    </div>
  ))}
</div>



    );
  };

  return (
    <div style={{ padding: '15px', minWidth: '300px',  color: theme.colors.textPrimary }}>
      {/* //backgroundColor: theme.colors.surface */}
      {/* <Text variant="subheading" style={{ color: theme.colors.textPrimary }}>Properties</Text> */}
      
    
      
      {!selectedElementId && (
  <div>
    <h3
      style={{
        fontWeight: 'bold',
        marginBottom: '8px',
        fontSize: '18px'
      }}
    >
      Properties
    </h3>

    <div
      style={{
        textAlign: 'center',
        padding: '20px',
        color: '#9CA3AF',
        fontSize: '13px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)'
      }}
    >
      Select an element in the 3D view to see its properties.
      {allMetadata.length === 0 && (
        <>
          <br />
          <br />
          Upload a CSV file in "Element Metadata" for additional details.
        </>
      )}
    </div>
  </div>
)}

{selectedElementId && !selectedElementMetadata && allMetadata.length > 0 && (
  <div
    style={{
      padding: '15px',
      //backgroundColor: theme.colors.surface,
      fontSize: '12px',
      color: theme.colors.textPrimary
    }}
  >
    <div><strong>Selected Element:</strong></div>
    <div>ID: {selectedElementId.substring(0, 16)}...</div>
    <div style={{ marginTop: '8px', color: theme.colors.info }}>
      No CSV metadata found for this element.
      <br />
      Make sure the element's annotation matches a name in your CSV file.
    </div>
  </div>
)}

{renderSelectedMetadata()}

{allMetadata.length > 0 && (
  <div
    style={{
      marginTop: '15px',
      padding: '10px',
      //backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.small,
      fontSize: '11px',
      color: theme.colors.textSecondary
    }}
  >
    <div><strong>Available Metadata:</strong></div>
    <div>{allMetadata.length} elements with CSV data</div>
    <div style={{ marginTop: '5px' }}>
      Elements: {allMetadata.slice(0, 3).map(m => m.annotation).join(', ')}
      {allMetadata.length > 3 && `... (+${allMetadata.length - 3} more)`}
    </div>
  </div>
)}
    </div>
  );
};

export class PropertiesWidgetProvider implements UiItemsProvider {
  public readonly id: string = "PropertiesWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Right) {
      widgets.push({
        id: "PropertiesWidget",
        label: "Properties",
        defaultState: WidgetState.Open,
        priority: 300,
        content: <PropertiesWidget />
      });
    }
    return widgets;
  }
}