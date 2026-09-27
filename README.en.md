<div align="center">
  <img src="logo.png" alt="Dubly logo" width="112">
  <h1>Dubly</h1>
  <h3>Every sound in your browser, in your language.</h3>
  <p>An open-source Chrome extension for live dubbing, audio translation, Floating Captions, and Voice Typing with your own API key.</p>
  <p>
    <a href="README.md">🇮🇷 فارسی</a>
    &nbsp;•&nbsp;
    <a href="README.en.md">🇬🇧 English</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Manifest-V3-4285F4?logo=googlechrome&logoColor=white" alt="Manifest V3">
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-7C3AED" alt="MIT License"></a>
    <img src="https://img.shields.io/badge/Chrome-116%2B-34A853?logo=googlechrome&logoColor=white" alt="Chrome 116+">
    <img src="https://img.shields.io/badge/Version-0.9.28-8B5CF6" alt="Dubly 0.9.28">
  </p>
  <p>
    <a href="https://chromewebstore.google.com/detail/dubly/fendjlfddioginhjfehfchdmoddlbnlp"><strong>Install from the Chrome Web Store</strong></a>
  </p>
</div>

---

## What is Dubly?

Dubly captures audio playing in a selected Chrome tab and returns the translation as dubbed speech or Floating Captions within the same browsing experience. You do not need to download an audio or video file, upload it to another service, or leave the current page.

Dubly is not tied to one platform such as YouTube. It is designed for any accessible tab whose audio Chrome allows the extension to capture. Video is optional; an audio player can also be the translation source.

Typical uses include YouTube, X / Twitter, Instagram, live streams, webinars, online courses, podcasts, interviews, audio players, and news websites. Chrome internal pages, the Chrome Web Store, and some protected content may not be capturable or scriptable because of browser security restrictions.

## Usage modes

| Mode | Experience |
| --- | --- |
| **Dubbing only** | Plays the live translated voice without displaying Floating Captions. |
| **Captions only** | Displays the translation as Floating Captions while dubbed audio can be reduced or muted. |
| **Dubbing and captions** | Provides translated speech together with translated captions. |

### Original and dubbed audio

Dubly provides independent controls for original tab audio and dubbed audio. Keep the source audio in the background, reduce it, mute it entirely, and set the dubbed volume separately.

## Core features

### Live AI dubbing

Dubly captures audio from the selected tab while it plays and returns live speech translation. The content is translated and dubbed where it is already playing, without downloading or uploading a file.

### Built for live content

Because Dubly uses the tab's audio as its input, it can be used with live streams, webinars, live podcasts, live interviews, and event broadcasts. The source does not need to be a prerecorded file or video.

### Support for 78 languages

