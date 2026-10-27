# Architecture

The addon extends `pos.config` and Odoo 20's `pos.load.mixin` field loader so settings are loaded with the active POS configuration and remain available offline. It extends the native `point_of_sale.pos_order_receipt` QWeb template and patches only the `PosTicketPrinterPlugin` browser-print iframe path; Odoo tax, currency, payment and receipt business logic remain untouched.

Odoo 20's `PosTicketPrinterPlugin.printWeb()` remains responsible for browser printing and hardware paths are untouched. A short-lived iframe stylesheet sets an explicit configured page width and measured receipt height before Chromium print/PDF generation. The operating-system printer driver still controls physical paper selection.
