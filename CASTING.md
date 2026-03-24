# Casting LappyCap to Chromecast

LappyCap streams SomaFM radio through Butterchurn visualizations on your Chromecast or Android TV. Here's how to start casting from every platform.

---

## 🖥️ From Chrome on Desktop

1. Open [https://tangelis.github.io/lappycap/](https://tangelis.github.io/lappycap/) in Chrome
2. The **Cast button** appears in the UI when a Chromecast is detected on your network
3. Click it → select your Chromecast → pick a station and scene
4. The visualizer launches on your TV with audio from SomaFM

**Controls:**
- **⏸ Pause button** — between the ◀ and ▶ preset buttons. Pauses/resumes audio on both desktop and Chromecast.
- **Space** — keyboard shortcut for pause/resume
- **C** — copy shareable link with current scene + station

> Works on Chrome for macOS, Windows, Linux, and ChromeOS.

---

## 📱 From Android Phone

Open the **Remote Control** page in Chrome on your Android phone:

**[https://tangelis.github.io/lappycap/remote.html](https://tangelis.github.io/lappycap/remote.html)**

1. Chrome detects Cast devices on your network and shows the Cast button
2. Tap the **Cast icon** (top right) → select your Chromecast
3. Once connected, you get full controls:
   - **⏸ Pause / ▶ Resume** — big button at the top, hard to miss
   - **Station picker** — choose any SomaFM station
   - **Scene picker** — select a visual scene
   - **Prev / Shuffle / Next** — cycle Butterchurn presets
   - **Volume slider** — control audio volume
   - **Cycle & blend timing** — adjust preset rotation speed

> The remote page is mobile-optimized with big touch targets and a dark theme.

### Pro tip: Add to Home Screen

In Chrome on Android: **⋮ menu → Add to Home screen**. Gives you a full-screen app-like experience with no browser chrome.

---

## 🍎 From iPhone / Safari

Safari does not support the Cast SDK. Your options:

1. **Chrome for iOS** — Open `https://tangelis.github.io/lappycap/remote.html` in Chrome for iOS. The Cast button appears in-page via the SDK. Discovery works best when the Google Home app is installed.

2. **Start from desktop, control from Google Home** — Launch from Chrome on your computer, then use the Google Home app on iPhone to control volume or stop.

---

## 📺 Alternative: Google Home App

Once LappyCap is playing on a Chromecast:

1. Open the **Google Home** app on Android or iOS
2. Your Chromecast appears as an active device
3. Tap it to see volume + stop controls

---

## 🔋 Android TV — Staying Awake

LappyCap is designed to run indefinitely on Android TV without timing out. Three layers of protection:

1. **Screen Wake Lock** — the receiver requests a screen wake lock at startup, preventing the TV OS from dimming or sleeping the display. Auto-retries if the OS releases it.
2. **Aggressive keepalive** — sender pings the receiver every 30 seconds to keep the Cast session alive.
3. **Audio watchdog** — receiver checks every 30s that the stream is still playing. If the stream stalls (Icecast drops, network blip), it reloads and restarts automatically.

> If your TV still sleeps after ~20 minutes, check: **Settings → Device Preferences → Screen saver** and set the sleep timer to "Never" or a longer interval. The wake lock works at the browser/Cast layer; TV-level sleep settings override it on some models.

---

## 🔧 Technical Details

- **Cast App ID:** `8315CD49`
- **Custom namespace:** `urn:x-cast:com.lappycap`
- **Receiver:** Custom Web Receiver (deployed via GitHub Pages)
- **Sender SDK:** CAF (Cast Application Framework) JavaScript SDK
- **Audio:** Direct MP3 streams from SomaFM (CORS-enabled)
- **Visuals:** Butterchurn (MilkDrop WebGL port) running on the Chromecast's browser
- **Pause/Resume:** Synced between sender and receiver via custom messages — the audio watchdog respects intentional pauses and won't fight them
