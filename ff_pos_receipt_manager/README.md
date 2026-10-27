# Flous Flow POS Receipt Manager

Odoo 19 Community addon for per-POS receipt layout preparation in browser printing.

The addon formats the native `OrderReceipt` using the selected width, margins and font profile. It does not control printer drivers, physical paper selection, Bluetooth, ESC/POS, cutting or silent printing. Browser and operating-system print settings remain authoritative.

Install with `./odoo-bin -d <database> -i ff_pos_receipt_manager --stop-after-init` and update with `-u ff_pos_receipt_manager` from the Odoo 19 checkout.

The addon is Odoo 19 Community only. It provides browser-safe receipt layout and page-size hints; physical printer paper, cutting, Bluetooth, ESC/POS and silent printing remain outside its scope.
