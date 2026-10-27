# Test report

## Odoo 20 port validation

| Test | Result | Evidence |
|---|---|---|
| Odoo 20 source compatibility audit | PASS | Reviewed official 20.0 POS receipt and ticket-printer sources |
| Module installation | PASS | Installed in isolated Odoo 20 database `ff_receipt20_test` |
| Module upgrade and Python tests | PASS | 3 test cases, 0 failures, 0 errors on Odoo 20.0 |
| Defaults and ORM constraints | PASS | 80mm defaults, invalid custom width and margins rejected |
| POS asset declaration | PASS | Odoo 20 ticket-printer patch is in `point_of_sale._assets_pos` |
| Unit-test bundle inclusion | PASS | `receipt_layout.test.js` present in `web.assets_unit_tests` |
| Browser POS smoke test | NOT EXECUTED | Requires an authenticated Odoo 20 browser session |
| Browser print page size | NOT EXECUTED | Requires an Odoo 20 browser/print-preview session |
| Physical printer | NOT EXECUTED | No hardware acceptance device attached |

The 20.0 branch was ported against the official Odoo 20 source audit and installed/tested in an isolated Odoo 20 container/database. Browser and physical-printer acceptance remain separate checks.
