import { test, expect } from "@odoo/hoot";
import { normalizeReceiptSettings, receiptStyle } from "../../src/js/receipt_layout";

test("receipt layout calculates the configured content width", () => {
    const layout = normalizeReceiptSettings({
        ff_receipt_paper_size: "80",
        ff_receipt_margin_left_mm: 2,
        ff_receipt_margin_right_mm: 2,
    });
    expect(layout.contentWidthMm).toBe(76);
});

test("receipt layout clamps invalid frontend values to safe defaults", () => {
    const layout = normalizeReceiptSettings({
        ff_receipt_paper_size: "custom",
        ff_receipt_custom_width_mm: "not-a-number",
        ff_receipt_margin_left_mm: "bad",
        ff_receipt_margin_right_mm: "bad",
        ff_receipt_font_profile: "unknown",
    });
    expect(layout.paperWidthMm).toBe(80);
    expect(layout.leftMarginMm).toBe(2);
    expect(layout.rightMarginMm).toBe(2);
    expect(layout.fontProfile).toBe("normal");
});

test("native mode does not change the normalized dimensions", () => {
    const style = receiptStyle({ ff_receipt_print_mode: "native" });
    expect(style).toContain("--ff-receipt-content-width: 76mm");
});
