# Installation

Copy `ff_pos_receipt_manager` into an Odoo 20 addons path, update the apps list, install or upgrade the module, then reopen/reload each POS session so configuration data is refreshed.

For direct printing, install/update the matching FlousFlow Print Android build first, configure the saved ESC printer, then select `FlousFlow ESC/POS API` in the POS configuration. The order receipt path uses the structured protocol and falls back to raster when an older bridge is detected.
