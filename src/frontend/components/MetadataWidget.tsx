/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


/**
 * MetadataWidget Component
 * 
 * This widget provides a comprehensive interface for managing element metadata through CSV file integration.
 * It allows users to upload CSV files containing metadata and automatically matches this data with 3D model elements
 * using intelligent name-based matching algorithms.
 * 
 * Key Features:
 * - CSV file upload with drag-and-drop support
 * - Real-time element-metadata matching using multiple algorithms
 * - Interactive data preview showing CSV contents and matched elements
 * - Live statistics displaying match rates and data information
 * - Dynamic refresh and clear data capabilities
 * - Error handling and user feedback
 * 
 * CSV Format Requirements:
 * - Must contain a 'name' column that corresponds to element annotations in the 3D model
 * - Additional columns can contain any metadata properties
 * - Supports quoted values and various CSV formats
 * 
 * Matching Strategy:
 * 1. Exact Match: Direct comparison of names
 * 2. Partial Match: Substring matching in both directions
 * 3. Clean Match: Removes common prefixes/suffixes before matching
 * 4. Dynamic Match: On-demand matching for elements not found in initial load
 */

import {
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
  useActiveIModelConnection,
  Widget,
  WidgetState,
} from "@itwin/appui-react";
import { Button, Table, Alert, ProgressLinear } from "@itwin/itwinui-react";
import React, { FunctionComponent, useState, useEffect, useRef } from "react";
import { MetadataManager, ElementMetadata, MetadataRow } from "../../common/MetadataManager";

