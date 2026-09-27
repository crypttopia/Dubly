# Dubly

## فارسی

Dubly یک افزونهٔ Chrome برای ترجمهٔ زندهٔ صدای تب، دوبله با هوش مصنوعی، زیرنویس شناور و تایپ صوتی است. افزونه با کلید API شخصی کاربر مستقیماً به سرویس‌های Google Gemini متصل می‌شود؛ برای استفاده از آن به حساب Dubly نیاز ندارید.

نسخهٔ فعلی پکیج: **0.9.26**

### قابلیت‌ها

- **دوبلهٔ زنده با هوش مصنوعی:** صدای ویدیو، پخش‌کنندهٔ صوتی یا محتوای زندهٔ تب فعال را ترجمه و دوبله می‌کند.
- **پشتیبانی از ۷۲ زبان:** زبان مقصد دوبله و ترجمه را از میان ۷۲ زبان پشتیبانی‌شده انتخاب کنید.
- **زیرنویس شناور:** ترجمه را روی صفحه و روی ویدیو، از جمله در حالت تمام‌صفحه، نمایش می‌دهد. زیرنویس شناور یکی از قابلیت‌های اصلی و پایدار Dubly است.
- **کنترل جداگانهٔ صدا:** بلندی صدای اصلی تب و صدای دوبله‌شده را مستقل از هم تنظیم کنید.
- **تایپ صوتی (Speech-to-Text):** صحبت خود را به متن تبدیل و در فیلدهای قابل ویرایش سایت‌ها درج کنید یا متن را کپی کنید.
- **کنترل شناور تایپ صوتی:** کنترل کوچک و قابل‌جابه‌جایی را روی صفحه فعال، کوچک، بزرگ یا بسته کنید و ضبط، درج، کپی و حذف متن را از همان‌جا انجام دهید.
- رابط کاربری فارسی و انگلیسی، حالت روشن، تاریک و هماهنگ با سیستم.
- آمار محلی فعالیت برای جلسه‌های دوبله.
- راه‌اندازی سادهٔ کلید API در اولین اجرا.

### کلید API و حریم خصوصی

Dubly سرور واسطی برای ترجمه، رونویسی یا جمع‌آوری آمار ندارد.

- صدای تب فقط پس از شروع ترجمه توسط کاربر، مستقیماً از افزونه به سرویس ترجمهٔ Google Gemini ارسال می‌شود.
- میکروفن فقط وقتی فعال می‌شود که کاربر ضبط تایپ صوتی را شروع کند. صدای میکروفن برای تبدیل گفتار به متن مستقیماً به سرویس رونویسی Google Gemini ارسال می‌شود.
- کلید API شخصی کاربر برای احراز اتصال‌های مستقیم به Google استفاده می‌شود.
- صدای تب، صدای میکروفن، متن تایپ صوتی و کلید API از سرورهای Dubly عبور نمی‌کنند و روی سرورهای Dubly ذخیره نمی‌شوند.
- کلید API و تنظیمات در حافظهٔ محلی افزونه روی دستگاه کاربر ذخیره می‌شوند و با حساب Chrome همگام نمی‌شوند.
- دسترسی صفحات وب برای تایپ صوتی فقط پس از فعال‌سازی این قابلیت درخواست می‌شود و برای نمایش کنترل شناور و درج متن در `input`، `textarea` یا `contenteditable` به کار می‌رود. Dubly از این دسترسی برای پایش تاریخچهٔ مرور یا فعالیت‌های نامرتبط استفاده نمی‌کند.
- برای استفاده از Dubly نیازی به ساخت حساب Dubly نیست.

