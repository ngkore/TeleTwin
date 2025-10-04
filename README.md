# Getting Started with the TeleTwin Viewer Create React App Template

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Environment Variables

Prior to running the app, you will need to add OIDC client configuration to the variables in the .env file:

```
ITWIN_VIEWER_CLIENT_ID="native-xxxxxxxx"
```

- You should generate a [client](https://developer.bentley.com/register/) to get started. The client that you generate should be for a desktop app and use the following list of apis. You can add the default redirect uri (http://localhost:3000/signin-callback).

- Viewer expects the `itwin-platform` scope to be set.

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

## Next Steps

- There is a sample snapshot file in the "samples" directory that can be used for testing application features

- [TeleTwin Viewer options](https://www.npmjs.com/package/@itwin/desktop-viewer-react)

- [Extending the TeleTwin Viewer](https://www.itwinjs.org/learning/tutorials/hello-world-viewer/)

- [Using the TeleTwin Platform](https://developer.bentley.com/)

- [TeleTwin Developer Program](https://www.youtube.com/playlist?list=PL6YCKeNfXXd_dXq4u9vtSFfsP3OTVcL8N)