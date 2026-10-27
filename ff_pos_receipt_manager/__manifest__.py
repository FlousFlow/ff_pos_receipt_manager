{
    "name": "POS Receipt Manager",
    "version": "19.0.1.0.0",
    "category": "Sales/Point of Sale",
    "summary": "Configurable thermal receipt formatting for Odoo POS",
    "description": "Prepare browser POS receipts for configurable thermal paper widths without claiming hardware printer control.",
    "author": "Flous Flow",
    "website": "https://flousflow.com",
    "support": "support@flousflow.com",
    "license": "LGPL-3",
    "icon": "ff_pos_receipt_manager/static/description/icon.png",
    "images": [
        "static/description/images/receipt_preview_screenshot.png",
        "static/description/icon.png",
    ],
    "depends": ["point_of_sale"],
    "data": ["views/pos_config_views.xml"],
    "assets": {
        "point_of_sale._assets_pos": [
            "ff_pos_receipt_manager/static/src/js/receipt_layout.js",
            "ff_pos_receipt_manager/static/src/js/order_receipt_patch.js",
            "ff_pos_receipt_manager/static/src/xml/order_receipt.xml",
            "ff_pos_receipt_manager/static/src/scss/receipt.scss",
        ],
        "web.assets_unit_tests": [
            "ff_pos_receipt_manager/static/tests/unit/receipt_layout.test.js",
        ],
    },
    "installable": True,
    "application": False,
}
