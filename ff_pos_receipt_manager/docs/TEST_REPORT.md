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

## Structured raw receipt update

| Test | Result | Evidence |
|---|---|---|
| Odoo JavaScript syntax | PASS | `node --check static/src/js/raw_api_printer.js` |
| Android debug build | PASS | `:app:assembleDebug` |
| Android unit tests | PASS | `:app:testDebugUnitTest` |
| Structured protocol on physical RPP30 | NOT EXECUTED | No Android device/printer attached during implementation |
| Old bridge compatibility | Designed | Structured request falls back to the existing raster request when the bridge returns `invalid_request` before Bluetooth send |

The original standalone workspace has no Odoo runtime, so the runtime evidence above was collected in the local Docker Odoo 19 lab (`ff_lab_odoo19`).

## Shared print trace ID update (20.0.1.3.7)

| Test | Result | Evidence |
|---|---|---|
| Odoo direct printer JavaScript syntax | PASS | Node module syntax check |
| Odoo manifest parsing | PASS | Python `ast.literal_eval` |
| Arabic PO/POT syntax | PASS | `msgfmt --check`; POT warns that template has no `Language` header, which is expected for an untranslated template |
| Android unit tests | PASS | Gradle `:app:testDebugUnitTest` |
| Android debug APK | PASS | Gradle `:app:assembleDebug` |
| Android HTTP trace/status runtime | NOT EXECUTED | No emulator/device attached |
| Odoo 20 module upgrade | PASS | Isolated clone upgrade loaded registry at `20.0.1.3.7`; production `brand_builders` also upgraded to `20.0.1.3.7` |
| Production service smoke check | PASS | `odoo20` active; login endpoint returned HTTP 200 after restart |
| Live POS browser trace and status polling | NOT EXECUTED | No authenticated cashier browser or Android device attached |
| Physical Bluetooth/paper output | NOT EXECUTED | No printer device attached |

## CORS print request fix (20.0.1.3.8)

| Test | Result | Evidence |
|---|---|---|
| Odoo JavaScript syntax | PASS | Node module syntax check |
| Trace ID remains in print JSON | PASS | `request_id` remains in body; custom `X-Print-Request-ID` header removed |
| Android preflight compatibility | PASS by contract | Remaining `Authorization` and `Content-Type` headers are explicitly allowed by Print Bridge 1.0.14 |
| Live phone/browser print | NOT EXECUTED | Requires cashier phone and paired printer |
