# Flous Flow POS Receipt Manager

Odoo 20 Community addon for per-POS receipt layout preparation in browser printing.

The addon formats Odoo 20's native QWeb POS receipt in the ticket-printer iframe using the selected thermal width, margins and font profile. In browser mode it sends a compact thermal-sized page to the device's system print dialog; the installed operating-system print service remains responsible for sending that job to the physical printer. The addon does not control Bluetooth transport, ESC/POS commands, cutting or silent printing.

Install with `./odoo-bin -d <database> -i ff_pos_receipt_manager --stop-after-init` and update with `-u ff_pos_receipt_manager` from the Odoo 20 checkout.

The addon is Odoo 20 Community only. It extends Odoo 20's QWeb receipt and ticket-printer iframe path. It measures page height after applying the thermal paper width, bounds oversized logos, and removes print-only shadows to reduce unnecessary work in the system print pipeline. The Android/system print service still determines transport speed and device capabilities.
