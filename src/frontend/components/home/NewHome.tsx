/*---------------------------------------------------------------------------------------------
* Copyright ©️ 2025 NgKore Foundation
* SPDX-License-Identifier: Apache-2.0
* This project was donated to the NgKore Foundation by
* Shreya Sethi.
* Modifications are licensed under the Apache-2.0 License.
*--------------------------------------------------------------------------------------------*/


import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SvgSearch, 
  SvgFolder, 
  SvgSettings,
  SvgAdd,
  SvgPlay,
  SvgInfo,
  SvgFilter,
  SvgRefresh
} from "@itwin/itwinui-icons-react";
import { TeleTwinViewerApp } from "../../app/TeleTwinViewerApp";
import { SettingsContext } from "../../services/SettingsContext";
import { TowerFileService, type TowerData } from "../../services/TowerFileService";
import { Logo, SvgLatticeTower } from '../icons';
import './NewHome.scss';

// Tower data is now managed by TowerFileService

export const 
NewHome: React.FC = () => {
  const navigate = useNavigate();
  const userSettings = useContext(SettingsContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [towers, setTowers] = useState<TowerData[]>([]);
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stored folder path on component mount
  useEffect(() => {
    const storedPath = TowerFileService.getStoredFolderPath();
    if (storedPath) {
      setFolderPath(storedPath);
      loadTowersFromFolder(storedPath);
    }
  }, []);

  const filteredTowers = towers.filter(tower => {
    const matchesSearch = tower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tower.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || tower.type === selectedType;
    return matchesSearch && matchesType;
  });

  const selectFolder = async () => {
    try {
      const selectedPath = await TeleTwinViewerApp.getFolder("Select folder containing tower files");
      if (selectedPath) {
        setFolderPath(selectedPath);
        TowerFileService.storeFolderPath(selectedPath);
        await loadTowersFromFolder(selectedPath);
      }
    } catch (err) {
      console.error('Failed to select folder:', err);
      setError('Failed to select folder');
    }
  };

  const loadTowersFromFolder = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const loadedTowers = await TowerFileService.scanFolderForTowers(path);
      setTowers(loadedTowers);
      if (loadedTowers.length === 0) {
        setError('No tower files found in the selected folder');
      }
    } catch (err) {
      console.error('Failed to load towers:', err);
      setError('Failed to load towers from folder');
      setTowers([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshTowers = async () => {
    if (folderPath) {
      await loadTowersFromFolder(folderPath);
    }
  };

  const changeFolderPath = () => {
    TowerFileService.clearStoredFolderPath();
    setFolderPath(null);
    setTowers([]);
    setError(null);
  };

  const openFile = async () => {
    const filePath = await TeleTwinViewerApp.getFile();
    if (filePath) {
      void userSettings.addRecent(filePath);
      void navigate("/viewer", { state: { filePath } });
    }
  };

  const openTower = async (tower: TowerData) => {
    if (tower.bimPath) {
      try {
        void userSettings.addRecent(tower.bimPath, tower.name);
        void navigate("/viewer", { 
          state: { 
            filePath: tower.bimPath,
            towerData: {
              id: tower.id,
              name: tower.name,
              csvPath: tower.csvPath,
              metadataPath: tower.metadataPath,
              bimPath: tower.bimPath
            }
          } 
        });
      } catch (err) {
        console.error('Failed to open tower:', err);
        setError(`Failed to open tower: ${tower.name}`);
      }
    } else {
      setError(`No .bim file found for tower: ${tower.name}`);
    }
  };


  const getTypeIcon = (type: string) => {
    // You can add specific icons for different tower types
    return (
      <SvgLatticeTower 
        style={{ 
          width: '3rem', 
          height: '3rem'
        }} 
      />
    );
  };

  const getStatusBadgeClass = (status: string) => {
    const baseClass = 'new-home__status-badge';
    switch (status) {
      case 'active': return `${baseClass} ${baseClass}--active`;
      case 'maintenance': return `${baseClass} ${baseClass}--maintenance`;
      case 'offline': return `${baseClass} ${baseClass}--offline`;
      default: return baseClass;
    }
  };


  return (
    <div className="new-home">
      {/* Header */}
      <header className="new-home__header">
        <div className="new-home__header-content">
          <Logo width={150}/>
          {/* <div className="new-home__header-actions">
            <button className="new-home__quick-action">
              <SvgSettings />
              Settings
            </button>
            <button className="new-home__quick-action">
              <SvgInfo />
              Help
            </button>
          </div> */}
        </div>
      </header>

      {/* Main Content */}
      <main className="new-home__main">
        {/* Hero Section */}
        <div className="new-home__hero">
          <h1 className="new-home__title">Welcome to TeleTwin</h1>
          <p className="new-home__subtitle">
            Experience the future of telecommunications management with advanced 3D visualization, real-time monitoring, and intelligent analytics for your tower network.
          </p>
          
          <div className="new-home__controls">
            {!folderPath ? (
              <button 
                className="new-home__button"
                onClick={selectFolder}
              >
                <SvgFolder />
                Select Tower Folder
              </button>
            ) : (
              <>
                <button 
                  className="new-home__button"
                  onClick={openFile}
                >
                  <SvgFolder />
                  Open Model File
                </button>
                <button 
                  className="new-home__quick-action new-home__quick-action--primary"
                  onClick={refreshTowers}
                  disabled={loading}
                >
                  <SvgRefresh />
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
                <button 
                  className="new-home__quick-action new-home__quick-action--warning"
                  onClick={changeFolderPath}
                >
                  <SvgSettings />
                  Change Folder
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="new-home__controls new-home__error">
            <strong>Error:</strong> {error}
            <button
              className="new-home__error-button"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Current Folder Display */}
        {folderPath && (
          <div className="new-home__controls new-home__folder-display">
            <strong>Current Folder:</strong> {folderPath} ({towers.length} towers found)
          </div>
        )}

        {/* Search and Filter Controls */}
        {folderPath && (
          <div className="new-home__controls">
            <div className="new-home__search-container">
              <div className="new-home__search-icon">
                <SvgSearch />
              </div>
              <input
                type="text"
                placeholder="Search towers, documents, or locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="new-home__search-input"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="new-home__filter"
            >
              <option value="all">All Types</option>
              <option value="telecom">Telecom</option>
              <option value="cellular">Cellular</option>
              <option value="radio">Radio</option>
              <option value="broadcast">Broadcast</option>
            </select>
          </div>
        )}

        {/* Tower Grid */}
        <div className="new-home__grid">
          {filteredTowers.map((tower) => (
            <div
              key={tower.id}
              className="new-home__tower-card"
              onClick={() => openTower(tower)}
            >
              <div className="new-home__tower-header">
                <div>
                  <div className="new-home__tower-name">
                    {getTypeIcon(tower.type)}
                  </div>
                  <div className="new-home__tower-name">
                    {tower.name}
                  </div>
                </div>
                <div className={getStatusBadgeClass(tower.status)}>
                  {tower.status}
                </div>
              </div>

              <div className="new-home__tower-info">
                <div className="new-home__tower-info-row">
                  <div className="new-home__tower-info-item">
                    Updated: {tower.lastUpdated}
                  </div>
                  <div className="new-home__tower-info-item">
                    Size: <span className="new-home__file-size">{tower.bimFileSize}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTowers.length === 0 && folderPath && !loading && !error && (
          <div className="new-home__empty-state">
            <div className="new-home__empty-state-icon">🔍</div>
            <p>No towers found matching your search criteria.</p>
            <p className="new-home__empty-state-subtitle">Try adjusting your search terms or filters</p>
          </div>
        )}

        {!folderPath && (
          <div className="new-home__empty-state">
            <div className="new-home__empty-state-icon">📁</div>
            <p>Select a folder containing your tower files to get started.</p>
            <p className="new-home__empty-state-subtitle">
              Your folder should contain sets of files: name.bim, name.csv, and name_metadata.csv
            </p>
          </div>
        )}

        {loading && (
          <div className="new-home__empty-state new-home__empty-state--loading">
            <div className="new-home__empty-state-icon">⏳</div>
            <p>Loading towers from folder...</p>
          </div>
        )}
      </main>
    </div>
  );
};