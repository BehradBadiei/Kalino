The standalone official Kalino logo and Iran Sans font were not present in the provided project files.

To use the official assets without changing code:
- Place the official logo at `public/brand/kalino-logo.png`. The splash, header, and About section automatically show it instead of the text fallback.
- Place the Iran Sans WOFF2 font at `public/fonts/IRANSans.woff2`. Until then the bundled Vazirmatn font is used.
- Replace `public/icons/icon-192.png`, `public/icons/icon-512.png`, and `public/icons/kalino-icon.svg` with versions of the official logo for the installed PWA. The current icons contain only the brand name as a typographic fallback, not an invented emblem.
