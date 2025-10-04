import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle
import numpy as np

# Create a large figure for the comprehensive flow chart
fig, ax = plt.subplots(1, 1, figsize=(20, 16))
ax.set_xlim(0, 20)
ax.set_ylim(0, 16)
ax.axis('off')

# Define colors for different component types
colors = {
    'frontend': '#E3F2FD',     # Light Blue - Frontend components
    'backend': '#FFF3E0',      # Light Orange - Backend components
    'common': '#E8F5E8',       # Light Green - Common/shared components
    'data': '#F3E5F5',         # Light Purple - Data management
    'ui': '#FFEBEE',           # Light Red - UI components
    'external': '#F0F4C3'      # Light Yellow - External services
}

# Helper function to create rounded rectangle
def create_rounded_rect(ax, x, y, width, height, color, text, text_size=9, text_color='black'):
    rect = FancyBboxPatch(
        (x, y), width, height,
        boxstyle="round,pad=0.1",
        facecolor=color,
        edgecolor='gray',
        linewidth=1.5
    )
    ax.add_patch(rect)
    ax.text(x + width/2, y + height/2, text, 
            ha='center', va='center', fontsize=text_size, 
            weight='bold', color=text_color, wrap=True)

# Helper function to draw arrow
def draw_arrow(ax, start_x, start_y, end_x, end_y, color='black', style='->', width=1.5):
    ax.annotate('', xy=(end_x, end_y), xytext=(start_x, start_y),
                arrowprops=dict(arrowstyle=style, color=color, lw=width))

# Title
ax.text(10, 15.5, 'TeleTwin Desktop Viewer - Application Architecture Flow Chart', 
        ha='center', va='center', fontsize=18, weight='bold')

# Legend
legend_y = 14.5
legend_elements = [
    ('Frontend Components', colors['frontend']),
    ('Backend Services', colors['backend']),
    ('Common/Shared', colors['common']),
    ('Data Management', colors['data']),
    ('UI Widgets', colors['ui']),
    ('External Services', colors['external'])
]

for i, (label, color) in enumerate(legend_elements):
    x_pos = 1 + (i * 3)
    create_rounded_rect(ax, x_pos, legend_y, 2.5, 0.4, color, label, 8)

# FRONTEND LAYER (Top)
frontend_y = 13

# Main App Component
create_rounded_rect(ax, 8, frontend_y, 4, 1, colors['frontend'], 
                   'App.tsx\nMain Application\nRouting & Initialization', 10)

# Routes Layer
routes_y = 11.5
create_rounded_rect(ax, 2, routes_y, 3, 1, colors['frontend'], 
                   'HomeRoute.tsx\nLanding Page\nFile Selection', 9)
create_rounded_rect(ax, 6, routes_y, 4, 1, colors['frontend'], 
                   'ViewerRoute.tsx\n3D Model Viewer\nMain Interface', 9)
create_rounded_rect(ax, 11, routes_y, 3, 1, colors['frontend'], 
                   'ITwinsRoute.tsx\niTwins Selection', 9)
create_rounded_rect(ax, 15, routes_y, 3, 1, colors['frontend'], 
                   'IModelsRoute.tsx\niModel Selection', 9)

# UI Widgets Layer
widgets_y = 10
create_rounded_rect(ax, 1, widgets_y, 2.5, 1, colors['ui'], 
                   'MetadataWidget\nCSV Integration\nElement Matching', 8)
create_rounded_rect(ax, 4, widgets_y, 2.5, 1, colors['ui'], 
                   'GisProviderWidget\nMap Providers\nBackground Maps', 8)
create_rounded_rect(ax, 7, widgets_y, 2.5, 1, colors['ui'], 
                   'PropertiesWidget\nElement Properties\nReal-time Display', 8)
create_rounded_rect(ax, 10, widgets_y, 2.5, 1, colors['ui'], 
                   'MapLayersWidget\nGIS Layers\nTerrain Control', 8)
