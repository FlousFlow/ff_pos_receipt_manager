import { patch } from "@web/core/utils/patch";
import { PosTicketPrinterPlugin } from "@point_of_sale/app/plugins/pos_ticket_printer_plugin";
import { normalizeReceiptSettings } from "./receipt_layout";

/**
 * Odoo 20 renders receipts as QWeb HTML inside the ticket-printer iframe.
 * Apply the configured page size to that iframe immediately before the native
 * browser print path runs; hardware printer paths remain untouched.
 */
patch(PosTicketPrinterPlugin.prototype, {
    _ffApplyReceiptPrintStyle(iframe) {
        const config = this.config || {};
        const layout = normalizeReceiptSettings(config);
        if (!layout.enabled || layout.printMode !== "browser") {
            return;
        }

        const document = iframe.contentDocument || iframe.contentWindow.document;
        const receipt = document.getElementById("pos-receipt");
        if (!receipt) {
            return;
        }

        const heightMm = Math.max(40, Math.ceil(((receipt.scrollHeight || 600) + 8) / 3.7795));
        const style = document.createElement("style");
        style.id = "ff-receipt-manager-print-style";
        style.textContent = `
            @page { margin: 0; size: ${layout.paperWidthMm}mm ${heightMm}mm; }
            #pos-receipt {
                width: ${layout.contentWidthMm}mm !important;
                max-width: ${layout.contentWidthMm}mm !important;
                margin-left: ${layout.leftMarginMm}mm !important;
                margin-right: ${layout.rightMarginMm}mm !important;
                box-sizing: border-box !important;
                overflow-wrap: anywhere !important;
                direction: auto !important;
            }
            #pos-receipt img.invoice-qr-code { width: 32mm !important; height: 32mm !important; }
        `;
        document.head.appendChild(style);
    },

    printWeb(iframe) {
        this._ffApplyReceiptPrintStyle(iframe);
        return super.printWeb(...arguments);
    },
});
