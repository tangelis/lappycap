# LappyCap Android Remote

A native Android remote control for [LappyCap](https://tangelis.github.io/lappycap/receiver.html) — a Butterchurn/Milkdrop music visualizer that runs on Chromecast.

The app doesn't play audio itself. It's purely a remote control that sends JSON messages to the LappyCap custom receiver over the Google Cast channel.

## Setup

### Prerequisites
- Android Studio Hedgehog (2023.1.1) or later
- Android SDK 34
- A Chromecast on the same Wi-Fi network as your phone

### Open in Android Studio
1. Open Android Studio
2. **File → Open** → select the `android/` folder
3. Let Gradle sync (it will download dependencies automatically)
4. Connect your phone or start an emulator
5. Click **Run ▶**

### Build from command line
```bash
cd android/
./gradlew assembleDebug
# APK output: app/build/outputs/apk/debug/app-debug.apk
```

## Architecture

- **Single Activity** with Jetpack Compose UI
- **Cast SDK** for Chromecast discovery and session management
- **Custom namespace** (`urn:x-cast:com.lappycap`) for sending JSON control messages

## Cast App ID

The Cast App ID `8315CD49` is already registered in the Google Cast Developer Console. No additional setup needed — just make sure your Chromecast is on the same Wi-Fi as your phone and the Cast button will discover it.

## Message Protocol

The app sends these JSON messages to the receiver:

| Type | Description |
|------|-------------|
| `load` | Load a radio station + scene (starts playback) |
| `scene` | Switch to a different scene |
| `next` | Next preset |
| `prev` | Previous preset |
| `shuffle` | Random preset |
| `settings` | Update cycle/blend duration and volume |

## SomaFM Stations

16 curated SomaFM internet radio stations are included, from Groove Salad to Vaporwaves.

## Scenes

8 Butterchurn preset scenes: Sunday Morning Vibes, Deep Space Radio, Fractal Cathedral, Disco Supernova, Neon Meltdown, The Dark Forge, Psych Ward, and Ocean Dreams.
