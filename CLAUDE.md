# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XML Prompt Builder is a React-based visual tool for creating structured XML prompts for AI systems. It allows users to build complex XML structures through an intuitive interface, with real-time preview and drag-and-drop functionality.

## Development Commands

- **Development server**: `npm run dev` (starts Vite dev server on port 8080)
- **Build**: `npm run build` (production build)
- **Development build**: `npm run build:dev` (development mode build)
- **Lint**: `npm run lint` (ESLint checking)
- **Preview**: `npm run preview` (preview production build)

## Architecture

### Core Components Structure

- **PromptBuilder** (`src/components/PromptBuilder.tsx`): Main component managing XML element state and rendering the two-panel interface
- **ElementTree** (`src/components/ElementTree.tsx`): Left panel showing hierarchical XML element structure with edit controls
- **ElementEditor** (`src/components/ElementEditor.tsx`): Editor panel for modifying selected element properties
- **HelpDialog** (`src/components/HelpDialog.tsx`): User guidance dialog

### Key Data Structures

The application centers around the `XMLElement` interface:
```typescript
interface XMLElement {
  id: string;
  tagName: string;
  content: string;
  children: XMLElement[];
  collapsed?: boolean;
  isVisible?: boolean;
}
```

### Core Libraries & Architecture

- **UI Framework**: React 18 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **Styling**: Tailwind CSS with custom brutalist design system
- **UI Components**: shadcn/ui components with Radix UI primitives
- **State Management**: React useState (no external state management)
- **Routing**: React Router DOM (minimal routing - Index and NotFound pages)
- **XML Processing**: Custom loose XML parser (`src/lib/loose-xml.ts`)

### File Structure Logic

- `src/components/ui/`: Reusable UI components from shadcn/ui
- `src/lib/`: Utility functions including XML parsing and token estimation
- `src/hooks/`: Custom React hooks
- `src/pages/`: Route components (Index, NotFound)

### Import Alias

The project uses `@/*` alias mapping to `./src/*` - always use this for internal imports.

### Special Features

1. **Loose XML Parser**: Ultra-tolerant parser in `loose-xml.ts` that handles malformed XML gracefully
2. **Token Estimation**: Built-in token counting for AI prompt length estimation
3. **Drag & Drop**: File import support for XML/text files
4. **Real-time Preview**: Live XML generation as users build structure
5. **Element Visibility**: Toggle elements in/out of final XML output

### TypeScript Configuration

- Relaxed TypeScript settings: `noImplicitAny: false`, `strictNullChecks: false`
- Uses composite project structure with app and node configurations

### Styling Conventions

- **Design System**: Brutalist/neo-brutalist with black borders and bold shadows
- **Colors**: Green theme (#9AE66E, #76B947) with black accents
- **Typography**: Bold weights, stroke-[3] for icons
- **Layout**: Card-based with heavy shadows and borders