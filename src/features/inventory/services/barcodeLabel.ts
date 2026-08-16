/**
 * Barcode label rendering for the storekeeper's inventory screen.
 */

export interface BarcodeLabelItem {
  item_code: string;
  item_name: string;
  barcode: string | null;
  selling_price?: number;
}

/* -------------------------------------------------------------------------- */
/* Code128 encoding                                                           */
/* -------------------------------------------------------------------------- */

const CODE128_PATTERNS = [
  "11011001100", "11001101100", "11001100110", "10010011000", "10010001100",
  "10001001100", "10011001000", "10011000100", "10001100100", "11001001000",
  "11001000100", "11000100100", "10110011100", "10011011100", "10011001110",
  "10111001100", "10011101100", "10011100110", "11001110010", "11001011100",
  "11001001110", "11011100100", "11001110100", "11101101110", "11101001100",
  "11100101100", "11100100110", "11101100100", "11100110100", "11100110010",
  "11011011000", "11011000110", "11000110110", "10100011000", "10001011000",
  "10001000110", "10110001000", "10001101000", "10001100010", "11010001000",
  "11000101000", "11000100010", "10110111000", "10110001110", "10001101110",
  "10111011000", "10111000110", "10001110110", "11101110110", "11010001110",
  "11000101110", "11011101000", "11011100010", "11011101110", "11101011000",
  "11101000110", "11100010110", "11101101000", "11101100010", "11100011010",
  "11101111010", "11001000010", "11110001010", "10100110000", "10100001100",
  "10010110000", "10010000110", "10000101100", "10000100110", "10110010000",
  "10110000100", "10011010000", "10011000010", "10000110100", "10000110010",
  "11000010010", "11001010000", "11110111010", "11000010100", "10001111010",
  "10100111100", "10010111100", "10010011110", "10111100100", "10011110100",
  "10011110010", "11110100100", "11110010100", "11110010010", "11011011110",
  "11011110110", "11110110110", "10101111000", "10100011110", "10001011110",
  "10111101000", "10111100010", "11110101000", "11110100010", "10111011110",
  "10111101110", "11101011110", "11110101110", "11010000100", "11010010000",
  "11010011100", "1100011101011",
];

const START_C = 105;
const STOP = 106;

export function encodeCode128(payload: string): { bits: string; text: string } | null {
  const digits = (payload || "").trim();
  if (!/^\d+$/.test(digits) || digits.length % 2 !== 0) return null;

  const values: number[] = [START_C];
  for (let i = 0; i < digits.length; i += 2) {
    values.push(Number(digits.slice(i, i + 2)));
  }

  let sum = values[0];
  for (let i = 1; i < values.length; i++) {
    sum += values[i] * i;
  }
  values.push(sum % 103);
  values.push(STOP);

  return { bits: values.map((v) => CODE128_PATTERNS[v]).join(""), text: digits };
}

/* -------------------------------------------------------------------------- */
/* SVG                                                                        */
/* -------------------------------------------------------------------------- */

const MODULE_W = 2;
const BAR_H = 50;
const QUIET = 4;

function barcodeSvg(bits: string): string {
  let rects = "";
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    rects += `<rect x="${(QUIET + i) * MODULE_W}" y="0" width="${MODULE_W}" height="${BAR_H}" fill="#000"/>`;
  }

  const width = (bits.length + QUIET * 2) * MODULE_W;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${BAR_H}" ` +
    `shape-rendering="crispEdges">` +
    rects +
    `</svg>`
  );
}

function groupedDigits(text: string): string {
  return (text.match(/.{1,4}/g) || [text]).join("&nbsp;");
}