Users can select a translation and dubbing target from the 78 languages listed in the [official Gemini Live Translation documentation](https://ai.google.dev/gemini-api/docs/live-api/live-translate#supported-languages).

### Floating Captions

Floating Captions is a core, stable Dubly feature. Translated text can appear over the page and during fullscreen playback, either by itself or together with dubbing.

### Independent volume control

Original Audio and Dubbed Audio have separate controls, allowing each user to set the balance that works for the content they are watching or hearing.

### Voice Typing / Speech-to-Text

Alongside tab translation and dubbing, Dubly can turn the user's microphone speech into text. Recording begins only after the user starts it.

### Floating Voice Typing control

The movable floating Voice Typing control lets users start and stop recording, inspect the transcript, copy it, delete it, or insert it into the selected field. It supports text `input` fields, `textarea` elements, and `contenteditable` elements, and keeps essential actions available when minimized.

### Bring Your Own Key

Dubly uses the BYOK model. The user supplies a personal Google API key, and the extension uses that key to connect directly to Google Gemini. API usage and quota belong to the user's Google account.

### No Dubly account

Using the extension does not require signing up, logging in, or creating a Dubly account.

### Local storage

The API key, settings, preferences, and Dubly activity statistics are kept in the extension's local storage on the user's device and are not synced through the Chrome account.

### Persian and English interface

The extension interface and Floating Voice Typing control support Persian and English.

### Light, dark, and system themes

Users can choose Light Mode, Dark Mode, or System Theme.

### Sessions continue after the popup closes

Audio processing runs in a Chrome Offscreen Document, so closing the popup alone does not stop an active session. A session continues until the user stops it, the selected time limit is reached, or the capture source ends.

## Why Dubly?

Dubly reduces the friction between users and foreign-language audio. Translation, dubbing, and captions stay beside the content being consumed in the browser, without a chain of file downloads, uploads to another tool, or waiting for an entire file to finish processing.

- No file upload
- No need to leave the content page
- Suitable for live content and audio without video
- Not tied to one website
- Dubbing-only, captions-only, or combined use
- Independent original and dubbed audio controls
- Direct connections with the user's own API key

## Where can Dubly help?

- Watching a foreign-language YouTube video
- Following a live stream or an X live session
- Listening to a foreign podcast or interview
- Joining a webinar or online course
- Following a live event broadcast
- Translating an audio player or audio-only webpage
- Reading translated captions without dubbing
- Listening to dubbing while reading captions
- Writing on the web with Voice Typing

## Installation

### Install from the Chrome Web Store

The recommended installation method for most users is the published store version:

**[Install Dubly from the Chrome Web Store](https://chromewebstore.google.com/detail/dubly/fendjlfddioginhjfehfchdmoddlbnlp)**

### Manual installation

There is currently no separate GitHub Release. To install the current source:

1. Open the **Code** menu on GitHub and select **Download ZIP**.
2. Extract the ZIP file.
3. Open `chrome://extensions` in Chrome.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted project directory.

### Install for development

Use this method to inspect the source, develop the extension, or contribute:

```bash
git clone https://github.com/crypttopia/Dubly.git
cd Dubly
```

Then open `chrome://extensions`, choose **Load unpacked**, and select the repository directory.

## Quick start

1. Install Dubly.
2. Get a Google API key from [Google AI Studio](https://aistudio.google.com/apikey).
3. Paste the key on the first-run screen and select **Save & Continue**.
4. Open a tab that is playing audio.
5. Choose the target language.
6. Choose dubbing, captions, or both.
7. Start translation.

For Voice Typing, open its tab in Dubly, enable the feature, grant microphone access once, and start recording from the floating control.

## Privacy

Dubly follows a **local-first** approach and has no relay server for dubbing, translation, or speech-to-text.

- The Google API key is stored in the extension's local storage on the user's device.
- Tab audio is processed only after the user starts a session.
- The microphone is active only during a Voice Typing recording.
- Tab audio, microphone audio, transcripts, and the API key do not pass through or get stored on Dubly servers.
- Processing connections run directly between the extension and Google services with the user's key.
- Optional website access is used to display the floating control and insert text, not to monitor browsing history.
- No Dubly account is required.

Read the complete [Dubly Privacy Policy](https://sites.google.com/view/dubly-privacy-policy).

## Chrome permissions

| Permission | Purpose |
| --- | --- |
| `activeTab` | Runs the user-selected feature on the active tab after a user action. |
| `tabCapture` | Captures audio from the selected tab for translation and dubbing. |
| `offscreen` | Continues audio processing and dubbed playback while the popup is closed. |
| `storage` | Stores the API key, settings, and activity data locally. |
| `scripting` | Adds captions, the Voice Typing control, and initial synchronization to the selected page. |
| Optional `http://*/*` and `https://*/*` access | Displays and maintains Voice Typing in the active tab and inserts text into the selected field. |
| Microphone access | Captures microphone audio only during a recording started by the user. |

The Manifest security policy limits extension network connections to the Gemini service endpoint at `generativelanguage.googleapis.com`.

## How Dubly works

### Translation and dubbing path

```text
Tab playing audio
       │
       ▼
Chrome Tab Capture
       │
       ▼
     Dubly
       │
       │  User's personal API key
       ▼
Google Gemini API
       │
       ├──► Dubbed audio
       └──► Floating Captions
```

### Voice Typing path

```text
Microphone
    │
    ▼
  Dubly
    │
    │  User's personal API key
    ▼
Google Gemini Transcribe Live
    │
    ▼
Text / Input Field
```

No Dubly server is present in either processing path.

## Project structure

| File | Responsibility |
| --- | --- |
| `manifest.json` | Manifest V3 configuration, permissions, and network policy |
| `background.js` | Service Worker, feature coordination, and session lifecycle |
| `offscreen.js` | Tab-audio processing, dubbed playback, and microphone transcription |
| `popup.html`, `popup.css`, `popup.js` | Main extension interface and behavior |
| `voice-typing.js` | Floating Voice Typing control and local text insertion |
| `subtitles.js` | Floating and fullscreen caption display |
| `media-sync.js` | Initial playback hold used to reduce dubbing delay |
| `pages.html`, `pages.css`, `pages.js` | Privacy, help, support, donation, and activity pages |
| `*.test.cjs`, `*.browser-test.cjs` | Automated Node and browser tests |
| `package.ps1` | Extension ZIP packaging script |

## Development, testing, and packaging

Use Node.js 22 or newer. Browser tests use the pinned Playwright Chromium version. GitHub Actions runs the same suite on every push and pull request. Tests mock Google; they do not verify a paid live API session.

```bash
npm ci
npx playwright install chromium
npm test
```

To build a Chrome Web Store package:

```powershell
./package.ps1
```

The script reads the version from `manifest.json` and creates `Dubly-<version>.zip`.

## Contributing

Dubly is open-source. Focused, reviewable issues and pull requests are welcome.

1. Fork the repository.
2. Create a focused branch: `git checkout -b feature/short-name`
3. Implement the change and add or update tests when needed.
4. Run the test suite.
5. Commit the change: `git commit -m "feat: describe the change"`
6. Push the branch: `git push origin feature/short-name`
7. Open a pull request describing the problem, solution, and verification.

Never commit API keys, personal data, ZIP packages, build output, or temporary files.

## Possible development directions

This roadmap describes possible directions rather than firm commitments or delivery dates:

- Reduce live dubbing latency
- Improve Voice Typing quality and reliability
- Improve Floating Captions readability and synchronization
- Expand compatibility with more websites and media players
- Improve audio controls and synchronization
- Simplify the interface and first-run experience
- Expand and refine the multilingual experience

## Current limitations

New installations default to a 30-minute translation session limit; existing preferences, including unlimited sessions, are preserved. Google usage may incur charges. The GitHub source version may be newer than the Web Store version while store review is pending.

- Translation and transcription quality and availability depend on the model, region, internet connection, and the user's API quota.
- Dubly does not provide lip synchronization or music and speech separation.
- Chrome internal pages, the Chrome Web Store, and some protected players cannot be captured or scripted.
- Initial dubbing synchronization depends on a controllable HTML audio or video element.

## License

**Dubly is released under the [MIT License](LICENSE).** You may use, modify, distribute, and include the code in personal or commercial projects as long as the copyright notice and license text are preserved.

## Links and contact

- [GitHub Repository](https://github.com/crypttopia/Dubly)
- [Chrome Web Store](https://chromewebstore.google.com/detail/dubly/fendjlfddioginhjfehfchdmoddlbnlp)
- [Privacy Policy](https://sites.google.com/view/dubly-privacy-policy)
- Support: `dubly.support@gmail.com`
- X / Twitter: [@crypttopia](https://x.com/crypttopia)

---

<div align="center">
  Dubly is an independent extension and is not affiliated with, endorsed by, or sponsored by Google LLC.
</div>
