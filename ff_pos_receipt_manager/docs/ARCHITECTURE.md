# Architecture

The addon extends `pos.config` and the Odoo 20 POS loader so settings are loaded with the active POS configuration and remain available offline. It extends the native `point_of_sale.OrderReceipt` template and patches only presentation accessors; Odoo tax, currency, payment and receipt business logic remain untouched.

For FlousFlow raw printing, the order receipt path sends a compact structured JSON receipt to the Android bridge. Android shapes Arabic and encodes every line for the XP-P323B Arabic code page (`ESC t 22`), so the receipt is sent as direct ESC/POS text. The QR value is sent separately and emitted as a native ESC/POS QR command. If the bridge does not understand the structured protocol, the frontend falls back to the existing full-raster ESC/POS payload.

The browser/native paths remain unchanged. Scoped CSS constrains the receipt element; a short-lived print stylesheet sets an explicit configured page width and measured receipt height before Chromium print/PDF generation. The operating-system printer driver still controls physical paper selection.