سیاست کامل حریم خصوصی در [Dubly Privacy Policy](https://sites.google.com/view/dubly-privacy-policy) در دسترس است.

### پیش‌نیازها

- Google Chrome نسخهٔ 116 یا جدیدتر.
- یک کلید Google Gemini API از [Google AI Studio](https://aistudio.google.com/apikey).
- دسترسی حساب و منطقهٔ کاربر به مدل‌های Gemini مورد استفادهٔ افزونه و سهمیهٔ کافی.

### نصب به‌صورت Unpacked Extension

1. مخزن را دریافت کنید:

   ```powershell
   git clone https://github.com/crypttopia/Dubly.git
   cd Dubly
   ```

2. در Chrome نشانی `chrome://extensions` را باز کنید.
3. گزینهٔ **Developer mode** را فعال کنید.
4. روی **Load unpacked** بزنید و پوشهٔ اصلی مخزن Dubly را انتخاب کنید.
5. افزونه را از نوار ابزار Chrome باز کنید.

### وارد کردن Google API key

1. در [Google AI Studio](https://aistudio.google.com/apikey) برای حساب خود یک کلید API بسازید.
2. در اولین اجرای Dubly، کلید را در صفحهٔ راه‌اندازی Paste کنید. اگر قبلاً کلیدی ذخیره کرده‌اید، می‌توانید آن را از بخش تنظیمات تغییر دهید.
3. روی **Save & Continue** بزنید تا کلید بررسی و روی دستگاه ذخیره شود.
4. تب دارای ویدیو یا صدا را باز کنید، زبان ترجمه را انتخاب کنید و ترجمه را شروع کنید.

کلید API را داخل کد یا Git commit نکنید. Dubly کلید را هنگام اجرا در حافظهٔ محلی Chrome نگه می‌دارد.

### ساخت فایل ZIP برای Chrome Web Store

اسکریپت بسته‌بندی را در PowerShell اجرا کنید:

```powershell
./package.ps1
```

اسکریپت نسخه را از `manifest.json` می‌خواند و فایل `Dubly-<version>.zip` را می‌سازد. فایل‌های ZIP تولیدشده عمداً در Git نادیده گرفته می‌شوند.

### اجرای تست‌ها

تست‌ها به Node.js نیاز دارند. تست‌های مرورگر علاوه بر آن به Playwright و Chrome نیاز دارند.

```powershell
$tests = @(Get-ChildItem -Filter '*.test.cjs'; Get-ChildItem -Filter '*.browser-test.cjs') | Sort-Object Name
foreach ($test in $tests) {
  node --test $test.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

### دسترسی‌های Chrome

| دسترسی | دلیل استفاده |
| --- | --- |
| `activeTab` | اجرای قابلیتی که کاربر روی تب فعال درخواست کرده است. |
| `tabCapture` | دریافت صدای تب انتخاب‌شده هنگام ترجمه و دوبله. |
| `offscreen` | پردازش صدای تب یا میکروفن و پخش صدای دوبله‌شده وقتی پنجرهٔ افزونه بسته است. |
| `storage` | ذخیرهٔ محلی کلید API، تنظیمات و فعالیت دوبله روی دستگاه. |
| `scripting` | افزودن زیرنویس شناور، کنترل تایپ صوتی و هماهنگ‌سازی اولیهٔ دوبله به تب انتخاب‌شده. |
| دسترسی اختیاری `http://*/*` و `https://*/*` | نگه‌داشتن تایپ صوتی در همان تب هنگام پیمایش عادی وب و درج متن در فیلد انتخاب‌شده. |
| دسترسی میکروفن | دریافت صدای میکروفن فقط در زمان ضبط تایپ صوتی که کاربر آغاز کرده است. |

سیاست شبکه در manifest، اتصال افزونه را به endpoint سرویس Gemini در `generativelanguage.googleapis.com` محدود می‌کند.

### ساختار پروژه

- `manifest.json` — پیکربندی Chrome Manifest V3.
- `background.js` — سرویس‌ورکر و هماهنگی قابلیت‌ها.
- `offscreen.js` — ترجمهٔ صدای تب، پخش دوبله و رونویسی میکروفن.
- `popup.html`، `popup.css` و `popup.js` — رابط اصلی افزونه.
- `voice-typing.js` — کنترل شناور تایپ صوتی و درج محلی متن.
- `subtitles.js` — نمایش زیرنویس شناور و تمام‌صفحه.
- `media-sync.js` — مکث اولیهٔ پخش برای کاهش اختلاف زمانی دوبله.
- `pages.html`، `pages.css` و `pages.js` — حریم خصوصی، شرایط استفاده، راهنما، پشتیبانی، حمایت مالی و فعالیت.
- `publishing/` — نسخه‌های مناسب انتشار سیاست حریم خصوصی و شرایط استفاده.
- `*.test.cjs` و `*.browser-test.cjs` — تست‌های خودکار.
- `package.ps1` — اسکریپت بسته‌بندی افزونه.

### مشارکت در پروژه

1. مخزن را Fork و یک branch برای تغییر خود ایجاد کنید.
2. تغییر را محدود، روشن و هماهنگ با طراحی و معماری فعلی Dubly نگه دارید.
3. تست‌های مرتبط را اضافه یا به‌روزرسانی کنید و مجموعهٔ تست‌ها را اجرا کنید.
4. مطمئن شوید کلید API، اطلاعات شخصی، فایل ZIP، خروجی ساخت یا فایل موقت commit نشده است.
5. Pull Request بسازید و مشکل، راه‌حل و روش بررسی تغییر را توضیح دهید.

### محدودیت‌های فعلی

- کیفیت ترجمه و رونویسی به دسترسی مدل‌های Google، اینترنت و سهمیهٔ API کاربر وابسته است.
- Dubly هماهنگ‌سازی حرکت لب یا جداسازی موسیقی از گفتار انجام نمی‌دهد.
- بعضی پخش‌کننده‌های محافظت‌شده، صفحات داخلی Chrome و Chrome Web Store قابل دریافت یا اسکریپت‌گذاری نیستند.
- هماهنگ‌سازی اولیهٔ دوبله فقط وقتی کار می‌کند که صفحه یک عنصر صوتی یا ویدیویی HTML قابل‌کنترل داشته باشد.

### استقلال و پشتیبانی

Dubly یک افزونهٔ مستقل است و وابسته به Google LLC نیست و مورد تأیید یا حمایت آن قرار ندارد.

- پشتیبانی: `dubly.support@gmail.com`
- شبکهٔ اجتماعی: [@crypttopia در X](https://x.com/crypttopia)

در حال حاضر مجوز متن‌باز در این مخزن قرار نگرفته است.

---

## English

Dubly is a Chrome extension for live tab-audio translation, AI dubbing, floating captions, and voice typing. It connects directly to Google Gemini services with the user's own API key, and no Dubly account is required.

Current package version: **0.9.26**

### Features

- **Live AI dubbing:** Translates and dubs video, audio players, or live content playing in the active tab.
- **Support for 72 languages:** Choose a dubbing and translation target from 72 supported languages.
- **Floating Captions:** Displays translated text over the page and video, including fullscreen playback. Floating Captions is a core, stable Dubly feature.
- **Independent volume controls:** Adjust the original tab audio and dubbed audio separately.
- **Voice Typing (Speech-to-Text):** Convert speech to text, insert it into editable fields on websites, or copy it.
- **Floating Voice Typing control:** Move, minimize, expand, or close the compact page control and use it to record, insert, copy, or delete text.
- Persian and English interfaces with light, dark, and system appearance modes.
- Local activity statistics for dubbing sessions.
- A simple first-run API key setup flow.

### API key and privacy

Dubly has no translation, transcription, or analytics relay server.

- Tab audio is sent directly from the extension to the Google Gemini translation service only after the user starts translation.
- The microphone activates only when the user starts a Voice Typing recording. Microphone audio is sent directly to the Google Gemini transcription service for speech-to-text processing.
- The user's own API key authenticates these direct Google connections.
- Tab audio, microphone audio, Voice Typing text, and the API key do not pass through or get stored on Dubly servers.
- The API key and preferences are stored in the extension's local storage on the user's device and are not synced through the Chrome account.
- Website access for Voice Typing is requested only after the user enables the feature. It is used to display the floating control and insert text into an `input`, `textarea`, or `contenteditable` field. Dubly does not use this access to monitor browsing history or unrelated activity.
- No Dubly account is required.

Read the complete [Dubly Privacy Policy](https://sites.google.com/view/dubly-privacy-policy).

### Requirements

- Google Chrome 116 or newer.
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).
- Access to the Gemini models used by the extension in the user's account and region, with sufficient quota.

### Install as an Unpacked Extension

1. Clone the repository:

   ```powershell
   git clone https://github.com/crypttopia/Dubly.git
   cd Dubly
   ```

2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the root Dubly repository directory.
5. Open the extension from the Chrome toolbar.

### Enter a Google API key

1. Create an API key for your account in [Google AI Studio](https://aistudio.google.com/apikey).
2. On the first Dubly launch, paste the key into the setup screen. If a key is already saved, you can replace it in Settings.
3. Select **Save & Continue** so Dubly can verify the key and store it on your device.
4. Open a tab playing video or audio, choose the translation language, and start translation.

Never commit an API key to source control. Dubly stores it at runtime in Chrome's local extension storage.

### Build a Chrome Web Store ZIP

Run the packaging script from PowerShell:

```powershell
./package.ps1
```

The script reads the version from `manifest.json` and creates `Dubly-<version>.zip`. Generated ZIP files are intentionally ignored by Git.

### Run tests

The test suite requires Node.js. Browser tests additionally require Playwright and Chrome.

```powershell
$tests = @(Get-ChildItem -Filter '*.test.cjs'; Get-ChildItem -Filter '*.browser-test.cjs') | Sort-Object Name
foreach ($test in $tests) {
  node --test $test.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

### Chrome permissions

| Permission | Purpose |
| --- | --- |
| `activeTab` | Runs a user-requested feature on the active tab. |
| `tabCapture` | Captures audio from the selected tab during translation and dubbing. |
| `offscreen` | Processes tab or microphone audio and plays dubbed audio while the popup is closed. |
| `storage` | Stores the API key, preferences, and local dubbing activity on the device. |
| `scripting` | Adds Floating Captions, the Voice Typing control, and initial dubbing synchronization to the selected tab. |
| Optional `http://*/*` and `https://*/*` access | Keeps Voice Typing available in the same tab during normal web navigation and inserts text into the selected field. |
| Microphone access | Captures microphone audio only while the user is recording with Voice Typing. |

The manifest network policy limits the extension's connection to the Gemini service endpoint at `generativelanguage.googleapis.com`.

### Project layout

- `manifest.json` — Chrome Manifest V3 configuration.
- `background.js` — service worker and feature orchestration.
- `offscreen.js` — tab-audio translation, dubbing playback, and microphone transcription.
- `popup.html`, `popup.css`, and `popup.js` — extension interface.
- `voice-typing.js` — floating Voice Typing control and local text insertion.
- `subtitles.js` — floating and fullscreen caption display.
- `media-sync.js` — initial playback hold used to reduce dubbing delay.
- `pages.html`, `pages.css`, and `pages.js` — privacy, terms, help, support, donation, and activity pages.
- `publishing/` — public-site copies of the privacy policy and terms.
- `*.test.cjs` and `*.browser-test.cjs` — automated tests.
- `package.ps1` — extension packaging script.

### Contributing

1. Fork the repository and create a branch for your change.
2. Keep the change focused, clear, and consistent with Dubly's current design and architecture.
3. Add or update relevant tests and run the test suite.
4. Confirm that no API keys, personal data, ZIP packages, build output, or temporary files are committed.
5. Open a pull request that explains the problem, the solution, and how the change was verified.

### Current limitations

- Translation and transcription quality depend on Google model availability, the internet connection, and the user's API quota.
- Dubly does not provide lip synchronization or music and speech separation.
- Some protected players, Chrome internal pages, and the Chrome Web Store cannot be captured or scripted.
- Initial dubbing synchronization works only when the page exposes a controllable HTML audio or video element.

### Independence and support

Dubly is an independent extension and is not affiliated with, endorsed by, or sponsored by Google LLC.

- Support: `dubly.support@gmail.com`
- Social: [@crypttopia on X](https://x.com/crypttopia)

No open-source license is currently included in this repository.
