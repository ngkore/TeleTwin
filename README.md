# Getting Started with the TeleTwin Viewer Create React App Template

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).


## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the Electron app in the development mode.\
The page will reload if you make edits.

### `npm run build:backend`

Compiles the backend.

### `npm run build:frontend`

Compiles and bundles the frontend.

## Notes

If you are not using NPM, remove the `USING_NPM` env var from [.env](./.env)

## GIS Features

This desktop TeleTwin application includes integrated GIS capabilities:

### GIS Provider Widget
- **Multiple map providers**: OpenStreetMap, CartoDB, Stamen, ESRI, Bing Maps, MapBox
- **Terrain controls**: Enable/disable terrain visualization  
- **Background map management**: Toggle map visibility
- **Provider switching**: Dynamically change between different map tile sources

### Map Layers Widget
- **ArcGIS layer support**: Attach external ArcGIS map services
- **Model layers**: Convert 3D models to map layers for GIS visualization
- **Layer management**: Control layer visibility and ordering

### Usage
1. Open an iModel in the viewer
2. Access the "GIS Providers" and "Map Layers" widgets from the right panel
3. Enable background maps and select your preferred provider
4. Attach additional map layers as needed
5. Toggle terrain for enhanced 3D visualization