const MetadataWidget: FunctionComponent = () => {
  // Get the currently active iModel connection from iTwin framework
  const iModel = useActiveIModelConnection();
  // Get the singleton metadata manager instance for data operations
  const metadataManager = MetadataManager.getInstance();
  
  // Component state management
  const [elementMetadata, setElementMetadata] = useState<ElementMetadata[]>([]); // Matched element-metadata pairs
  const [csvData, setCsvData] = useState<MetadataRow[]>([]); // Raw CSV data rows
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]); // CSV column headers
  const [isLoading, setIsLoading] = useState(false); // Loading state for operations
  const [error, setError] = useState<string>(''); // Error messages for user feedback
  const [success, setSuccess] = useState<string>(''); // Success messages for user feedback
  const [statistics, setStatistics] = useState<any>({}); // Matching statistics and data info
  const fileInputRef = useRef<HTMLInputElement>(null); // Reference to file input for programmatic control

  // Effect hook for setting up real-time data updates from MetadataManager
  useEffect(() => {
    /**
     * Callback function triggered when metadata changes in the manager
     * Updates all component state with latest data from the singleton manager
     */
    const updateMetadata = (metadata: ElementMetadata[]) => {
      setElementMetadata(metadata);
      setCsvData(metadataManager.getCSVData());
      setCsvHeaders(metadataManager.getCSVHeaders());
      setStatistics(metadataManager.getStatistics());
    };

    // Subscribe to metadata manager updates for real-time UI updates
    metadataManager.addListener(updateMetadata);
    
    // Initial load - populate UI with any existing data
    updateMetadata(metadataManager.getAllElementMetadata());

    // Cleanup: remove listener when component unmounts to prevent memory leaks
    return () => {
      metadataManager.removeListener(updateMetadata);
    };
  }, []);

  /**
   * Handles CSV file upload and processing
   * Validates file type, loads CSV data, and triggers automatic matching if iModel is available
   * 
   * @param files - FileList from file input element
   */
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    // Validate file extension to ensure it's a CSV file
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    // Set loading state and clear previous messages
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Read file content as text
      const content = await file.text();
      // Load and parse CSV data through metadata manager
      await metadataManager.loadCSVData(content);
      
      // If iModel is available, automatically trigger matching
      if (iModel) {
        await metadataManager.matchElementsWithMetadata(iModel);
        setSuccess(`Successfully loaded and matched metadata. Found ${metadataManager.getStatistics().matchedElements} matches.`);
      } else {
        // CSV loaded but no model to match against yet
        setSuccess('CSV loaded successfully. Matching will occur when model is loaded.');
      }
    } catch (err) {
      // Handle and display errors with user-friendly messages
      setError(`Failed to load CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      // Always clear loading state
      setIsLoading(false);
    }
  };

  const handleRefreshMatching = async () => {
    if (!iModel || csvData.length === 0) {
      setError('No model loaded or no CSV data available');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      await metadataManager.matchElementsWithMetadata(iModel);
      setSuccess(`Refreshed matching. Found ${metadataManager.getStatistics().matchedElements} matches.`);
    } catch (err) {
      setError(`Failed to refresh matching: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    metadataManager.clearMetadata();
    setError('');
    setSuccess('Metadata cleared');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Renders a preview of the loaded CSV data
   * Shows first 5 rows and first 4 columns in a condensed table format
   * Includes row count and column overflow indicator
   */
  const renderCSVPreview = () => {
    if (csvData.length === 0) return null;

    const previewData = csvData.slice(0, 5); // Limit preview to first 5 rows
    const displayHeaders = csvHeaders.slice(0, 4); // Limit preview to first 4 columns

    return (
      <div style={{ marginBottom: '15px' }}>
        <h5>CSV Preview ({csvData.length} rows)</h5>
        <Table
          data={previewData.map((row, index) => ({
            id: index,
            // Transform row data to display format, ensuring all values are strings
            ...Object.fromEntries(
              displayHeaders.map(header => [header, row[header]?.toString() || ''])
            )
          }))}
          columns={[
            // Dynamically create columns based on CSV headers
            ...displayHeaders.map(header => ({
              Header: header,
              accessor: header as any,
              width: 100,
            }))
          ]}
          density="condensed"
          style={{ fontSize: '11px' }}
          emptyTableContent="No data"
        />
        {/* Show indicator if there are more columns than displayed */}
        {csvHeaders.length > 4 && (
          <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
            ... and {csvHeaders.length - 4} more columns
          </div>
        )}
      </div>
    );
  };

  const renderMatchedElements = () => {
    if (elementMetadata.length === 0) return null;

    const previewData = elementMetadata.slice(0, 10); // Show first 10 matches

    return (
      <div style={{ marginBottom: '15px' }}>
        <h5>Matched Elements ({elementMetadata.length} matches)</h5>
        <Table
          data={previewData.map((item, index) => ({
            id: index,
            annotation: item.annotation,
            elementId: item.elementId.substring(0, 8) + '...',
            metadataName: item.metadata.name,
            fieldsCount: Object.keys(item.metadata).length - 1 // -1 for name field
          }))}
          columns={[
            { Header: 'Annotation', accessor: 'annotation' as any, width: 120 },
            { Header: 'Element ID', accessor: 'elementId' as any, width: 80 },
            { Header: 'Metadata', accessor: 'metadataName' as any, width: 100 },
            { Header: 'Fields', accessor: 'fieldsCount' as any, width: 60 },
          ]}
          density="condensed"
          style={{ fontSize: '11px' }}
          emptyTableContent="No matches"
        />
        {elementMetadata.length > 10 && (
          <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
            ... and {elementMetadata.length - 10} more matches
          </div>
        )}
      </div>
    );
  };

  const renderStatistics = () => {
    if (!statistics || statistics.totalCSVRows === 0) return null;

    return (
      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#161B22', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h5>Statistics</h5>
        <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
          <div>CSV Rows: <strong>{statistics.totalCSVRows}</strong></div>
          <div>Matched Elements: <strong>{statistics.matchedElements}</strong></div>
          <div>Match Rate: <strong>{(statistics.matchPercentage || 0).toFixed(1)}%</strong></div>
          <div>Headers: <strong>{statistics.headers?.length || 0}</strong></div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '15px', minWidth: '300px', background: '#0D1117', color: '#EAEAEA', height: '100%' }}>
      <h4 style={{ color: '#58A6FF' }}>Element Metadata</h4>
      
      {error && (
        <Alert type="negative" style={{ marginBottom: '10px' }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert type="positive" style={{ marginBottom: '10px' }}>
          {success}
        </Alert>
      )}

      {isLoading && (
        <div style={{ marginBottom: '10px' }}>
          <ProgressLinear indeterminate />
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 'bold' }}>
          Upload CSV Metadata:
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => handleFileUpload(e.target.files)}
          style={{ 
            width: '100%', 
            padding: '8px', 
            border: '2px dashed #ccc', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          ref={fileInputRef}
        />
        <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
          CSV must contain a 'name' column that matches element annotations
        </div>
      </div>

      <div style={{ display: 'flex', gap: '5px', marginBottom: '15px' }}>
        <Button 
          size="small" 
          onClick={handleRefreshMatching}
          disabled={!iModel || csvData.length === 0 || isLoading}
          style={{ flex: 1 }}
        >
          Refresh Matching
        </Button>
        
        <Button 
          size="small" 
          onClick={handleClearData}
          disabled={isLoading}
          style={{ flex: 1 }}
          styleType="borderless"
        >
          Clear Data
        </Button>
      </div>

      {renderStatistics()}
      {renderCSVPreview()}
      {renderMatchedElements()}

      {csvData.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#A1A1AA',
          fontSize: '12px',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '4px',
          backgroundColor: '#161B22'
        }}>
          <div>📊</div>
          <div style={{ marginTop: '10px' }}>
            Upload a CSV file to add metadata to your model elements.
            <br />
            The CSV should have a 'name' column matching your element annotations.
          </div>
        </div>
      )}
    </div>
  );
};

export class MetadataWidgetProvider implements UiItemsProvider {
  public readonly id: string = "MetadataWidgetProvider";

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, _section?: StagePanelSection) {
    const widgets: Widget[] = [];
    if (location === StagePanelLocation.Right) {
      widgets.push({
        id: "MetadataWidget",
        label: "Element Metadata",
        defaultState: WidgetState.Open,
        content: <MetadataWidget />
      });
    }
    return widgets;
  }
}