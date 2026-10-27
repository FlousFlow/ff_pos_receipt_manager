# Architecture

The addon extends `pos.config` and Odoo 19's `pos.load.mixin` field loader so settings are loaded with the active POS configuration and remain available offline. It extends the native `point_of_sale.OrderReceipt` template and patches only presentation accessors; Odoo tax, currency, payment and receipt business logic remain untouched.

`PosStore.printReceipt()` and `printOptions` are not overridden. Odoo's existing `PrinterService` remains responsible for hardware printing or browser fallback. Scoped CSS constrains the receipt element; a short-lived print stylesheet sets an explicit configured page width and measured receipt height before Chromium print/PDF generation. The operating-system printer driver still controls physical paper selection.
