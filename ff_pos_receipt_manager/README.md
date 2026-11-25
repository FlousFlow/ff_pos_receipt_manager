# Flous Flow POS Receipt Manager

Odoo 20 Community addon for per-POS receipt layout and direct FlousFlow printing.

The addon formats the native `OrderReceipt` using the selected width, margins and font profile. In `raw_api` mode, order receipts are sent as structured data to FlousFlow Print, which emits all receipt lines as direct ESC/POS text using the XP-P323B Arabic code page and emits QR values with the native ESC/POS QR command. Existing full-raster ESC/POS is retained as a compatibility fallback.

Each direct print attempt receives a diagnostic ID. Odoo sends it with pairing and print requests, logs its app response stage, and displays it on success or failure. FlousFlow Print uses the same ID for HTTP and Bluetooth diagnostics. `bluetooth_write_completed` confirms the bridge completed its Bluetooth write; it cannot guarantee physical paper output without printer-side acknowledgment.

Install with `./odoo-bin -d <database> -i ff_pos_receipt_manager --stop-after-init` and update with `-u ff_pos_receipt_manager` from the Odoo 20 checkout.

The addon targets Odoo 20 Community. Physical printer paper, cutting, Bluetooth connection state and actual paper-completion time still require validation on the target printer.

On Android, open Odoo POS from the FlousFlow Print app. Its trusted WebView native bridge forwards receipt payloads to the app's local print service, avoiding the browser's Local Network Access permission prompt. Android browsers outside the app show a one-tap action to open the POS in FlousFlow Print. Desktop browsers retain the existing loopback API path.
