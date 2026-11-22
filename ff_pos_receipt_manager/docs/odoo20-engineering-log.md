# Odoo 20 engineering log

## 2026-11-17 — structured raw receipt payload

- Problem: raw printing rasterized the complete receipt in the browser before sending ESC/POS bytes to Android; long orders produced large Bluetooth payloads.
- Evidence: `raw_api_printer.js` used `generateImage()` and `canvasToEscPos()`; Android accepted `payload_base64` and forwarded it without interpreting receipt content.
- Decision: add `ESC_POS_STRUCTURED`. Odoo sends normalized receipt lines and optional QR data. Android prints ASCII lines with resident ESC/POS text and renders only non-ASCII lines as raster strips using Android text layout. Keep raster fallback for older bridge builds.
- Boundaries: physical print speed, Arabic appearance, and printer firmware behavior require a real RPP30 test. No fiscal fields are removed from the normalized order receipt path.

## 2026-11-17 — direct Arabic ESC/POS mode

- User confirmed the connected XP-P323B prints Arabic normally. Updated the structured bridge path to emit all receipt lines as direct ESC/POS text with `ESC t 22` (Xprinter Arabic code page) and send the QR value through the native ESC/POS QR command. The Android bridge no longer rasterizes Arabic lines in this mode.
- Physical verification remains required because code-page selection and RTL behavior are firmware settings on the attached printer.
# 2026-11-22 - Shared POS printer trace ID

- Module: `ff_pos_receipt_manager` 20.0.1.3.7 with FlousFlow Print 1.0.14.
- Finding: Odoo generated no ID shared with the Android bridge; the app generated its own socket request ID, so a browser failure could not be matched directly to Bluetooth diagnostics.
- Change: Odoo generates one trace ID per receipt attempt; sends it as a `/pair` query parameter and `request_id` JSON property on print requests; surfaces the ID and app stage. Android validates and reuses the supplied ID, returns it in JSON and response headers, logs it through Bluetooth completion/failure, and serves an authenticated in-memory status lookup that Odoo polls if the browser loses the print response. This preserves compatibility with older apps without adding a CORS request header.
- Verification: Odoo JS syntax, manifest, PO/POT checks passed. Android Gradle debug unit tests and APK build passed; APK signature matches v1.0.13 and v1.0.14 is published. The module upgrade passed on an isolated clone and production `brand_builders` now reports 20.0.1.3.7 installed; `odoo20` is active and login HTTP returned 200. Live POS browser interaction and physical printer output remain unverified because no cashier device or printer is connected here.
- Boundary: a successful Bluetooth socket write is not a physical print acknowledgment. No printer sensor signal is available through the current ESC/POS contract.

## 2026-11-22 - Remove blocked custom CORS header

- Evidence: the Android 1.0.14 log shows `/pair` succeeded, then browser preflight requested `authorization,content-type,x-print-request-id`. The bridge allowed only `Authorization, Content-Type`; no `POST /print/raw` followed. The Odoo module already sends the same trace ID in the JSON `request_id` field, which the bridge accepts.
- Change: removed the redundant `X-Print-Request-ID` header from both raw receipt POST paths. The shared trace ID stays in JSON, so the browser preflight only requests headers already allowed by Android. Bumped the module to 20.0.1.3.8.
- Verification: pending module upgrade and new printer log confirming `POST /print/raw` follows the successful OPTIONS response.

