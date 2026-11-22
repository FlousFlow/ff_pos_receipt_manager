import { onMounted, onWillUnmount } from "@odoo/owl";
import { patch } from "@web/core/utils/patch";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { normalizeReceiptSettings, receiptStyle } from "./receipt_layout";

patch(OrderReceipt.prototype, {
    setup() {
        super.setup(...arguments);
        this._ffPrintPageStyle = null;
        onMounted(() => {
            const layout = this.ffReceiptLayout;
            if (!layout.enabled || layout.printMode !== "browser") {
                return;
            }
            const style = document.createElement("style");
            style.dataset.ffReceiptPrintPage = "true";
            // Chromium ignores a one-dimensional `auto` page size in some
            // print-preview contexts. Give it an explicit height measured
            // from the rendered receipt so it cannot fall back to Letter/A4.
            const receipt = this.el?.querySelector(".ff-pos-receipt") || this.el;
            const heightMm = Math.max(40, Math.ceil(((receipt?.scrollHeight || 600) + 8) / 3.7795));
            style.textContent = `@page { margin: 0; size: ${layout.paperWidthMm}mm ${heightMm}mm; }`;
            document.head.appendChild(style);
            this._ffPrintPageStyle = style;
        });
        onWillUnmount(() => this._ffPrintPageStyle?.remove());
    },

    get ffReceiptLayout() {
        const config = this.order?.config || {};
        return normalizeReceiptSettings(config);
    },
    get ffReceiptClass() {
        const layout = this.ffReceiptLayout;
        return layout.enabled && layout.printMode === "browser"
            ? `pos-receipt p-2 ff-pos-receipt ff-pos-receipt--${layout.fontProfile} ff-pos-receipt--paper-${layout.paperWidthMm}`
            : "pos-receipt p-2";
    },
    get ffReceiptStyle() {
        const layout = this.ffReceiptLayout;
        return layout.enabled && layout.printMode === "browser"
            ? receiptStyle(this.order?.config || {})
            : "";
    },
});