/* -------------------------------------------------------------------------- */
/* Document Generator for Barcode Labels ONLY                                 */
/* -------------------------------------------------------------------------- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelBlock(item: BarcodeLabelItem, encoded: { bits: string; text: string } | null): string {
  const itemName = escapeHtml(item.item_name || item.item_code);
  const price =
    item.selling_price && item.selling_price > 0
      ? `<div class="price">${item.selling_price.toFixed(2)} LE</div>`
      : "";

  const symbol = encoded
    ? `<div class="barcode-image">` +
      barcodeSvg(encoded.bits) +
      `<div class="barcode-number">${groupedDigits(encoded.text)}</div>` +
      `</div>`
    : "";

  const fallback = encoded
    ? ""
    : `<div class="nobarcode">${escapeHtml(item.barcode || "NO BARCODE")}</div>`;

  return `
    <div class="page-sheet">
      <div class="barcode-card">
        <div class="item-name">Swift - ${itemName}</div>
        ${symbol}
        ${fallback}
        ${price}
      </div>
    </div>`;
}

export function buildLabelDocument(item: BarcodeLabelItem, copies: number): string {
  const encoded = encodeCode128(item.barcode || "");
  const blocks = Array.from({ length: copies }, () => labelBlock(item, encoded)).join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Barcode Label</title>
<style>

@page {
  size: 38mm 25mm;
  margin: 0 !important;
}

* {
  box-sizing: border-box !important;
  margin: 0;
  padding: 0;
}

html, body {
  width: 38mm !important;
  height: 25mm !important;
  max-height: 25mm !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  background: #fff;
}

.page-sheet {
  width: 38mm !important;
  height: 25mm !important;
  max-height: 25mm !important;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden !important;
  page-break-after: always;
  break-after: page;
  page-break-inside: avoid;
  break-inside: avoid;
}

.page-sheet:last-child {
  page-break-after: avoid;
  break-after: avoid;
}

.barcode-card {
  width: 38mm;
  height: 23.5mm;
  max-height: 23.5mm;
  
  /* زيادة الهامش الأيسر لـ 5mm لإزاحة الطباعة جهة اليمين وتفادي القص من اليسار */
  padding: 0.5mm 1mm 0.5mm 5mm;
  
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  text-align: center;
}

.item-name {
  font-family: Arial, sans-serif;
  font-size: 7.5pt;
  font-weight: bold;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.barcode-image {
  width: 96%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.barcode-image svg {
  display: block;
  width: 100%;
  height: 9.5mm;
  shape-rendering: crispEdges;
}

.barcode-number {
  font-family: monospace;
  font-size: 7pt;
  font-weight: bold;
  line-height: 1;
  margin-top: 0.2mm;
  white-space: nowrap;
}

.price {
  font-family: Arial, sans-serif;
  font-size: 8.5pt;
  font-weight: bold;
  line-height: 1;
}

.nobarcode {
  font-family: monospace;
  font-size: 8pt;
  padding: 0.5mm 0;
  border: 1px dashed #999;
}

@media print {
  html, body {
    width: 38mm !important;
    height: 25mm !important;
    overflow: hidden !important;
  }
  body { 
    -webkit-print-color-adjust: exact; 
    print-color-adjust: exact; 
  }
}
</style>
</head>
<body>
${blocks}
<script>
  window.addEventListener("load", function () {
    window.focus();
    window.print();
  });
</script>
</body>
</html>`;
}

/**
 * استخدام هذه الدالة حصراً لطباعة استيكر الباركود
 */
export function printBarcodeLabels(item: BarcodeLabelItem, copies: number): boolean {
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return false;

  win.document.open();
  win.document.write(buildLabelDocument(item, copies));
  win.document.close();
  return true;
}

/**
 * استخدم هذه الدالة لطباعة الـ Receipt باستخدام Print Format الخاص بـ Frappe
 */
export function printReceiptInFrappe(doctype: string, docname: string, printFormatName: string) {
  // @ts-ignore
  if (typeof frappe !== "undefined" && frappe.utils) {
    // @ts-ignore
    const w = window.open(
      // @ts-ignore
      frappe.urllib.get_full_url(
        `/printview?doctype=${encodeURIComponent(doctype)}&name=${encodeURIComponent(docname)}&format=${encodeURIComponent(printFormatName)}&no_letterhead=0`
      )
    );
    if (w) {
      w.focus();
    }
  }
}