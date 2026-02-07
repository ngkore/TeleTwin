# TeleTwin

**An open-source, document-first Digital Twin reference project for telecom infrastructure**

TeleTwin is an open-source project donated to the **Ngkore Foundation** by **Shreya Sethi**. The project demonstrates how telecom infrastructure—especially mobile towers—can be represented as digital twins by unifying engineering models, GIS context, metadata, and IoT telemetry into a single, interactive dashboard.

This repository is intentionally designed as a **conceptual and reference implementation**, aimed at education, research, and experimentation in telecom digital twin systems.

 

## Why TeleTwin Exists

Telecom towers are among the most critical assets in modern connectivity, yet their data ecosystem is highly fragmented:

* Engineering information locked in PDFs and 2D CAD files
* Spatial data handled separately in GIS tools
* IoT and monitoring data living in isolated dashboards
* Metadata scattered across spreadsheets and reports

As a result, even simple operational questions take weeks to answer and require manual coordination across teams.

TeleTwin explores how a digital twin can act as a **central hub for tower-related data**, making infrastructure easier to understand, visualize, and manage.

 

## Demo Overview

This repository includes a working demonstration of the TeleTwin concept.

A demo video showcasing the digital twin dashboard, data integration, and interactions can be added here:

https://github.com/user-attachments/assets/a6e92615-0cb6-43a0-b767-5f8e82819d4f


## Getting Started

### Prerequisites

* Node.js (LTS recommended)
* npm

### Install and Run

```bash
npm install
npm run build
npm start
```

 

## IoT Data Simulator

To simulate live telemetry data:

```bash
cd iot-simulator
npm run delhi
```

This starts a mock data stream that feeds sensor-like values into the digital twin.




## Project Philosophy

**Turn infrastructure data into a living, visual system.**

TeleTwin follows a **document-first digital twin philosophy**, where existing engineering artifacts inspire the digital representation of assets. Instead of starting with expensive field capture or cloud-heavy pipelines, this project focuses on:

* Using existing models and structured data as the foundation
* Layering spatial, operational, and telemetry data on top
* Keeping the system local-first, transparent, and extensible

This repository does **not** attempt to be a full enterprise asset management system. It exists to demonstrate how digital twins can be structured and visualized for telecom infrastructure.

 

## What This Repository Contains

This repository includes a reference setup that showcases a telecom digital twin concept.

### Digital Twin Dashboard

* Built using Bentley’s open-source iTwin desktop framework
* Interactive 3D visualization of telecom infrastructure
* GIS-aware and spatially accurate
* Supports metadata overlays and asset-level inspection

### Sample Telecom BIM Model

* Includes a sample `.bim` file
* 15-meter telecom monopole tower
* Architecturally and structurally modeled
* Serves as a base asset for visualization and integration demonstrations

### IoT Data Simulation

* Lightweight IoT data simulator inspired by real-world sensor patterns
* Generates mock telemetry for tower equipment
* Demonstrates how live or near-real-time data can be connected to physical assets

### Multi-Source Data Integration Concept

TeleTwin demonstrates how diverse data sources can converge inside a digital twin:

* BIM / CAD-derived geometry
* GIS and geospatial context
* IoT telemetry (simulated)
* Engineering and asset metadata
* Basic structural indicators

All data is visualized through a single desktop-based digital twin interface.

 

## Scope Clarification

This open-source repository is a **reference and demonstration project**.

The following capabilities are **not implemented** in this repository:

* Automated PDF to BIM or 3D model conversion
* AI-based document parsing or extraction
* Production-grade structural analysis engines
* Compliance or regulatory certification workflows

These areas are part of the broader TeleTwin research and product vision but are intentionally out of scope here to keep the project lightweight, transparent, and easy to understand.

 

## Technology Stack

* **Base Platform:** Bentley open-source iTwin (Desktop)
* **Runtime:** Node.js
* **UI:** iTwin-based desktop dashboard
* **Data Types:** BIM, GIS, metadata, IoT (mocked)
* **Architecture:** Local-first, desktop-based

This approach emphasizes data sovereignty, offline capability, and high-performance local rendering.

 
 

## Intended Use Cases

* Telecom infrastructure research and education
* Digital twin demonstrations and proof-of-concepts
* GIS, BIM, and IoT integration experiments
* Visualization-first infrastructure projects

This repository is **not production software** and is intended for learning, exploration, and concept validation.

 

## Open Source, Ownership, and License

TeleTwin is an open-source project donated to and maintained under the **Ngkore Foundation**.

The project was originally created and donated by **Shreya Sethi** as a contribution to open digital infrastructure research.

All forks and derivative works must clearly indicate that they are **not official Ngkore Foundation projects**, unless explicitly approved in writing by the Ngkore Foundation. Use of the Ngkore Foundation name, logo, or branding in a way that suggests ownership or endorsement is not permitted.

This project is licensed under the **Apache License, Version 2.0**. See the `LICENSE` file for details.

 

## Contributing

Contributions are welcome.

You can contribute by improving documentation, enhancing visualization layers, adding data connectors, extending the IoT simulator, or proposing architectural improvements. Please open an issue or submit a pull request.

 

## Acknowledgements

* Bentley open-source iTwin ecosystem
* Ngkore Foundation
