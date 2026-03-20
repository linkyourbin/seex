<p align="center">
  <img src="src/assets/seex.svg" alt="SeEx Logo" width="200" />
</p>

<h1 align="center">SeEx</h1>

<p align="center">
  <strong>Seek &amp; Export</strong> — Clipboard Event Tracker
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-E8656C" alt="version" />
  <img src="https://img.shields.io/badge/license-CC%20BY--NC%204.0-F4845F" alt="license" />
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-66BB6A" alt="platform" />
</p>

---

## What is SeEx?

SeEx monitors your clipboard in real time, extracts component IDs using keyword or regex patterns, and exports matched results via the **nlbn** tool. Designed for electronics engineers working with component databases like LCSC.

## Features

- **Real-time clipboard monitoring** — event-driven with polling fallback, catches every copy
- **Keyword & regex matching** — literal substring or `regex:` patterns (e.g. `regex:C\d+`)
- **Retroactive matching** — when you set a keyword, it scans existing history for matches
- **nlbn integration** — batch export matched IDs to the nlbn tool (terminal or background mode)
- **Bilingual UI** — switch between English and Chinese with embedded font support
- **Cross-platform** — runs on Windows, macOS, and Linux

## Screenshots

| Monitor | History | Export | Language |
|---------|---------|--------|----------|
| Keyword input, matched results, clipboard preview | Full clipboard history with copy/delete | nlbn export config and actions | EN / CN toggle |

## Tech Stack

| | Technology | Role |
|---|---|---|
| <img src="src/assets/tauri.svg" width="20" /> | [Tauri](https://tauri.app) | App framework |
| <img src="src/assets/rust.svg" width="20" /> | [Rust](https://www.rust-lang.org) | Backend logic |
| <img src="src/assets/typescript.svg" width="20" /> | [TypeScript](https://www.typescriptlang.org) | Frontend logic |
| <img src="src/assets/vite.svg" width="20" /> | [Vite](https://vite.dev) | Build tooling |

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri CLI](https://tauri.app/start/)

### Development

```bash
npm install
npx tauri dev
```

### Build

```bash
npx tauri build
```

The built binary will be at `src-tauri/target/release/seex.exe` (Windows).

Installers are generated at:
- `src-tauri/target/release/bundle/msi/seex_0.1.0_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/seex_0.1.0_x64-setup.exe`

## Usage

1. Launch SeEx — the default keyword `regex:C\d+` is pre-configured
2. Copy text containing component IDs (e.g. from LCSC website)
3. Matched IDs appear in the **Matched** panel automatically
4. Use **Copy IDs** to copy all matched IDs, or **Export nlbn** to batch export
5. Switch to **History** to view all clipboard entries
6. Switch to **Language** to toggle between English and Chinese

## License

This project is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

Free to use, share, and adapt for non-commercial purposes with attribution.
