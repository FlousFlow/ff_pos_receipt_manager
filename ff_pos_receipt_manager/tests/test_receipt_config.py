from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase


class TestReceiptConfig(TransactionCase):
    def test_default_layout_values(self):
        config = self.env["pos.config"].new({"name": "Receipt test"})
        self.assertTrue(config.ff_receipt_manager_enabled)
        self.assertEqual(config.ff_receipt_paper_size, "80")
        self.assertEqual(config.ff_receipt_margin_left_mm, 2.0)
        self.assertEqual(config.ff_receipt_margin_right_mm, 2.0)

    def test_custom_width_is_bounded(self):
        config = self.env["pos.config"].new({
            "name": "Receipt test", "ff_receipt_paper_size": "custom",
            "ff_receipt_custom_width_mm": 39,
        })
        with self.assertRaises(ValidationError):
            config._ff_receipt_paper_width()

    def test_margins_must_leave_content(self):
        config = self.env["pos.config"].new({
            "name": "Receipt test", "ff_receipt_margin_left_mm": 40,
            "ff_receipt_margin_right_mm": 41,
        })
        with self.assertRaises(ValidationError):
            config._check_receipt_dimensions()
