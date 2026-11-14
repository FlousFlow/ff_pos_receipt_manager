# Odoo 20 Engineering Log

## 2026-11-14 — Thermal system-print optimization (20.0.1.0.1)

- Evidence: Odoo 20 renders the POS receipt as HTML in an iframe and calls the browser/system print path. The addon previously measured receipt height before applying the configured thermal width; its font profile was not applied in the print stylesheet.
- Change: apply the configured width first, force layout, then measure page height; enforce thermal page dimensions, use the configured font profile, bound the receipt logo, and remove print-only shadows. Receipt content and business calculations are unchanged.
- Upgrade compatibility: restored Odoo module/record references in the Arabic PO/POT catalogs; the upstream catalogs lacked module metadata and failed Odoo's translation importer during upgrade.
- Boundary: the Android/system print service still converts and sends the print job; this addon cannot control its Bluetooth transfer speed. No physical printer or Android system print dialog was available for verification.
- Validation: JavaScript syntax, manifest parsing, and `git diff --check` only; automated test suites were not run.
- Deployment: pending backup, test database upgrade, and production upgrade.

## 2026-11-14 — Remove temporary long page size (20.0.1.0.2)

- Evidence: the previous print patch temporarily declared a 1000mm page while measuring content; Android can capture that size before the final style update.
- Change: measure after thermal-width reflow using an automatic temporary page height, then set only the measured final page height.
- Validation: pending static checks, test database upgrade, and physical system-print confirmation.