create_rounded_rect(ax, 13, widgets_y, 2.5, 1, colors['ui'], 
                   'TreeWidget\nModel Hierarchy\nElement Navigation', 8)
create_rounded_rect(ax, 16, widgets_y, 2.5, 1, colors['ui'], 
                   'ViewportHeader\nModel Controls\nCSV Upload', 8)

# COMMON/SHARED LAYER (Middle)
common_y = 8.5

# Data Managers
create_rounded_rect(ax, 2, common_y, 3, 1, colors['data'], 
                   'MetadataManager.ts\nCSV Processing\nElement Matching\nSingleton Service', 8)
create_rounded_rect(ax, 6, common_y, 3, 1, colors['data'], 
                   'TowerManager.ts\nTower Data\nGeographic Queries\nSpatial Analysis', 8)
create_rounded_rect(ax, 10, common_y, 3, 1, colors['common'], 
                   'CleanupService.ts\nResource Management\nMemory Optimization', 8)
create_rounded_rect(ax, 14, common_y, 3, 1, colors['common'], 
                   'ViewerConfig.ts\nRPC Configuration\nInterface Setup', 8)

# BACKEND LAYER (Bottom)
backend_y = 7

# Main Backend Services
create_rounded_rect(ax, 3, backend_y, 3, 1, colors['backend'], 
                   'main.ts\nElectron Main Process\nWindow Management\nApp Bootstrap', 8)
create_rounded_rect(ax, 7, backend_y, 4, 1, colors['backend'], 
                   'ViewerHandler.ts\nIPC Communication Hub\nFile Operations\nSettings Management', 8)
create_rounded_rect(ax, 12, backend_y, 3, 1, colors['backend'], 
                   'UserSettings.ts\nPersistent Storage\nRecent Files\nPreferences', 8)

# EXTERNAL SERVICES LAYER
external_y = 5.5

create_rounded_rect(ax, 1, external_y, 2.5, 1, colors['external'], 
                   'iTwin Platform\nCore Frontend\nCore Backend\nDesktop Viewer', 8)
create_rounded_rect(ax, 4, external_y, 2.5, 1, colors['external'], 
                   'Map Providers\nOpenStreetMap\nCartoDB\nStamen\nESRI', 8)
create_rounded_rect(ax, 7, external_y, 2.5, 1, colors['external'], 
                   'File System\nBIM Files\nCSV Files\nUser Data', 8)
create_rounded_rect(ax, 10, external_y, 2.5, 1, colors['external'], 
                   'Cesium Ion\n3D Terrain\nImagery Services', 8)
create_rounded_rect(ax, 13, external_y, 2.5, 1, colors['external'], 
                   'Electron APIs\nNative OS\nWindow Management', 8)
create_rounded_rect(ax, 16, external_y, 2.5, 1, colors['external'], 
                   'React/TypeScript\nUI Framework\nType System', 8)

# DATA FLOW ARROWS

# App to Routes
draw_arrow(ax, 10, frontend_y, 8, routes_y + 0.5, 'blue', '->', 2)
draw_arrow(ax, 10, frontend_y, 3.5, routes_y + 0.5, 'blue', '->', 2)
draw_arrow(ax, 10, frontend_y, 12.5, routes_y + 0.5, 'blue', '->', 2)
draw_arrow(ax, 10, frontend_y, 16.5, routes_y + 0.5, 'blue', '->', 2)

# ViewerRoute to Widgets
draw_arrow(ax, 8, routes_y, 2.25, widgets_y + 1, 'green', '->', 1.5)
draw_arrow(ax, 8, routes_y, 5.25, widgets_y + 1, 'green', '->', 1.5)
draw_arrow(ax, 8, routes_y, 8.25, widgets_y + 1, 'green', '->', 1.5)
draw_arrow(ax, 8, routes_y, 11.25, widgets_y + 1, 'green', '->', 1.5)
draw_arrow(ax, 8, routes_y, 14.25, widgets_y + 1, 'green', '->', 1.5)
draw_arrow(ax, 8, routes_y, 17.25, widgets_y + 1, 'green', '->', 1.5)

