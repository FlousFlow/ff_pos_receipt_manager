import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { PosTicketPrinterPlugin } from "@point_of_sale/app/plugins/pos_ticket_printer_plugin";

function trimCanvas(canvas) {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let top = canvas.height;
    let bottom = -1;
    for (let y = 0; y < canvas.height; y++) {
        let ink = false;
        for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if ((pixels[i] * 299 + pixels[i + 1] * 587 + pixels[i + 2] * 114) / 1000 < 245) {
                ink = true;
                break;
            }
        }
        if (ink) {
            top = Math.min(top, y);
            bottom = y;
        }
    }
    if (bottom < top) return canvas;
    const margin = Math.max(8, Math.round(canvas.width * 0.015));
    const cropped = document.createElement("canvas");
    cropped.width = canvas.width;
    cropped.height = Math.min(canvas.height, bottom - top + 1 + margin * 2);
    const target = cropped.getContext("2d");
    target.fillStyle = "#fff";
    target.fillRect(0, 0, cropped.width, cropped.height);
    const sourceTop = Math.max(0, top - margin);
    const sourceHeight = Math.min(canvas.height - sourceTop, cropped.height);
    target.drawImage(canvas, 0, sourceTop, canvas.width, sourceHeight, 0, 0, cropped.width, sourceHeight);
    return cropped;
}

function canvasToEscPos(canvas, widthDots) {
    canvas = trimCanvas(canvas);
    const width = Math.max(256, Math.min(832, Number(widthDots) || 576));
    const height = Math.max(1, Math.round(canvas.height * width / canvas.width));
    const scaled = document.createElement("canvas");
    scaled.width = width;
    scaled.height = height;
    const context = scaled.getContext("2d", { willReadFrequently: true });
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(canvas, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const fullWidthBytes = Math.ceil(width / 8);
    const fullRaster = new Uint8Array(fullWidthBytes * height);
    let minX = width;
    let maxX = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            const gray = (pixels[index] * 299 + pixels[index + 1] * 587 + pixels[index + 2] * 114) / 1000;
            if (gray < 180) {
                fullRaster[y * fullWidthBytes + Math.floor(x / 8)] |= 0x80 >> (x & 7);
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
            }
        }
    }
    // Drop only exterior white columns, retaining 24 printer dots (about 3 mm)
    // around the ink for receipt edges and barcode quiet zones.
    const horizontalMargin = 24;
    const cropLeft = maxX < 0 ? 0 : Math.max(0, minX - horizontalMargin);
    const cropRight = maxX < 0 ? width - 1 : Math.min(width - 1, maxX + horizontalMargin);
    const rasterWidth = cropRight - cropLeft + 1;
    const widthBytes = Math.ceil(rasterWidth / 8);
    const raster = new Uint8Array(widthBytes * height);
    for (let y = 0; y < height; y++) {
        for (let x = cropLeft; x <= cropRight; x++) {
            const sourceByte = fullRaster[y * fullWidthBytes + Math.floor(x / 8)];
            if (sourceByte & (0x80 >> (x & 7))) {
                const destinationX = x - cropLeft;
                raster[y * widthBytes + Math.floor(destinationX / 8)] |= 0x80 >> (destinationX & 7);
            }
        }
    }
    // Sending a full-width bitmap for every blank line wastes Bluetooth time.
    // Keep the raster exactly the same, but use ESC J to feed long white runs.
    const chunks = [new Uint8Array([0x1b, 0x40, 0x1b, 0x61, 0x01])];
    const appendFeed = (rows) => {
        while (rows > 0) {
            const amount = Math.min(rows, 255);
            chunks.push(new Uint8Array([0x1b, 0x4a, amount]));
            rows -= amount;
        }
    };
    const appendRaster = (startRow, rowCount) => {
        if (!rowCount) return;
        const header = new Uint8Array([
            0x1d, 0x76, 0x30, 0x00,
            widthBytes & 0xff, (widthBytes >> 8) & 0xff,
            rowCount & 0xff, (rowCount >> 8) & 0xff,
        ]);
        chunks.push(header, raster.subarray(startRow * widthBytes, (startRow + rowCount) * widthBytes));
    };

    let row = 0;
    let rasterStart = 0;
    while (row < height) {
        let blankEnd = row;
        while (blankEnd < height) {
            let hasInk = false;
            const offset = blankEnd * widthBytes;
            for (let byte = 0; byte < widthBytes; byte++) {
                if (raster[offset + byte] !== 0) {
                    hasInk = true;
                    break;
                }
            }
            if (hasInk) break;
            blankEnd++;
        }
        const blankRows = blankEnd - row;
        if (blankRows >= 1) {
            appendRaster(rasterStart, row - rasterStart);
            appendFeed(blankRows);
            row = blankEnd;
            rasterStart = row;
        } else {
            row = blankRows ? blankEnd : row + 1;
        }
    }
    appendRaster(rasterStart, height - rasterStart);
    chunks.push(new Uint8Array([0x1b, 0x64, 0x03]));

    const payload = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
        payload.set(chunk, offset);
        offset += chunk.length;
    }
    return { payload, rasterWidthDots: rasterWidth };
}

