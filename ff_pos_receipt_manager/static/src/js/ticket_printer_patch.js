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

        const fontSizeMm = { small: 2.8, normal: 3.2, large: 3.7 }[layout.fontProfile];
        const pxPerMm = 96 / 25.4;
        const style = document.getElementById("ff-receipt-manager-print-style") || document.createElement("style");
        style.id = "ff-receipt-manager-print-style";

        const buildPrintCss = (heightMm) => `
            @page { size: ${layout.paperWidthMm}mm ${heightMm}mm; margin: 0; }
            html, body {
                width: ${layout.paperWidthMm}mm !important;
                min-width: ${layout.paperWidthMm}mm !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            #pos-receipt {
                width: ${layout.contentWidthMm}mm !important;
                max-width: ${layout.contentWidthMm}mm !important;
                margin-left: ${layout.leftMarginMm}mm !important;
                margin-right: ${layout.rightMarginMm}mm !important;
                box-sizing: border-box !important;
                overflow: visible !important;
                overflow-wrap: anywhere !important;
                font-size: ${fontSizeMm}mm !important;
                color: #000 !important;
                background: #fff !important;
                box-shadow: none !important;
            }
            #pos-receipt img {
                max-width: 100% !important;
                height: auto !important;
            }
            #pos-receipt [name="logo"] img {
                max-height: 20mm !important;
                width: auto !important;
                max-width: 50% !important;
            }
            #pos-receipt img.invoice-qr-code {
                width: 32mm !important;
                height: 32mm !important;
            }
            @media print {
                html, body { min-height: 0 !important; }
                #pos-receipt { break-after: avoid-page !important; page-break-after: avoid !important; }
                #pos-receipt, #pos-receipt * {
                    text-shadow: none !important;
                    box-shadow: none !important;
                }
            }
        `;

        // Apply the thermal width first. Measuring before this reflow can retain
        // the screen/A4 width and produce an oversized or clipped print job.
        style.textContent = buildPrintCss(1000);
        if (!style.isConnected) {
            document.head.appendChild(style);
        }
        const receiptHeight = Math.max(receipt.scrollHeight, receipt.getBoundingClientRect().height, 1);
        const heightMm = Math.max(40, Math.ceil((receiptHeight + 4) / pxPerMm));
        style.textContent = buildPrintCss(heightMm);
    },

    printWeb(iframe) {
        this._ffApplyReceiptPrintStyle(iframe);
        return super.printWeb(...arguments);
    },
});