# Widgets to Data Managers
draw_arrow(ax, 2.25, widgets_y, 3.5, common_y + 1, 'purple', '->', 1.5)
draw_arrow(ax, 5.25, widgets_y, 7.5, common_y + 1, 'purple', '->', 1.5)

# Data Managers to Backend
draw_arrow(ax, 3.5, common_y, 5, backend_y + 1, 'red', '->', 1.5)
draw_arrow(ax, 7.5, common_y, 9, backend_y + 1, 'red', '->', 1.5)
draw_arrow(ax, 11.5, common_y, 9, backend_y + 1, 'red', '->', 1.5)

# Backend to External
draw_arrow(ax, 9, backend_y, 8.25, external_y + 1, 'orange', '->', 1.5)
draw_arrow(ax, 5, backend_y, 14.25, external_y + 1, 'orange', '->', 1.5)

# External Services to Components
draw_arrow(ax, 2.25, external_y + 1, 2.25, widgets_y, 'gray', '-->', 1)
draw_arrow(ax, 5.25, external_y + 1, 5.25, widgets_y, 'gray', '-->', 1)
draw_arrow(ax, 8.25, external_y + 1, 8, routes_y, 'gray', '-->', 1)

# KEY DATA FLOWS - Add text labels for major flows
ax.text(1, 4.5, 'KEY DATA FLOWS:', fontsize=12, weight='bold')

flow_descriptions = [
    '1. User opens BIM file → HomeRoute → ViewerRoute → 3D Model Loading',
    '2. CSV Upload → MetadataWidget → MetadataManager → Element Matching',
    '3. GIS Provider Selection → GisProviderWidget → Map API Integration',
    '4. File Operations → Backend IPC → Electron File System Access',
    '5. Settings & Preferences → UserSettings → Persistent JSON Storage',
    '6. Tower Data → TowerManager → Geographic Analysis & Filtering',
    '7. Real-time Updates → Event Listeners → UI Widget Synchronization'
]

for i, description in enumerate(flow_descriptions):
    ax.text(1, 4 - (i * 0.4), description, fontsize=10, color='darkblue')

# Component Interaction Indicators
ax.text(19, 12, 'COMPONENT\nINTERACTIONS', fontsize=10, weight='bold', ha='center',
        bbox=dict(boxstyle="round,pad=0.3", facecolor='lightgray'))

# Add small interaction indicators
interaction_arrows = [
    (8, 12.5, 'Routing'),
    (3.5, 9.5, 'Data Flow'),
    (9, 7.5, 'IPC Communication'),
    (8.25, 6.5, 'External APIs')
]

for x, y, label in interaction_arrows:
    ax.text(x + 8, y, label, fontsize=8, ha='center',
            bbox=dict(boxstyle="round,pad=0.2", facecolor='lightyellow'))

# Performance & Architecture Notes
notes_text = '''ARCHITECTURE NOTES:
• Singleton pattern for data managers ensures consistent state
• Event-driven updates for real-time UI synchronization
• IPC communication for secure file system access
• Widget system for modular UI components
• Multi-strategy matching algorithms for metadata integration
• Professional 3D rendering with customizable environment settings'''

ax.text(1, 2.5, notes_text, fontsize=9, verticalalignment='top',
        bbox=dict(boxstyle="round,pad=0.5", facecolor='#F0F8FF', alpha=0.8))

plt.tight_layout()
plt.savefig('D:/UST/Itwin/desktop/ARCHITECTURE_FLOWCHART.png', 
            dpi=300, bbox_inches='tight', facecolor='white')
plt.show()

print("✅ Architecture flow chart created successfully!")
print("📁 Saved as: D:/UST/Itwin/desktop/ARCHITECTURE_FLOWCHART.png")