function base64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunk) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
    }
    return btoa(binary);
}

function directPrintFailureMessage(error) {
    if (error instanceof TypeError) {
        return _t("Odoo could not reach FlousFlow Print. Tap Allow printer access below, then retry the receipt.");
    }
    return _t("Direct printing failed. Check FlousFlow Print and its connection.");
}

function rawApiUrl(config) {
    return config.ff_raw_api_url || "http://127.0.0.1:8765/print/raw";
}

function newPrintRequestId() {
    return globalThis.crypto?.randomUUID?.() || `ff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function diagnosticIdLabel(requestId) {
    return `${_t("Diagnostic ID:")} ${requestId}`;
}

function diagnosticStageLabel(stage) {
    return stage ? `${_t("Stage:")} ${stage}` : "";
}

function bridgeSuccessMessage(requestId, stage) {
    return `${_t("Bluetooth data write completed. Paper output is not confirmed by the app.")} ${diagnosticStageLabel(stage)} ${diagnosticIdLabel(requestId)}`;
}

function bridgeResponseError(result, status, requestId) {
    const error = new Error(result?.message || `HTTP ${status}`);
    error.status = status;
    error.requestId = result?.request_id || requestId;
    error.code = result?.error || result?.code;
    error.stage = result?.stage;
    return error;
}

async function connectRawPrinter(config, requestId) {
    const apiUrl = rawApiUrl(config);
    const pairUrl = apiUrl.replace(/\/print\/raw(?:\?.*)?$/, "/pair");
    const pairRequestUrl = `${pairUrl}${pairUrl.includes("?") ? "&" : "?"}request_id=${encodeURIComponent(requestId)}`;
    // Start this fetch directly from the notification button click. Chrome only
    // shows its Loopback permission prompt for an explicit user gesture.
    console.info("FlousFlow printer trace: pairing request", { requestId });
    const response = await fetch(pairRequestUrl, { mode: "cors", targetAddressSpace: "loopback" });
    const pair = await response.json().catch(() => ({}));
    if (!response.ok || !pair.success || !pair.token || !pair.printer_address) {
        throw bridgeResponseError(pair, response.status, requestId);
    }
    config.ff_raw_api_token = pair.token;
    config.ff_raw_printer_address = pair.printer_address;
    console.info("FlousFlow printer trace: app pairing confirmed", { requestId, appRequestId: pair.request_id, stage: pair.stage });
    return pair;
}

async function readRawPrintStatus(config, requestId) {
    const token = config.ff_raw_api_token;
    if (!token) return null;
    const statusUrl = rawApiUrl(config).replace(/\/print\/raw(?:\?.*)?$/, "/print/status");
    const url = `${statusUrl}?request_id=${encodeURIComponent(requestId)}`;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1500);
            let response;
            try {
                response = await fetch(url, {
                    mode: "cors",
                    targetAddressSpace: "loopback",
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                    cache: "no-store",
                });
            } finally {
                clearTimeout(timeout);
            }
            if (!response.ok) return null;
            const result = await response.json().catch(() => null);
            if (!result?.found || !["bluetooth_sending", "request_received"].includes(result.stage)) {
                return result;
            }
        } catch (error) {
            console.warn("FlousFlow printer status lookup failed", { requestId, attempt, error });
            return null;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
}

function notifyRawApiFailure(notification, config, error, retryAction, requestId) {
    if (error instanceof TypeError && /Android/i.test(navigator.userAgent)) {
        notification.add(`${_t("Open POS from FlousFlow Print to print without browser network permissions.")} ${diagnosticIdLabel(requestId)}`, {
            type: "danger",
            sticky: true,
            buttons: [{
                name: _t("Open POS in FlousFlow Print"),
                primary: true,
                onClick: () => {
                    window.location.href = "flousflowprint://open-pos";
                },
            }],
        });
        return;
    }
    if (!(error instanceof TypeError)) {
        const detail = error.message || directPrintFailureMessage(error);
        notification.add(`${detail} ${diagnosticStageLabel(error.stage)} ${diagnosticIdLabel(requestId)}`, { type: "danger", sticky: true });
        return;
    }
    let closeFailureNotice;
    let closeRetryNotice;
    let recoveryStarted = false;
    closeFailureNotice = notification.add(directPrintFailureMessage(error), {
        type: "danger",
        sticky: true,
        buttons: [{
            name: _t("Allow printer access"),
            primary: true,
            onClick: async () => {
                recoveryStarted = true;
                try {
                    const pair = await connectRawPrinter(config, requestId);
                    closeFailureNotice?.();
                    closeRetryNotice = notification.add(`${_t("Site access is ready. Tap Retry receipt to print this receipt.")} ${diagnosticStageLabel(pair.stage)} ${diagnosticIdLabel(requestId)}`, {
                        type: "success",
                        sticky: true,
                        buttons: [{
                            name: _t("Retry receipt"),
                            primary: true,
                            onClick: async () => {
                                closeRetryNotice?.();
                                await retryAction?.();
                            },
                        }],
                    });
                } catch (connectionError) {
                    console.error("FlousFlow Loopback permission request failed", connectionError);
                    notification.add(
                        _t("Local printer access is still blocked. Allow local network access for this Odoo site in browser settings, then tap Allow printer access again."),
                        { type: "danger", sticky: true }
                    );
                }
            },
        }],
    });
    readRawPrintStatus(config, requestId).then((trace) => {
        if (recoveryStarted) return;
        if (!trace) {
            notification.add(`${_t("The print app did not return a status for this attempt.")} ${diagnosticStageLabel("unknown")} ${diagnosticIdLabel(requestId)}`, {
                type: "warning",
                sticky: true,
            });
            return;
        }
        const details = trace.found && trace.stage === "paired"
            ? _t("The app pairing succeeded, but this print request did not reach it.")
            : trace.found
            ? `${_t("App stage:")} ${trace.stage}${trace.error ? ` (${trace.error})` : ""}${trace.bytes_sent ? `, ${_t("bytes:")} ${trace.bytes_sent}` : ""}`
            : _t("The print request did not reach the Android print app.");
        notification.add(`${details} ${diagnosticIdLabel(requestId)}`, {
            type: trace.found && trace.stage === "bluetooth_write_completed" ? "success" : "warning",
            sticky: true,
        });
    });
}

async function sendCanvasToRawApi(config, canvas, requestId) {
    const widthDots = Number(config.ff_receipt_paper_size) === 58 ? 384 : 576;
    const { payload, rasterWidthDots } = canvasToEscPos(canvas, widthDots);
    const uncompressedRasterBytes = Math.ceil(widthDots / 8) * Math.max(1, Math.round(canvas.height * widthDots / canvas.width));
    console.info("FlousFlow direct print sending", {
        widthDots,
        rasterWidthDots,
        sourceHeight: canvas.height,
        bytes: payload.length,
        uncompressedRasterBytes,
        savedBytes: Math.max(0, uncompressedRasterBytes - payload.length),
        encoding: "ESC/POS raster with blank-line feed compression",
    });
    const result = await postRawPayload(config, {
        protocol: "ESC_POS",
        payload_base64: base64(payload),
    }, requestId);
    console.info("FlousFlow direct print accepted", {
        requestId,
        appRequestId: result.request_id,
        stage: result.stage,
        bytes: payload.length,
        elapsedMs: result.elapsed_ms,
    });
    return { successful: true, bytes: payload.length, elapsedMs: result.elapsed_ms, stage: result.stage };
}

function printable(value) {
    return value === null || value === undefined || typeof value === "boolean"
        ? ""
        : String(value).replace(/[\r\n]+/g, " ").trim();
}

async function structuredReceiptFromData(data, config) {
    const lines = [];
    const add = (text, align = "left", size = "normal", bold = false) => {
        const value = printable(text);
        if (value) lines.push({ text: value, align, size, bold });
    };
    const company = data.company || {};
    const receiptConfig = data.config || {};
    const order = data.order || {};
    const extra = data.extra_data || {};
    const prices = extra.prices || {};
    const logoUrl = data.image?.logo;
    const logoDataUri = typeof logoUrl === "string" && logoUrl.startsWith("data:image/")
        ? logoUrl
        : "";
    add(company.name, "center", "large", true);
    add(receiptConfig.receipt_header, "center");
    add(`${_t("Ticket")} ${order.pos_reference || ""}`.trim(), "center");
    add(extra.formated_date_order, "center", "small");
    if (extra.cashier_name) add(`${_t("Served by:")} ${extra.cashier_name}`, "center", "small");
    if (data.partner?.name) add(data.partner.name, "center");
    if (order.floating_order_name && order.floating_order_name !== order.tracking_number) {
        add(order.floating_order_name, "center");
    }
    if (order.tracking_number && data.conditions?.module_pos_restaurant) {
        add(order.tracking_number, "center", "large", true);
    }
    for (const line of data.lines || []) {
        if (line.combo_parent_id) continue;
        const qty = printable(line.qty);
        const name = printable(line.product_data?.display_name || line.full_product_name || line.name);
        const price = printable(line.price_subtotal_incl);
        const suffix = line.discount ? ` -${printable(line.discount)}%` : "";
        add(`${qty} x ${name}${suffix}    ${price}`.trim(), "left");
        if (line.customer_note) add(`  ${printable(line.customer_note)}`, "left", "small");
    }
    if (order.general_customer_note) add(`${_t("Note:")} ${order.general_customer_note}`, "left", "small");
    if (!data.conditions?.basic_receipt) {
        add(`${_t("Subtotal:")} ${printable(prices.subtotal_amount)}`, "left", "large");
        for (const tax of prices.taxes || []) {
            add(`${printable(tax.name)} ${printable(tax.amount)}`, "left", "normal");
        }
        if (prices.rounding_amount) add(`${_t("Rounding:")} ${printable(prices.rounding_amount)}`, "left", "normal", true);
        add(`${_t("Total:")} ${printable(prices.total_amount)}`, "left", "large", true);
        if (prices.discount_amount) add(`${_t("Discount:")} ${printable(prices.discount_amount)}`, "left", "normal");
        for (const payment of data.payments || []) {
            add(`${printable(payment.payment_method_data?.name)} ${printable(payment.amount)}`, "left", "normal");
        }
        if (order.amount_return || order.amount_return_currency) {
            add(`${_t("Change:")} ${printable(order.amount_return_currency || order.amount_return)}`, "left", "normal", true);
        }
    }
    if (extra.total_item_count) add(`${_t("Total Items")} ${printable(extra.total_item_count)}`, "left", "normal", true);
    if (data.conditions?.use_self_invoicing && data.conditions?.display_url) {
        add(_t("Need an invoice?"), "left", "normal", true);
        add(`${printable(extra.self_invoicing_url)}`, "left", "small");
        if (order.ticket_code) add(`${_t("Code:")} ${printable(order.ticket_code)}`, "left", "small");
    }
    add(receiptConfig.receipt_footer, "center", "small");
    const qrValue = data.conditions?.display_qr_code && order.uuid && extra.self_invoicing_url
        ? `${extra.self_invoicing_url}?order_uuid=${encodeURIComponent(order.uuid)}`
        : "";
    return {
        paper_width_mm: Number(config.ff_receipt_paper_size) || 80,
        font_profile: config.ff_receipt_font_profile || "normal",
        lines,
        logo_data_uri: logoDataUri,
        qr_value: qrValue,
        feed_lines: 3,
    };
}

async function postRawPayload(config, payload, requestId) {
    const nativeBridge = globalThis.FlousFlowPrint;
    if (nativeBridge && typeof nativeBridge.printRaw === "function") {
        let result;
        try {
            result = JSON.parse(nativeBridge.printRaw(requestId, JSON.stringify(payload)));
        } catch (cause) {
            const error = new Error(cause?.message || _t("The native print bridge failed."));
            error.code = "native_bridge_failed";
            error.stage = "native_bridge";
            error.requestId = requestId;
            throw error;
        }
        if (!result.success) {
            throw bridgeResponseError(result, result.status || 502, requestId);
        }
        console.info("FlousFlow native print bridge completed", {
            requestId,
            stage: result.stage,
            bytes: result.bytes_sent,
            elapsedMs: result.elapsed_ms,
        });
        return result;
    }
    const apiUrl = rawApiUrl(config);
    let token = config.ff_raw_api_token;
    let printerAddress = config.ff_raw_printer_address;
    if (!token || !printerAddress) {
        const pairUrl = apiUrl.replace(/\/print\/raw(?:\?.*)?$/, "/pair");
        const pairRequestUrl = `${pairUrl}${pairUrl.includes("?") ? "&" : "?"}request_id=${encodeURIComponent(requestId)}`;
        const pairResponse = await fetch(pairRequestUrl, { mode: "cors", targetAddressSpace: "loopback" });
        const pair = await pairResponse.json().catch(() => ({}));
        if (!pairResponse.ok || !pair.success || !pair.token || !pair.printer_address) {
            throw bridgeResponseError(pair, pairResponse.status, requestId);
        }
        token = pair.token;
        printerAddress = pair.printer_address;
        config.ff_raw_api_token = token;
        config.ff_raw_printer_address = printerAddress;
    }
    const response = await fetch(apiUrl, {
        method: "POST", mode: "cors", targetAddressSpace: "loopback",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, printer_address: printerAddress, request_id: requestId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
        throw bridgeResponseError(result, response.status, requestId);
    }
    console.info("FlousFlow printer trace: app returned print result", {
        requestId,
        appRequestId: result.request_id,
        stage: result.stage,
        bytes: result.bytes_sent,
        elapsedMs: result.elapsed_ms,
    });
    return result;
}

async function sendStructuredReceiptToRawApi(config, data, requestId) {
    const receipt = await structuredReceiptFromData(data, config);
    console.info("FlousFlow structured receipt sending", {
        lines: receipt.lines.length,
        paperWidthMm: receipt.paper_width_mm,
        qr: Boolean(receipt.qr_data_url),
    });
    const result = await postRawPayload(config, { protocol: "ESC_POS_STRUCTURED", receipt }, requestId);
    console.info("FlousFlow structured receipt accepted", result);
    return { successful: true, bytes: result.bytes_sent, elapsedMs: result.elapsed_ms, stage: result.stage };
}

async function sendReceiptToRawApi(config, data, canvas = null, requestId) {
    try {
        return await sendStructuredReceiptToRawApi(config, data, requestId);
    } catch (error) {
        // Older bridge builds reject the structured protocol before opening Bluetooth.
        // Keep the existing raster path as a safe compatibility fallback.
        if (canvas && (error.status === 400 || error.status === 415) && error.code === "invalid_request") {
            console.warn("FlousFlow structured protocol unavailable; using raster fallback");
            return await sendCanvasToRawApi(config, canvas, requestId);
        }
        throw error;
    }
}

patch(PosTicketPrinterPlugin.prototype, {
    async printOrderReceipt(options = {}) {
        const config = this.config;
        const requestId = options.ff_print_request_id || newPrintRequestId();
        console.info("FlousFlow order receipt print entry", {
            configId: config?.id,
            enabled: Boolean(config?.ff_receipt_manager_enabled),
            mode: config?.ff_receipt_print_mode || "unset",
        });
        if (config?.ff_receipt_manager_enabled && config.ff_receipt_print_mode === "raw_api") {
            console.info("FlousFlow order receipt routed to raw ESC/POS API");
            const {
                order,
                basic = false,
                printBillActionTriggered = false,
                simplified = false,
            } = options;
            try {
                const data = this.getOrderReceiptData(order, { basic, simplified });
                const iframe = await this.generateIframe("point_of_sale.pos_order_receipt", data);
                const canvas = await this.generateImage(iframe);
                const result = await sendReceiptToRawApi(config, data, canvas, requestId);
                this.notification.add(bridgeSuccessMessage(requestId, result.stage), { type: "success" });
                if (!printBillActionTriggered) {
                    await this.markReceiptAsPrinted(order);
                } else if (!order.nb_print) {
                    order.nb_print = 0;
                }
                return result;
            } catch (error) {
                console.error("FlousFlow order receipt raw print failed", error);
                console.error("FlousFlow print trace failed", { requestId, stage: error.stage, code: error.code }, error);
                notifyRawApiFailure(
                    this.notification,
                    config,
                    error,
                    () => this.printOrderReceipt({ ...options, ff_print_request_id: requestId }),
                    requestId
                );
                return { successful: false };
            }
        }
        return super.printOrderReceipt(...arguments);
    },

    _print(window, requestId = newPrintRequestId()) {
        const config = this.config;
        if (config?.ff_receipt_manager_enabled && config.ff_receipt_print_mode === "raw_api") {
            console.info("FlousFlow intercepted Odoo window.print for raw ESC/POS", {
                configId: config.id,
                mode: config.ff_receipt_print_mode,
            });
            const iframe = window?.frameElement;
            if (!iframe) {
                this.notification.add(_t("Direct printing could not access the receipt preview."), { type: "danger" });
                return;
            }
            this.generateImage(iframe)
                .then((canvas) => sendCanvasToRawApi(config, canvas, requestId))
                .then((result) => this.notification.add(bridgeSuccessMessage(requestId, result.stage), { type: "success" }))
                .catch((error) => {
                    console.error("FlousFlow window.print interception failed", error);
                    notifyRawApiFailure(this.notification, config, error, () => this._print(window, requestId), requestId);
                });
            return;
        }
        return super._print(...arguments);
    },

    async printWithFallback(options = {}) {
        const config = this.config;
        const requestId = options.ff_print_request_id || newPrintRequestId();
        console.info("FlousFlow POS receipt print route", {
            enabled: Boolean(config?.ff_receipt_manager_enabled),
            mode: config?.ff_receipt_print_mode || "unset",
        });
        if (config.ff_receipt_manager_enabled && config.ff_receipt_print_mode === "raw_api") {
            console.info("FlousFlow POS direct ESC/POS path selected");
            try {
                const canvas = options.image || await this.generateImage(options.iframe);
                const data = options.data || null;
                const result = data
                    ? await sendReceiptToRawApi(config, data, canvas, requestId)
                    : await sendCanvasToRawApi(config, canvas, requestId);
                this.notification.add(bridgeSuccessMessage(requestId, result.stage), { type: "success" });
                return { successful: result.successful };
            } catch (error) {
                console.error("FlousFlow POS direct ESC/POS path failed", error);
                console.error("FlousFlow print trace failed", { requestId, stage: error.stage, code: error.code }, error);
                notifyRawApiFailure(
                    this.notification,
                    config,
                    error,
                    () => this.printWithFallback({ ...options, ff_print_request_id: requestId }),
                    requestId
                );
                return { successful: false };
            }
        }
        return super.printWithFallback(...arguments);
    },
});
