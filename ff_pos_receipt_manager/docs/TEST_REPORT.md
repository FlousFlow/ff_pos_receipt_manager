# Test report

## Executed in the local Odoo 19 lab

| Test | Result | Evidence |
|---|---|---|
| Module installation | PASS | `ff_pos_receipt_manager` installed in `ff_lab_odoo19` |
| Module upgrade and Python tests | PASS | 3 test cases, 0 failures, 0 errors |
| Defaults and ORM constraints | PASS | 80mm defaults, invalid custom width and margins rejected |
| POS asset bundle compilation | PASS | JS/CSS/XML emitted in `point_of_sale._assets_pos` |
| Unit-test bundle inclusion | PASS | `receipt_layout.test.js` present in `web.assets_unit_tests` |
| Browser POS smoke test | PASS | Opened register, sold Office Lamp/Office Chair, paid cash, rendered receipt |
| Browser print page size | PASS | Chromium PDF output measured 80mm wide instead of Letter |
| Physical printer | NOT EXECUTED | No hardware acceptance device attached |

The original standalone workspace has no Odoo runtime, so the runtime evidence above was collected in the local Docker Odoo 19 lab (`ff_lab_odoo19`).
