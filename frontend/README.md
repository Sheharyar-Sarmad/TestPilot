
# TestPilot AI — Frontend

**One file. One fix. Verified.**

TestPilot AI is a modern AI-powered code debugging and verification platform built to transform code issues into tested, human-reviewable fixes through an interactive developer experience.

## Design System

TestPilot AI combines three visual styles into a distinctive developer-focused interface:

- **Brutalism** — Bold typography, sharp contrast, strong borders, and expressive layouts.
- **Liquidism** — Fluid transitions, dynamic motion, and smooth interface interactions.
- **Claymorphism** — Soft dimensional surfaces, rounded elements, and tactile UI components.

The result is a cinematic, high-contrast interface that balances experimental aesthetics with practical developer tooling.

## Key Features

- **Real-Time SSE Streaming** — Displays live job progress, agent activity, and execution events without repeatedly polling the backend.
- **Monaco Code Editor** — Provides a VS Code-inspired editing experience with syntax highlighting and an interactive code workspace.
- **Cinematic GSAP Loader** — Uses expressive, timeline-based animations to create an engaging loading experience.
- **Framer Motion** — Powers smooth transitions, interactive components, and responsive micro-interactions.
- **Responsive Interface** — Delivers a consistent experience across desktop and mobile screens.
- **TypeScript** — Improves reliability through static typing and maintainable component contracts.
- **Next.js App Router** — Organizes pages and layouts using modern Next.js routing conventions.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Code Editing:** Monaco Editor
- **Animations:** Framer Motion, GSAP
- **Backend Communication:** REST API, Server-Sent Events (SSE)
- **Package Manager:** pnpm

## Local Setup

### Prerequisites

- Node.js
- pnpm
- Access to the TestPilot AI backend

### 1. Clone the Repository

```bash
git clone <repository-url>
cd frontend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the frontend root and configure the backend API URL.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Adjust the variable name and URL to match your application configuration.

### 4. Start the Development Server

```bash
pnpm dev
```

Open `http://localhost:3000` in your browser.

## Deployment

Live App Deployment Link: [Insert Link Here]
