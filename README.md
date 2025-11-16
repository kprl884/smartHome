# SmartHome

macOS menu bar application for managing Govee lights and devices.

## Features

- ✅ Device list and status tracking
- ✅ Device on/off control (toggle switch)
- ✅ Color selection (RGB color picker and preset colors)
- ✅ Brightness control (slider)
- ✅ Scenario management and execution
- ✅ Timers (turn on/off at specific times)
- ✅ Device groups for bulk control
- ✅ MQTT integration for real-time status updates
- ✅ Demo devices for testing and development
- ✅ Modern and user-friendly interface
- ✅ Scrollable device list
- ✅ Menu bar menu and quit option

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smarthome
```

2. Install dependencies:
```bash
npm install
```

3. Add your Govee API key to the `.env` file:
```bash
echo "GOVEE_API_KEY=your-api-key-here" > .env
```

**Note:** The `.env` file is in `.gitignore` and will not be committed to git.

4. Build the application:
```bash
npm run build
```

5. Run the application:
```bash
npm start
```

## Development

To run in development mode (with DevTools):
```bash
npm run electron:dev
```

For TypeScript compilation in watch mode:
```bash
npm run dev
```

## Packaging

To create a DMG file for macOS:
```bash
npm run dist:mac
```

For all platforms:
```bash
npm run dist
```

## Govee API Key

You need a Govee API key to use the application:

1. Open the Govee Home app
2. Go to the Account page (person icon in the bottom right)
3. Click the gear icon in the top right
4. Select "API Key Application" and fill out the form
5. After receiving your API key:
   - Add it to `.env` file: `GOVEE_API_KEY=your-api-key`
   - Or enter it in the app's settings section

**Security:** Never commit your API key to the git repository. The `.env` file is already in `.gitignore`.

## Demo Devices

The application includes demo devices so you can test it even without real devices:
- Living Room Light (color and brightness control)
- Bedroom Light (color and brightness control)
- Kitchen Light (brightness control only)
- Study Room Light (color and brightness control)

Demo devices are always shown and all controls work (stored in local state).

## Usage

### Menu Bar Menu
- **Right-click** the menu bar icon → Context menu opens
- **Settings**: Opens the window and shows the settings panel
- **Quit**: Closes the application

### Settings Panel
- Click the ⚙️ button in the header to open the settings panel
- You can enter or update your API key here
- Use the **Quit** button to exit the application

### Device Control
- **Toggle Switch**: Turn device on/off
- **Brightness Slider**: Adjust brightness (1-100%)
- **Color Picker**: RGB color selection
- **Color Presets**: Preset buttons for quick color selection

## Tests

End-to-end tests can be run using the native Node.js test runner:

```bash
npm test
```

To run tests in watch mode:
```bash
npm run test:watch
```

Tests check:
- Fetching all devices
- Fetching state information for each device
- Device details (device info + state) fetching
- Invalid device handling
- Request ID interceptor functionality
- Filtering light devices
- Device on/off control
- MQTT integration with real-time status updates

## Project Structure

```
smarthome/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # UI (HTML, CSS, TypeScript)
│   └── api/            # Govee API client
├── lib/                # Node.js API client (for tests)
├── tests/              # End-to-end tests
├── dist/               # Compiled files (gitignore)
└── docs/               # API documentation
```

## Technologies

- **Electron** - Cross-platform desktop application framework
- **TypeScript** - Type-safe JavaScript
- **Govee Cloud API** - Device control and status tracking
- **MQTT** - Real-time device status updates
- **menubar** - macOS menu bar application wrapper
- **Node.js Test Runner** - Native test framework

## Security Notes

- Store your API key in the `.env` file
- The `.env` file is in `.gitignore` and will not be committed
- Never upload your API key to public repositories
- The API key is stored in localStorage within the app (local only)

## License

MIT
