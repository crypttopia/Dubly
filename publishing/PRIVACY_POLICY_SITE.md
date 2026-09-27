# Dubly Privacy Policy

Last updated: September 27, 2026. This policy describes Dubly version 0.9.28.

Dubly is an independent Chrome extension for live AI dubbing of audio from a browser tab you choose and optional Voice Typing. It uses your own Google Gemini API key. Voice Typing captures microphone audio only after you press Start on its floating control and sends it directly to Gemini Transcribe Live for real-time speech-to-text.

## What Dubly processes

When you press Start, Dubly captures audio from the selected tab and sends it directly to Google Gemini API over an encrypted WebSocket connection. Your API key authenticates that connection. Dubly does not send video frames or browsing history for translation, and it has no translation relay server or analytics upload service. Closing the small extension popup does not end the session; press Stop or close the source tab to stop audio transmission.

Translated text and the source tab title may appear in the extension during a session. The translated text is kept only in session memory. Dubly does not save audio recordings, video files, caption text, page titles, domains, or full page URLs in its activity history. If floating subtitles are enabled, translated text is sent to an isolated script on the selected tab for display, including audio-only pages; the API key is not sent to the webpage.

## Voice Typing

Optional website access is requested only after you press **Enable Voice Typing**. It is used locally to display the floating control, identify the active editable field, and insert returned text into an `input`, `textarea`, or `contenteditable`. It is not used to monitor browsing history or unrelated user activity. The control remains attached only to the tab where you enabled it.

The one-time Chrome permission check may briefly open and immediately close the microphone; no audio is sent to Google during that check. Continuous microphone capture and transmission begin only after you press **Start** on the floating control and end when you press **Stop** or close the control.

While recording, microphone audio is sent with your own API key over an encrypted WebSocket connection directly to Google Gemini Transcribe Live for speech-to-text. Returned transcript text is held only in the floating control’s memory until you insert, copy, delete, or close it. Microphone audio, transcript text, and your API key do not pass through or get stored on Dubly servers; Dubly has no relay server for this feature. Once inserted into a website, that website may process the text under its own privacy policy.

## Chrome permissions

- **activeTab:** Grants temporary access to start a Dubly feature on the active tab after your explicit action.
- **Optional website access (`http://*/*` and `https://*/*`):** Requested only after you choose to enable Voice Typing. It displays and restores the control in the same tab after navigation and lets it insert text into the active editable field. You can revoke this permission from Chrome's Site access settings.
- **tabCapture:** Captures the selected tab's audio while a dubbing session is active.
- **Microphone access:** Chrome requests permission after you enable Voice Typing. Its permission check may open the microphone briefly, but audio transmission begins only after you press Start on the floating control and continues only while recording.
- **offscreen:** Runs a Chrome offscreen document to process tab audio, play dubbed audio, and connect microphone audio directly to Google’s transcription service while the extension popup is closed.
- **storage:** Saves the API key, preferences, and optional local dubbing activity history on your device. Voice Typing transcript text is not written to extension storage.
- **scripting:** Adds floating subtitles or the Voice Typing control to the selected tab, identifies the active `input`, `textarea`, or `contenteditable` for insertion, and may briefly pause and resume the active media player once to align dubbed audio. Website access is not used to monitor browsing history or unrelated activity.

The extension's only network destination is `https://generativelanguage.googleapis.com/*`. Dubly connects to the corresponding secure `wss://generativelanguage.googleapis.com` endpoint for Gemini API. Optional web-page access is used locally to display the Voice Typing control and insert text; it does not add another network destination. The control remains attached only to the tab where you enabled it. Chrome internal pages, the Chrome Web Store, and some protected players cannot be captured.

## Information stored on your device

Your Gemini API key and preferences, including language and volume, are stored in Chrome's local extension storage so they remain after a browser or computer restart. They are not synced through your Chrome account. Local extension storage is not a dedicated encrypted vault; protect your computer and API key. You can replace or delete the key in Dubly Settings.

My Activity is enabled by default. It stores dubbing tab-audio streaming duration, local calendar dates, target language, and random session identifiers on your device for up to 366 days. Voice Typing audio and transcript text are not included in My Activity. Streaming time includes silence and is not a measure of translated speech or Google charges. You can disable activity recording or erase its history from the extension. Removing the extension removes its extension-managed local data according to Chrome's storage behavior.

## Google and other services

Google Gemini processes selected-tab audio for translation and microphone audio for transcription, together with the related API requests, under Google's applicable terms and privacy policies. Depending on the Google service and account tier you use, Google may apply different data-use rules. Review the [Gemini API terms](https://ai.google.dev/gemini-api/terms) and [Google Privacy Policy](https://policies.google.com/privacy) before sending sensitive content.

Dubly does not sell user data or use local activity for advertising. The use of information received from Google APIs will adhere to the Chrome Web Store User Data Policy, including the Limited Use requirements.

Crypto donations are optional. Blockchain transactions may be public, and wallet services have their own policies. Dubly does not require a donation to unlock features.

## Changes and contact

We may update this policy when the extension's data handling changes. The updated page will show its revision date. For privacy questions, contact `dubly.support@gmail.com` or use the support link in Dubly.
