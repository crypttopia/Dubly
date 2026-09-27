# Dubly

Dubly is a Chrome extension for live tab-audio translation, AI dubbing, floating translated subtitles, and voice typing. It connects directly to Google Gemini with an API key supplied by the user.

The current package version is **0.9.26**.

## Features

- Live translation and dubbed audio from the active browser tab.
- Floating translated subtitles for video, audio-only players, and live audio pages.
- Independent controls for original-tab and dubbed-audio volume.
- Voice Typing with a movable and minimizable floating control.
- Speech-to-text insertion into supported `input`, `textarea`, and `contenteditable` fields.
- Persian and English interface languages.
- Light, dark, and system appearance modes.
- Local activity statistics for dubbing sessions.
- Local API-key storage and a first-run key setup flow.

## Privacy architecture

Dubly has no translation, transcription, or analytics relay server.

- Tab audio is sent directly from the extension to Google Gemini Live Translate.
- Microphone audio is captured only after the user starts Voice Typing and is sent directly to Google Gemini Transcribe Live.
- The user's API key authenticates those direct Google connections.
- Microphone audio, Voice Typing transcripts, and API keys do not pass through or get stored on Dubly servers.
- Voice Typing website access is requested only after the user enables the feature. It is used to display the floating control and insert text into the active editable field.
- Website access is not used to monitor browsing history or unrelated activity.

The full privacy policy is available at [Dubly Privacy Policy](https://sites.google.com/view/dubly-privacy-policy).

## Requirements

- Google Chrome 116 or newer.
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
- Access to the Gemini models used by the extension in the user's account and region.

## Install for development

1. Clone the repository:

   ```powershell
   git clone https://github.com/crypttopia/Dubly.git
   cd Dubly
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the repository directory.
5. Open Dubly, paste your Gemini API key, and complete the connection check.

Do not commit an API key. Dubly stores the key at runtime in the extension's local Chrome storage.

## Build a Chrome Web Store ZIP

Run the packaging script from PowerShell:

```powershell
./package.ps1
```

The script reads the version from `manifest.json` and creates `Dubly-<version>.zip`. Generated ZIP files are intentionally ignored by Git.

## Run tests

The test suite uses Node.js. Browser tests additionally require Playwright and Chrome.

Run all Node and browser tests from PowerShell:

```powershell
$tests = @(Get-ChildItem -Filter '*.test.cjs'; Get-ChildItem -Filter '*.browser-test.cjs') | Sort-Object Name
foreach ($test in $tests) {
  node --test $test.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

## Chrome permissions

| Permission | Purpose |
| --- | --- |
| `activeTab` | Starts a user-requested feature on the active tab. |
| `tabCapture` | Captures audio from the selected tab during translation. |
| `offscreen` | Processes tab or microphone audio and plays dubbed audio while the popup is closed. |
| `storage` | Stores the API key, preferences, and local dubbing activity on the device. |
| `scripting` | Adds floating subtitles, Voice Typing controls, and initial dubbing synchronization to the selected tab. |
| Optional `http://*/*` and `https://*/*` access | Keeps Voice Typing available in the same tab across normal web navigation and inserts text into the selected field. |
| Microphone access | Captures microphone audio only while the user is recording with Voice Typing. |

The extension's network connection is limited by its manifest policy to Google's Gemini API endpoint at `generativelanguage.googleapis.com`.

## Project layout

- `manifest.json` — Chrome Manifest V3 configuration.
- `background.js` — service worker and feature orchestration.
- `offscreen.js` — tab-audio translation, dubbing playback, and microphone transcription.
- `popup.html`, `popup.css`, `popup.js` — extension interface.
- `voice-typing.js` — floating Voice Typing control and local text insertion.
- `subtitles.js` — floating and fullscreen subtitle display.
- `media-sync.js` — initial playback hold used to reduce dubbing delay.
- `pages.html`, `pages.css`, `pages.js` — privacy, terms, help, support, donation, and activity pages.
- `publishing/` — public-site copies of the privacy policy and terms.
- `*.test.cjs`, `*.browser-test.cjs` — automated tests.
- `package.ps1` — deterministic extension packaging script.

## Known limitations

- Translation and transcription quality depend on Google model availability and the user's quota.
- Dubly does not provide lip synchronization or music/speech separation.
- Some protected players, Chrome internal pages, and the Chrome Web Store cannot be captured or scripted.
- Initial dubbing synchronization works only when the page exposes a controllable HTML audio or video element.

## Independence and support

Dubly is an independent extension and is not affiliated with, endorsed by, or sponsored by Google LLC.

- Support: `dubly.support@gmail.com`
- Social: [@crypttopia on X](https://x.com/crypttopia)

No open-source license is currently included in this repository.
