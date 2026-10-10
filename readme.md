# Morphing Glass Sphere

Interactive 3D visualization featuring a morphing glass sphere, deformed on the GPU with simplex noise.

## Features

- Glass sphere deformed in a vertex shader, with normals recomputed so refraction follows the shape
- Environment mapping and realistic glass material
- Interactive camera controls
- Responsive design

## Setup

1. Download [Node.js](https://nodejs.org/en/download/)
2. Run these commands:

```bash
# Install dependencies
npm install

# Run local server
npm run dev

# Build for production (output in dist/)
npm run build

# Preview the production build
npm run preview
```

Built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/).

## Controls

- Left click + drag: Rotate
- Right click + drag: Pan
- Scroll: Zoom

## Assets

Loaded from `public/textures/`:

- `intro-setup.png` - Background texture
- `empty_warehouse_01_1k.hdr` - Environment map
