/** Pure receipt layout normalization; kept independent for HOOT/unit testing. */
export function normalizeReceiptSettings(config = {}) {
    const finiteOr = (value, fallback) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    };
    const paper = config.ff_receipt_paper_size || "80";
    const paperWidth = paper === "custom"
        ? Number(config.ff_receipt_custom_width_mm)
        : Number(paper);
    const safePaper = Number.isFinite(paperWidth) && paperWidth >= 40 && paperWidth <= 210 ? paperWidth : 80;
    const left = Math.max(0, finiteOr(config.ff_receipt_margin_left_mm ?? 2, 2));
    const right = Math.max(0, finiteOr(config.ff_receipt_margin_right_mm ?? 2, 2));
    const marginTotal = left + right;
    const printable = Number(config.ff_receipt_printable_width_mm);
    const available = Math.max(1, safePaper - marginTotal);
    const contentWidth = Number.isFinite(printable) && printable > 0
        ? Math.min(available, printable)
        : available;
    const fontProfile = ["small", "normal", "large"].includes(config.ff_receipt_font_profile)
        ? config.ff_receipt_font_profile
        : "normal";
    return {
        enabled: config.ff_receipt_manager_enabled !== false,
        printMode: config.ff_receipt_print_mode === "native" ? "native" : "browser",
        paperWidthMm: safePaper,
        leftMarginMm: left,
        rightMarginMm: right,
        contentWidthMm: contentWidth,
        fontProfile,
    };
}

export function receiptStyle(settings) {
    const layout = normalizeReceiptSettings(settings);
    const fontSize = { small: "2.8mm", normal: "3.2mm", large: "3.7mm" }[layout.fontProfile];
    return [
        `--ff-receipt-paper-width: ${layout.paperWidthMm}mm`,
        `--ff-receipt-content-width: ${layout.contentWidthMm}mm`,
        `--ff-receipt-margin-left: ${layout.leftMarginMm}mm`,
        `--ff-receipt-margin-right: ${layout.rightMarginMm}mm`,
        `--ff-receipt-font-size: ${fontSize}`,
    ].join(";");
}
