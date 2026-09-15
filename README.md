# Geospatial Web Application

A web-based geospatial platform for disaster risk management, hazard mapping, community reporting, and environmental analysis. The application supports role-based access for Admins, Officers/Researchers, and Citizens, along with offline report submission capabilities.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Installation & Setup](#step-by-step-installation--setup)
3. [Project Directory Structure](#project-directory-structure)
4. [Front-End Components & Structure](#front-end-components--structure)
5. [Back-End & Data Layer Integration](#back-end--data-layer-integration)
6. [Available Scripts](#available-scripts)

---

## Prerequisites

Before running the application, ensure you have the following installed on your machine:

- **Node.js**: v18.0.0 or higher recommended ([Download Node.js](https://nodejs.org/))
- **npm**: v9.0.0 or higher (comes bundled with Node.js)
- **Git**: For version control ([Download Git](https://git-scm.com/))
- **Supabase Account**: An active Supabase project for backend authentication and database storage.

---

## Step-by-Step Installation & Setup

Follow these steps to set up and run the project locally.

### Step 1: Navigate to the Project Root

Open your terminal and enter the project directory:

```bash
cd Geospatial_Web_App
```

### Step 2: Install Dependencies

Navigate into the front-end application directory and install package dependencies:

```bash
cd frontend/geospatial-app-vite
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file in the `frontend/geospatial-app-vite/` directory:

```bash
touch .env
```

Add your Supabase URL and Anonymous Key to the `.env` file:

```env
VITE_SUPABASE_URL=https://your-supabase-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 4: Run the Development Server

Start the local development server:

```bash
npm run dev
```

Open your browser and navigate to the local URL provided in the terminal output (typically `http://localhost:5173`).

---

## Project Directory Structure

```text
Geospatial_Web_App/
├── README.md
├── package.json
├── package-lock.json
└── frontend/
    └── geospatial-app-vite/
        ├── index.html
        ├── package.json
        ├── tsconfig.json
        ├── vite.config.ts
        ├── vercel.json
        ├── public/
        └── src/
            ├── App.tsx
            ├── main.tsx
            ├── components/
            ├── pages/
            ├── hooks/
            ├── libr/
            ├── services/
            ├── context/
            ├── constants/
            ├── styles/
            ├── types/
            ├── usertype/
            └── utils/
```

---

## Front-End Components & Structure

The front-end user interface is built using **React 18**, **TypeScript**, **Vite**, and **Leaflet / React-Leaflet** for interactive map rendering.

### 1. `src/pages/` (Role-Based Page Views)
- **`admin/`**: Admin portal and management dashboards.
  - `DashboardPage.tsx`: High-level system statistics and analytics summary.
  - `UserMgmtPage.tsx`: User accounts, permissions, and role assignments.
  - `ReportsMgmtPage.tsx`: Verification and management of submitted community reports.
  - `CmsPage.tsx`: Content management for public announcements and preparedness guides.
  - `SysMonitoringPage.tsx`: System logs, metrics, and health monitoring.
- **`citizen-guest/`**: Views designed for registered citizens and public guests.
  - `NotificationPage.tsx`: Real-time notifications and community alert feeds.
  - `ProfileComponents/`: Citizen profile settings and account information.
- **`citizen-pwa/`**: Mobile-first interface with Progressive Web App features.
  - `PWAView.tsx`: Simplified mobile view for submitting incident reports online or offline.
- **`officer-researcher/`**: Specialized interface for field officers and researchers.
  - `DashboardMapPage.tsx`: Advanced GIS map workspace with custom overlays.
  - `ReportVerifyPage.tsx`: Incident report verification queue and assessment tools.
  - `HomePage.tsx`: Main portal dashboard for field officers.
- **`shared/`**: Views accessible across multiple user roles.
  - `CommunityFeedPage.tsx`: Public feed displaying community hazard posts.
  - `EvacCenterPage.tsx`: Map and listing of active evacuation centers.
  - `PrepGuidePage.tsx`: Disaster response guidelines and educational resources.
  - `SettingsPage.tsx`: Application preferences and account configuration.

### 2. `src/components/` (Reusable UI Components)
- **`ui/`**: Interface components and visual elements.
  - `LeafletMap.tsx`: Core Leaflet map viewer supporting custom tile layers and markers.
  - `AnalyticsCharts.tsx`: Charting visualizations built with Recharts.
  - `ResearcherRequestsTab.tsx` & `VerificationRequestsTab.tsx`: Data tables for processing requests.
  - `mapLayers/`: GIS data layers (hazard zones, risk indices, evacuation points).
  - `Modals/`: Interactive dialog windows.
  - `Navigations/`: Header bars and navigation drawers.
- **`reports/`**: PDF and document generation tools.
  - `EnvironmentalReportTemplate.tsx`: Standardized environmental analysis report generator.
- **`auth/`**: Route security.
  - `ProtectedRoute.tsx`: Guard component restricting access based on user role and authentication status.

### 3. `src/hooks/` (Custom React Hooks)
- `useHazardData.ts`: Fetches active spatial hazard datasets.
- `useCalamityRiskData.ts`: Manages calamity risk scores and location parameters.
- `useGreenIndexData.ts` & `useUniversalIndexData.ts`: Computes environmental vegetation and risk indices.
- `useOfflineReports.ts`: Connects local offline report storage to React component state.

### 4. `src/context/` (State Management)
- `AuthContext.tsx`: Global authentication context handling login state, active sessions, and user permissions.

---

## Back-End & Data Layer Integration

The application utilizes **Supabase** as its Backend-as-a-Service (BaaS) for database, auth, and API needs, paired with **IndexedDB** for offline storage.

### 1. Supabase Backend Services (`src/libr/`)
- **`supabaseClient.ts`**: Configures and exports the Supabase client instance using `.env` credentials.
- **`auth.ts` & `DbAuth.ts`**: Handles authentication workflows including user sign-in, signup, session validation, and password operations.
- **`fetchCurrentUser.ts`**: Retrieves authenticated user profile records from the database.
- **`evacCentersApi.ts`**: Fetches evacuation center records, occupancy stats, and spatial coordinates.

### 2. Offline Data Storage & Synchronization (`src/libr/` & `src/services/`)
- **`offlineDB.ts`**: Initializes client-side IndexedDB databases via the `idb` library.
- **`offlineReportsDB.ts`**: Stores report data locally when the user has no network connectivity.
- **`syncFallback.ts`**: Syncs cached offline reports to Supabase when network connectivity returns.
- **`hazardService.ts`**: Service for querying and caching hazard datasets.

---

## Available Scripts

Run these commands inside `frontend/geospatial-app-vite`:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server |
| `npm run build` | Builds production-ready static assets in `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs ESLint syntax and code quality checks |