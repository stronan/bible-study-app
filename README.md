# Bible Study App

A TypeScript/React application for Bible study that retrieves passage text with surrounding context, provides navigation between passages, and includes a side panel for taking formatted notes.

Built on the [IQ Bible API](https://iqbible.com) which provides access to 1,400+ Bible translations.

## Features

- **Multi-reference input** — Enter multiple Bible references separated by commas or newlines (e.g., `John 3:16`, `Romans 8:28-30`, `Genesis 1:1-5`)
- **Context verses** — Surrounding verses shown alongside the requested passage with visual distinction (context is dimmed, target is emphasized)
- **Bible version selection** — Choose from English translations fetched from the API (cached for performance)
- **Context size control** — Adjustable context window (0, 3, 5, 10, or 15 verses before/after)
- **Navigation** — Previous/next buttons to move between loaded passages
- **Notes panel** — Side panel with rich text editing (bold, italic, underline, bullet lists) and localStorage persistence
- **Words of Jesus** — Red-letter highlighting where available (versions with `words_of_jesus_count > 0`)
- **Rate limit awareness** — Status bar shows remaining API quota

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+)
- An [IQ Bible API](https://iqbible.com) key (free tier available for non-commercial use)

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Add your IQ Bible API key to `.env`:

```
VITE_IQBIBLE_API_KEY=your_key_here
```

Alternatively, you can enter the API key at runtime via the settings button in the app header — it will be stored in `localStorage`.

### Development

```bash
npm run dev
```

Vite starts a dev server at `http://localhost:3000`.

### Build

```bash
npm run build
```

Produces a production build in `dist/`.

### Linting & Type Checking

```bash
npm run lint      # ESLint
npm run typecheck # TypeScript type checking
```

## Usage

1. Enter one or more Bible references in the input area
2. Click **"Load Passages"** (or press `Ctrl+Enter`)
3. Use the navigation buttons to move between passages
4. Write notes in the side panel — they auto-save to `localStorage` keyed by passage reference and Bible version

### Reference Formats

| Format | Example |
|--------|---------|
| Single verse | `John 3:16` |
| Verse range | `Romans 8:28-30` |
| Multi-verse range | `Genesis 1:1-5` |
| Multiple refs (newlines) | `John 3:16\nRomans 8:28` |
| Multiple refs (commas) | `John 3:16, Romans 8:28` |

Book names can be full names ("Genesis"), USFM codes ("GEN"), or common abbreviations ("Gen").

## Architecture

### Context Algorithm

1. Parse each user reference via the public `/parse/citation` endpoint (no API key required — doesn't count against quota)
2. Fetch the book's chapter/verse metadata from `/bibles/{version}/{book}/meta` to determine actual verse counts
3. Calculate context range: `start = max(1, requestedStart - contextSize)`, `end = min(chapterVerseCount, requestedEnd + contextSize)`
4. Fetch the full range as a single API call: `/bibles/{version}/{book}/{chapter}/{start}-{end}?include=words_of_jesus`
5. Render context verses dimmed, target verses emphasized, and Words of Jesus in red

### Data Flow

- **Versions** and **book lists** are cached in Maps to avoid repeated API calls
- **Book metadata** (chapter/verse counts) is cached per version+book
- **Notes** are stored in `localStorage` keyed by `${version}:${book}:${chapter}:${startVerse}-${endVerse}`
- **Rate limit headers** (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Remaining-Month`) are tracked and displayed

### API Key Security

- The API key is read from `VITE_IQBIBLE_API_KEY` at build time (Vite injects it)
- Users can also set it at runtime via the settings modal — stored in `localStorage` only
- The key is sent as the `X-IQBible-API-Key` header on all authenticated requests
- The `/parse/citation` endpoint is public and requires no key

## Project Structure

```
bible-study-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.mjs
├── .env.example
├── src/
│   ├── main.tsx          # React entry point
│   ├── App.tsx           # Main component: state management & data flow
│   ├── api.ts            # IQ Bible API client & types
│   ├── utils.ts          # Parsing, context calculation, key helpers
│   ├── notes.ts          # localStorage notes persistence
│   ├── styles.css        # Application styles
│   └── components/
│       ├── HeaderBar.tsx
│       ├── StatusBar.tsx
│       ├── InputArea.tsx
│       ├── PassageDisplay.tsx
│       └── NotesPanel.tsx
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## License

This project uses the IQ Bible API which is suitable for non-commercial use on the free tier. See the [IQ Bible API licensing page](https://api.iqbible.com/licensing.md) for details.
