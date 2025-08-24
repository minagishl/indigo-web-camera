# Indigo Web Camera

A web-based camera application built with Preact and TypeScript, featuring advanced camera controls, photo capture, and gallery management.

> **Note:** Initially, I thought this application was working properly, but it actually wasn't. However, I don't want to fix it now, so I'm publishing it as-is and archiving it.

## Features

- Real-time camera preview
- Advanced camera controls (ISO, shutter speed, white balance)
- Responsive design for mobile and desktop
- Photo capture and gallery management
- Customizable camera settings
- Manual exposure controls
- Multiple camera modes
- Local storage with IndexedDB

## Technologies Used

- **Frontend**: Preact + TypeScript
- **Build Tool**: Vite
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB for local data persistence

## Installation

1. Clone the repository:

```bash
git clone https://github.com/minagishl/indigo-web-camera.git
cd indigo-web-camera
```

2. Install dependencies:

```bash
pnpm install
```

3. Start the development server:

```bash
pnpm dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Camera Access**: Allow camera permissions when prompted
2. **Photo Capture**: Use the capture button to take photos
3. **Manual Controls**: Adjust camera settings using the manual controls panel
4. **Gallery**: View captured photos in the gallery modal
5. **Settings**: Customize application preferences in the settings panel

## Project Structure

```
src/
├── components/                  # Preact components
│   ├── CameraApp.tsx            # Main application component
│   ├── CameraControls.tsx       # Camera control buttons
│   ├── CameraModeSelector.tsx   # Camera mode selection
│   ├── GalleryModal.tsx         # Photo gallery modal
│   ├── LogPanel.tsx             # Application logs
│   ├── ManualControlsPanel.tsx  # Manual camera controls
│   ├── SettingsPanel.tsx        # Settings configuration
│   └── StatusBar.tsx            # Status information
├── hooks/                       # Custom Preact hooks
│   ├── useAdvancedCapture.ts    # Advanced capture logic
│   ├── useCamera.ts             # Camera management
│   ├── useCameraMode.ts         # Camera mode handling
│   ├── useCapture.ts            # Photo capture logic
│   ├── useManualControls.ts     # Manual controls logic
│   ├── usePhotos.ts             # Photo management
│   └── useSettings.ts           # Settings management
├── types/                       # TypeScript type definitions
├── utils/                       # Utility functions
└── main.tsx                     # Application entry point
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

This project is archived and not accepting contributions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
