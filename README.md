# Daggerboard

A desktop companion app for Daggerheart game masters. Track entities (enemies and NPCs), countdown trackers, and fear levels across campaigns.

## Features

- **Entity Management**: Create and manage enemies and NPCs with HP tracking and damage thresholds
- **Countdown Trackers**: Visual countdown timers with urgency states and tick labels
- **Fear Tracker**: Track the party's fear level
- **Player View**: A separate window for players showing visible entities and countdowns
- **Campaign System**: Organize all data by campaign with easy switching
- **Dark Mode**: Automatic dark mode support based on system preferences

## Prerequisites

Before building Daggerboard, ensure you have the following installed:

### System Requirements

- **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)
- **Tauri CLI** - Install via Cargo (see below)
- **Platform-specific dependencies** - See [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/)

> **Note**: This project uses vanilla JavaScript web components with no build step. Node.js is not required.

### macOS

```bash
xcode-select --install
```

### Windows

- [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 10/11)

### Linux (Debian/Ubuntu)

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/daggerboard.git
cd daggerboard
```

2. **Install the Tauri CLI**

```bash
cargo install tauri-cli
```

3. **Rust dependencies** will be installed automatically on first build.

## Development

Run the app in development mode with hot-reload:

```bash
cargo tauri dev
```

This will:
- Compile the Rust backend
- Open the app window
- Watch for file changes and reload automatically

## Building for Production

Build a release version of the app:

```bash
cargo tauri build
```

The built application will be in:
- **macOS**: `src-tauri/target/release/bundle/dmg/` and `src-tauri/target/release/bundle/macos/`
- **Windows**: `src-tauri/target/release/bundle/msi/` and `src-tauri/target/release/bundle/nsis/`
- **Linux**: `src-tauri/target/release/bundle/deb/` and `src-tauri/target/release/bundle/appimage/`

### Build Options

Build for a specific target:

```bash
# Debug build (faster, larger)
cargo tauri build --debug

# Specific bundle format
cargo tauri build --bundles dmg
cargo tauri build --bundles msi
cargo tauri build --bundles deb
```

## Project Structure

```
daggerboard/
├── src/                          # Frontend source
│   ├── components/               # Web components
│   │   ├── base/                 # Base component class
│   │   ├── features/             # Feature-specific components
│   │   │   ├── campaign/         # Campaign management
│   │   │   ├── countdown/        # Countdown trackers
│   │   │   ├── entity/           # Entity (enemy/NPC) management
│   │   │   └── fear-tracker/     # Fear level tracking
│   │   ├── feedback/             # Flash/pulse animations
│   │   ├── layout/               # Layout components
│   │   ├── overlays/             # Modals, dropdowns, dialogs
│   │   └── ui/                   # Reusable UI primitives
│   ├── helpers/                  # Utility functions
│   ├── pages/                    # HTML entry points
│   │   ├── dashboard/            # GM dashboard
│   │   ├── player-view/          # Player-facing view
│   │   └── settings/             # Campaign settings
│   └── styles/                   # Global styles and tokens
│       ├── base/                 # Base element styles
│       ├── shared/               # Shared animations, scrollbars
│       └── tokens/               # Design tokens (light/dark)
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri commands
│   │   └── modules/              # Backend modules
│   │       ├── campaign.rs       # Campaign CRUD
│   │       ├── countdown.rs      # Countdown tracker CRUD
│   │       ├── database.rs       # SQLite connection
│   │       ├── entity.rs         # Entity CRUD
│   │       ├── error.rs          # Error types
│   │       ├── fear_tracker.rs   # Fear level management
│   │       └── migration.rs      # Database migrations
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
└── package.json                  # Node.js dependencies
```

## Data Storage

Daggerboard stores data in a SQLite database located at:

- **macOS**: `~/Library/Application Support/com.justin.daggerboard/daggerboard.db`
- **Windows**: `%APPDATA%\com.justin.daggerboard\daggerboard.db`
- **Linux**: `~/.local/share/com.justin.daggerboard/daggerboard.db`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Tauri Extension](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Troubleshooting

### Build fails with Rust errors

Ensure you have the latest stable Rust:

```bash
rustup update stable
```

### WebView not found (Linux)

Install WebKitGTK:

```bash
sudo apt install libwebkit2gtk-4.1-dev
```

### App crashes on startup

Check the database location is accessible and not corrupted. You can reset by deleting the database file (see Data Storage section above).

## License

[Add your license here]
