# ShieldGrid Desktop Agent

Professional desktop application for system optimization, cache cleaning, and security monitoring.

## Features

- **Security Scanner**: Real vulnerability scanning with pattern detection
- **Cache Cleaner**: Multi-platform cache cleaning (browser, system, temp files)
- **System Optimizer**: Performance optimization for Windows, macOS, and Linux
- **Remote Management**: Connected to ShieldGrid platform for remote commands
- **Auto Updates**: Automatic update checking and installation
- **System Tray**: Runs in background with quick access menu

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
cd desktop-agent
npm install
```

### Running in Development

```bash
npm run dev
```

### Building for Production

```bash
# Build for all platforms
npm run dist

# Build for specific platform
npm run dist:win
npm run dist:mac
npm run dist:linux
```

## Project Structure

```
desktop-agent/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # App entry point
│   │   ├── preload.ts  # Context bridge
│   │   └── services/   # Core services
│   │       ├── scanner.ts    # Security scanning
│   │       ├── cache.ts      # Cache management
│   │       ├── optimizer.ts  # System optimization
│   │       ├── api.ts        # Platform API client
│   │       └── telemetry.ts  # Usage analytics
│   ├── renderer/       # React frontend
│   │   ├── App.tsx     # Main app component
│   │   ├── pages/      # Page components
│   │   └── index.css   # Styles
│   └── shared/         # Shared types
├── assets/             # App icons and resources
├── .github/workflows/  # CI/CD pipelines
└── package.json
```

## GitHub Actions

Releases are automatically built when a tag is pushed:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This triggers the build workflow which:
1. Builds for Windows, macOS, and Linux
2. Creates a GitHub release with all artifacts
3. Notifies the platform API of the new release

## License Activation

1. Get a license key from your ShieldGrid dashboard
2. Open the agent and go to Settings
3. Enter your license key and click Activate
4. The agent will authenticate with the platform

## Platform Integration

The agent connects to the ShieldGrid platform for:
- License validation
- Remote command execution
- Telemetry reporting
- Update notifications

Configure the API URL in development:

```bash
export API_URL=https://your-platform.com/api
```
