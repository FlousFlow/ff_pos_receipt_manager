# Flous Flow POS Receipt Manager

Odoo 20 Community addon for per-POS receipt layout preparation in browser printing.

The addon formats Odoo 20's native QWeb POS receipt in the ticket-printer iframe using the selected width, margins and font profile. It does not control printer drivers, physical paper selection, Bluetooth, ESC/POS, cutting or silent printing. Browser and operating-system print settings remain authoritative.

Install with `./odoo-bin -d <database> -i ff_pos_receipt_manager --stop-after-init` and update with `-u ff_pos_receipt_manager` from the Odoo 20 checkout.

The addon is Odoo 20 Community only. It extends Odoo 20's QWeb receipt and ticket-printer iframe path. Physical printer paper, cutting, Bluetooth, ESC/POS and silent printing remain outside its scope.
