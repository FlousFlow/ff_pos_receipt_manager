import math

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class PosConfig(models.Model):
    _inherit = "pos.config"

    ff_receipt_manager_enabled = fields.Boolean(
        string="Enable Receipt Manager", default=True,
        help="Apply the configured receipt layout to POS receipt output.",
    )
    ff_receipt_print_mode = fields.Selection(
        [("browser", "Browser Print"), ("native", "Native Odoo Printer")],
        string="Printing Method", default="browser", required=True,
    )
    ff_receipt_paper_size = fields.Selection(
        [("58", "58mm"), ("80", "80mm"), ("112", "112mm"), ("custom", "Custom")],
        string="Paper Width", default="80", required=True,
    )
    ff_receipt_custom_width_mm = fields.Float(string="Custom Width (mm)", digits=(16, 2))
    ff_receipt_margin_left_mm = fields.Float(
        string="Left Margin (mm)", default=2.0, digits=(16, 2), required=True,
    )
    ff_receipt_margin_right_mm = fields.Float(
        string="Right Margin (mm)", default=2.0, digits=(16, 2), required=True,
    )
    ff_receipt_font_profile = fields.Selection(
        [("small", "Small"), ("normal", "Normal"), ("large", "Large")],
        string="Font Profile", default="normal", required=True,
    )
    ff_receipt_printable_width_mm = fields.Float(
        string="Printer Printable Width (mm)", digits=(16, 2),
        help="Optional usable printhead width. Leave empty to use paper width minus margins.",
    )

    @api.constrains(
        "ff_receipt_paper_size", "ff_receipt_custom_width_mm",
        "ff_receipt_margin_left_mm", "ff_receipt_margin_right_mm",
        "ff_receipt_printable_width_mm",
    )
    def _check_receipt_dimensions(self):
        for config in self:
            margins = config.ff_receipt_margin_left_mm + config.ff_receipt_margin_right_mm
            if not all(math.isfinite(value) for value in (
                config.ff_receipt_margin_left_mm,
                config.ff_receipt_margin_right_mm,
                config.ff_receipt_custom_width_mm,
                config.ff_receipt_printable_width_mm,
            )):
                raise ValidationError(_("Receipt dimensions must be finite numbers."))
            if config.ff_receipt_margin_left_mm < 0 or config.ff_receipt_margin_right_mm < 0:
                raise ValidationError(_("Receipt margins cannot be negative."))
            paper_width = config._ff_receipt_paper_width()
            if paper_width <= 0:
                raise ValidationError(_("Receipt paper width must be positive."))
            if margins >= paper_width:
                raise ValidationError(_("Receipt margins must leave a positive content width."))
            if config.ff_receipt_printable_width_mm and not 1 <= config.ff_receipt_printable_width_mm <= paper_width:
                raise ValidationError(_("Printable width must be between 1mm and the paper width."))

    def _ff_receipt_paper_width(self):
        self.ensure_one()
        if self.ff_receipt_paper_size == "custom":
            width = self.ff_receipt_custom_width_mm
            if not 40 <= width <= 210:
                raise ValidationError(_("Custom receipt width must be between 40mm and 210mm."))
            return width
        return float(self.ff_receipt_paper_size)

    @api.model
    def _load_pos_data_fields(self, config):
        # Odoo 19 Community's base ``pos.config`` model does not provide a
        # concrete field list for the POS loader. Keep the list here explicit:
        # it is the stable set consumed by the POS store and receipt renderer,
        # while avoiding one2many/session history payloads.
        fields_to_load = super()._load_pos_data_fields(config)
        fields_to_load += [
            "id", "name", "company_id", "currency_id", "journal_id", "invoice_journal_id",
            "use_pricelist", "pricelist_id", "available_pricelist_ids", "payment_method_ids",
            "fast_payment_method_ids", "fiscal_position_ids", "default_fiscal_position_id",
            "iface_tax_included", "iface_print_auto", "iface_print_skip_screen", "iface_print_via_proxy",
            "iface_printers", "iface_cashdrawer", "iface_electronic_scale", "iface_scan_via_proxy",
            "iface_available_categ_ids", "limit_categories", "iface_group_by_categ", "show_category_images",
            "show_product_images", "iface_big_scrollbars", "manual_discount", "restrict_price_control",
            "cash_control", "cash_rounding", "only_round_cash_method", "rounding_method",
            "basic_receipt", "receipt_header", "receipt_footer", "tip_product_id", "iface_tipproduct",
            "ship_later", "use_presets", "available_preset_ids", "default_preset_id", "use_fast_payment",
            "module_pos_hr", "module_pos_restaurant", "module_pos_discount", "module_pos_sms",
            "module_pos_appointment", "module_pos_avatax", "is_posbox", "proxy_ip", "other_devices",
            "epson_printer_ip", "printer_ids", "trusted_config_ids", "access_token", "uuid",
        ]
        fields_to_load += [
            "ff_receipt_manager_enabled", "ff_receipt_print_mode", "ff_receipt_paper_size",
            "ff_receipt_custom_width_mm", "ff_receipt_margin_left_mm", "ff_receipt_margin_right_mm",
            "ff_receipt_font_profile", "ff_receipt_printable_width_mm",
        ]
        # Keep this compatible with optional POS addons that rename/remove a
        # frontend-only convenience property (for example ``iface_printers``).
        return list(dict.fromkeys(field_name for field_name in fields_to_load if field_name in self._fields))
