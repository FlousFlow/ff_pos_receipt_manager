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
        # Odoo 20's base ``pos.config`` keeps the default loader list empty,
        # which means read-all fields. Preserve that behavior while making
        # these addon settings explicit for the POS relation metadata.
        fields_to_load = super()._load_pos_data_fields(config)
        if not fields_to_load:
            fields_to_load = list(self._fields)
        fields_to_load += [
            "ff_receipt_manager_enabled", "ff_receipt_print_mode", "ff_receipt_paper_size",
            "ff_receipt_custom_width_mm", "ff_receipt_margin_left_mm", "ff_receipt_margin_right_mm",
            "ff_receipt_font_profile", "ff_receipt_printable_width_mm",
        ]
        # Keep this compatible with optional POS addons that add/remove fields.
        return list(dict.fromkeys(field_name for field_name in fields_to_load if field_name in self._fields))
