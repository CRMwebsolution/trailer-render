# Pro-Trailer 3D: Procedural Utility Trailer Configurator

A modular, procedural 3D utility trailer configurator web application built with **Three.js**, **Vanilla JavaScript (ES6 modules)**, and **Vite**.

Users can dynamically customize, inspect in real-time, compute key towing kinematics, and export production-ready 3D models (`.glb` format) directly from the browser.

---

## 🚀 Key Features

### 1. Modular Trailer Architecture (OOP Hierarchy)
- **BaseTrailer**: Core chassis, suspension, equalizers, axles, wheels, wiring, and rendering lifecycle.
- **FlatbedTrailer**: Heavy-duty equipment trailer with treated wood or diamond-plate decks, slide-in or fold-flat equipment ramps.
- **DumpTrailer**: Hydraulic dump trailer with interactive upward dumping tilt (42°), underbody scissor hoist linkage, dual barn doors, or 2-way spreader drop gate.
- **CargoTrailer**: Enclosed cargo trailer with aerodynamic wedge V-nose, ATP diamond-plate stone guard, drop-down ramp door or barn doors, and 32" RV side door.

### 2. Physical Towing Kinematics & Clearances
- **60/40 Weight Distribution**: Axle clusters algorithmically positioned to maintain optimum tongue weight across 10ft to 30ft deck lengths.
- **Payload & Axle Classes**: Single Axle (3.5K), 10K Tandem, 14K Heavy Duty Tandem, 20K Dual-Tandem, and 25K Triple Axle with equalizers.
- **Hitch Clearance Analysis**:
  - **Bumper Pull (19" Receiver Height)**: Level receiver hitch coupling.
  - **Gooseneck Tower**: Engineered with specific cab and bed-rail clearances for towing rigs.
- **Breakover & Approach Angles**: Real-time clearance calculations based on deck height and ramp length.

### 3. Fenders & Platform Options
- **Selectable Widths**: 76" (Compact Utility), 83" (Standard Equipment), 96" (Commercial Wide), and 102" (Deck-Over).
- **Fender Styles**:
  - **Regular Teardrop**: Formed outer perimeter lips with center teardrop cusp and open wheel wells.
  - **Heavy Drive-Over Fenders**: 3/16" diamond plate with 35° approach and departure ramps.
  - **Deck-Over**: Elevated flat deck spanning over the wheels with stake pockets and rub rails.

### 4. Environments & Tow Vehicle
- **Studio Lighting Modes**:
  - **Dark CAD**: Technical blueprint dark environment with millimeter engineering grid.
  - **White Studio**: Clean infinity floor commercial photography studio.
  - **Luxury Showroom**: Polished epoxy display turntable with brushed aluminum rim, cyan LED halo perimeter ring, overhead studio softbox light banks, and focused spotlights.
- **Tow Vehicle**:
  - Built-in procedural 2016 Ford F-250 SRW Crew Cab 6.5ft Bed.
  - **Custom 3D Truck Support**: Load any external `.glb` or `.gltf` 3D truck model via UI file picker or by placing it in `public/models/truck.glb`.

### 5. GLTF/GLB Export
- Export customized trailer assemblies directly to standard `.glb` format for CAD, AR/VR, or 3D rendering.

---

## 🛠️ Tech Stack
- **Frontend**: HTML5, Modern CSS3, Vanilla ES6 JavaScript modules
- **3D Graphics**: Three.js (r173) with OrbitControls and GLTFExporter
- **Build Tool**: Vite 6

---

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone git@github.com:CRMwebsolution/trailer-render.git

# Navigate to project directory
cd trailer-render

# Install dependencies
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Run Unit Tests
```bash
npm test
```

---

## 📄 License
MIT License
