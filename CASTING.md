# Casting LappyCap to Chromecast

LappyCap streams SomaFM radio through Butterchurn visualizations on your Chromecast. Here's how to start casting from every platform.

---

## 🖥️ From Chrome on Desktop

1. Open [https://tangelis.github.io/lappycap/](https://tangelis.github.io/lappycap/) in Chrome
2. The **Cast button** appears in the UI when a Chromecast is detected on your network
3. Click it → select your Chromecast → pick a station and scene
4. The visualizer launches on your TV with audio from SomaFM

> Works on Chrome for macOS, Windows, Linux, and ChromeOS.

---

## 📱 From Android Phone

Open the **Remote Control** page in Chrome on your Android phone:

**[https://tangelis.github.io/lappycap/remote.html](https://tangelis.github.io/lappycap/remote.html)**

1. Chrome detects Cast devices on your network and shows the Cast button
2. Tap the **Cast icon** (top right) → select your Chromecast
3. Once connected, you get full controls:
   - **Station picker** — choose any SomaFM station
   - **Scene picker** — select a visual scene
   - **Prev / Shuffle / Next** — cycle Butterchurn presets
   - **Volume slider** — control audio volume
   - **Cycle & blend timing** — adjust preset rotation speed

> The remote page is mobile-optimized with big touch targets and a dark theme. It works great as a phone remote while the Chromecast handles the heavy lifting.

### Pro tip: Add to Home Screen

In Chrome on Android: **⋮ menu → Add to Home screen**. This gives you a full-screen app-like experience with no browser chrome.

---

## 🍎 From iPhone / Safari

Safari does not support the Cast SDK. Your options:

1. **Chrome for iOS** — Open `https://tangelis.github.io/lappycap/remote.html` in Chrome for iOS. The Cast button appears in-page via the SDK. Discovery works best when the Google Home app is installed on the same device.

2. **Start from desktop, control from Google Home** — Launch a session from Chrome on your computer, then use the Google Home app on your iPhone to control volume or stop casting.

> Apple's AirPlay is a separate protocol and not supported by Chromecast.

---

## 📺 Alternative: Google Home App

Once LappyCap is playing on a Chromecast (launched from any sender):

1. Open the **Google Home** app on Android or iOS
2. Your Chromecast appears as an active device
3. Tap it to see playback controls:
   - **Volume** — adjust directly
   - **Stop** — end the cast session
4. The Google Home app sees it as a custom cast session

> This is useful as a secondary control — you still need to launch the session from Chrome first.

---

## 🔧 Technical Details

- **Cast App ID:** `8315CD49`
- **Custom namespace:** `urn:x-cast:com.lappycap`
- **Receiver:** Custom Web Receiver running at the GitHub Pages URL
- **Sender SDK:** CAF (Cast Application Framework) JavaScript SDK
- **Audio:** Direct MP3 streams from SomaFM (CORS-enabled)
- **Visuals:** Butterchurn (MilkDrop WebGL port) running on the Chromecast's browser
