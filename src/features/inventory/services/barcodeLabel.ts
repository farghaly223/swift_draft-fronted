/**
 * Barcode label rendering for the storekeeper's inventory screen.
 *
 * Deliberately client-side. The alternative was Frappe's /printview, as the POS
 * receipt uses, but that renders a Print Format attached to a saved document —
 * and a shelf label is not a document. Going that route would have meant a new
 * Print Format, which this project does not version-control (see README
 * 15_Fixtures.md issue #4: the `Swift` receipt format exists only in whichever
 * database it was created in), plus a backend endpoint to repeat it N times.
 *
 * The inventory row already carries every field a label needs, so the whole
 * feature costs zero API calls and zero deployment steps.
 */

/**
 * Symbology is Code128, not EAN-13 — see the comment above the pattern table for
 * why. The short version: EAN-13 adds a check digit to the transmitted value,
 * which no stored barcode has, so every scan missed.
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

/*
 * Code128 Subset C, not EAN-13, and the reason matters.
 *
 * EAN-13 mandates a 13th digit: a mod-10 checksum derived from the other
 * twelve. It is part of the symbol, so a scanner reading an EAN-13 label
 * always transmits 13 characters. But `_generate_barcode()` in api.py mints
 * 12-digit values and that is what `Item Barcode.barcode` stores, so every scan
 * arrived one digit longer than anything in the database and matched nothing.
 *
 * Code128 has no such requirement. Its check symbol is a modulo-103 weighted
 * sum that lives in the symbology, not in the data — the scanner verifies it and
 * strips it, transmitting exactly the characters that were encoded. Scan a
 * Code128 label of "123456789012" and the wedge types those 12 digits.
 *
 * Subset C encodes digits in pairs, so 12 digits cost 6 symbols rather than 12.
 * That halves the symbol width, which is what lets a 12-digit code sit on the
 * sticker at a module width scanners and thermal heads can both resolve.
 *
 * These barcodes are internally generated, never scanned in from a supplier and
 * never sold through a channel that requires a real GTIN, so nothing is lost by
 * leaving the retail symbology behind.
 */

// Bit patterns for Code128 symbol values 0..106. Each is 11 modules; the stop
// pattern is 13. Index = symbol value, which in Subset C is the digit pair
// itself (value 42 encodes "42"), making the lookup below a direct index.
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

const START_C = 105; // Start Code C — subsequent symbols are digit pairs
const STOP = 106;

/**
 * Expand an even-length numeric payload into a Code128 Subset C bit pattern.
 *
 * Returns null for anything that is not an even count of digits, so callers can
 * fall back to printing the code as plain text rather than an unscannable
 * symbol. Odd lengths are rejected rather than padded: a leading zero would
 * change the value the scanner transmits, which is the exact class of bug this
 * function exists to eliminate.
 *
 * `text` is the payload verbatim — unlike EAN-13 there is no appended digit, so
 * what the label prints is what the scanner sends is what the database stores.
 */
export function encodeCode128(payload: string): { bits: string; text: string } | null {
  const digits = (payload || "").trim();
  if (!/^\d+$/.test(digits) || digits.length % 2 !== 0) return null;

  const values: number[] = [START_C];
  for (let i = 0; i < digits.length; i += 2) {
    values.push(Number(digits.slice(i, i + 2)));
  }

  // Modulo-103 check symbol: start value, then each data symbol weighted by its
  // 1-based position. The scanner validates and discards it.
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

const MODULE_W = 2; // user units per module; the label CSS scales the whole SVG

// Bar length in user units, along the sticker's 50mm axis once rotated.
const BAR_H = 74;

// Code128 requires a clear margin of at least 10 modules on each side. Unlike
// EAN-13 the zones are symmetric, because no digit is printed inside them.
const QUIET = 10;

// The symbol is rotated 90deg, so its long axis runs down the sticker's HEIGHT.
// 35mm tall less 2mm padding each side = 31mm for the code itself.
//
// At 12 digits the symbol is 121 modules, so the module width is 31/121 =
// 0.256mm. That clears the ~0.25mm handheld minimum, but only just: on a 203dpi
// head (0.125mm dots) it is 2.05 dots per module, so the printer has almost no
// rounding headroom. Unrotated across the 46mm width it was 0.380mm / 3.04
// dots, which is materially more robust — see the note in buildLabelDocument.
const PRINTABLE_MM = 31;

// Thickness of the rotated symbol column, across the sticker's 50mm width.
// It holds the bar length plus the digit line beneath, and is fixed so the
// upright text column to its right gets a predictable remainder:
// 50mm - 4mm padding - 13mm - 2mm gap = 31mm of text width.
const ROTATED_BAND_MM = 13;

/**
 * Physical height, in mm, at which an SVG of `bits` fills PRINTABLE_MM wide
 * without letterboxing.
 *
 * preserveAspectRatio scales to whichever axis binds first, so a box whose
 * aspect differs from the viewBox's leaves the symbol short of the full width
 * and thins every module. Measured once with a mismatched height: the bars came
 * out 94% of nominal width. Deriving the height from the bit count keeps the
 * two in agreement for any payload length and any PRINTABLE_MM.
 */
function symbolHeightMm(bits: string): number {
  const modules = bits.length + QUIET * 2;
  return (PRINTABLE_MM * BAR_H) / (modules * MODULE_W);
}

/**
 * Draw the bars as inline SVG. Vector output matters here: thermal printers
 * rasterise at their own DPI, and a bitmap scaled to fit would blur the module
 * edges enough to defeat some scanners.
 *
 * Every bar is full height — Code128 has no guard patterns to extend, which is
 * why the EAN-13 descender logic is gone.
 *
 * Bars only — the human-readable digits are rendered as HTML by the caller.
 * They used to be SVG <text>, but the whole SVG is scaled down to the label's
 * printable width, which shrank the digits with it until they were unreadable.
 * As HTML their size is set in points and is unaffected by the symbol's scale.
 *
 * The SVG itself is drawn unrotated — bars vertical, symbol running left to
 * right. The label CSS rotates the containing element by 90deg. Rotating here
 * instead would leave the digit line behind, and would make the viewBox aspect
 * disagree with the box symbolHeightMm() computes.
 */
function barcodeSvg(bits: string): string {
  let rects = "";
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    rects += `<rect x="${(QUIET + i) * MODULE_W}" y="0" width="${MODULE_W}" height="${BAR_H}" fill="#000"/>`;
  }

  const width = (bits.length + QUIET * 2) * MODULE_W;

  // shape-rendering="crispEdges" disables anti-aliasing on the bar edges. A
  // half-grey boundary pixel is what a thermal head renders as a smeared bar.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${BAR_H}" ` +
    `preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges">` +
    rects +
    `</svg>`
  );
}

/**
 * Space the digits into groups so a human can read the number back without
 * losing their place. Rendered as HTML so CSS controls the physical size.
 */
function groupedDigits(text: string): string {
  return (text.match(/.{1,4}/g) || [text]).join("&nbsp;&nbsp;");
}

/* -------------------------------------------------------------------------- */
/* Document                                                                   */
/* -------------------------------------------------------------------------- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelBlock(item: BarcodeLabelItem, encoded: { bits: string; text: string } | null): string {
  const price =
    item.selling_price && item.selling_price > 0
      ? `<div class="price">${item.selling_price.toFixed(2)}</div>`
      : "";

  // A missing or malformed barcode still produces a usable label — the code is
  // printed as text. Silently skipping it would leave the storekeeper with a
  // short stack and no explanation.
  //
  // The symbol and its digits share one rotated wrapper so they turn together
  // and stay aligned. Rotating them separately would drift them apart.
  const symbol = encoded
    ? `<div class="barcode-image">` +
      `<div class="barcode-rot">` +
      barcodeSvg(encoded.bits) +
      `<div class="barcode-number">${groupedDigits(encoded.text)}</div>` +
      `</div></div>`
    : "";

  // Without a symbol there is nothing to rotate, so the code falls back to the
  // full width of the sticker rather than a 13mm column.
  const fallback = encoded
    ? ""
    : `<div class="nobarcode">${escapeHtml(item.barcode || "NO BARCODE")}</div>`;

  return `
    <div class="barcode-label">
      ${symbol}
      <div class="label-text">
        ${fallback}
        ${price}
      </div>
    </div>`;
}

/**
 * Build a standalone print document containing `copies` labels for one item.
 *
 * Copies are repeated in the markup rather than left to the print dialog's own
 * copy field, for two reasons: the dialog defaults to 1 and the storekeeper
 * would have to set it every time, and with kiosk printing enabled (README
 * 16_Printing.md) there is no dialog to set it in.
 *
 * Each copy is its own page, so N copies feed N stickers down the roll.
 */
export function buildLabelDocument(item: BarcodeLabelItem, copies: number): string {
  const encoded = encodeCode128(item.barcode || "");
  const blocks = Array.from({ length: copies }, () => labelBlock(item, encoded)).join("");

  // Derived from the symbol's own bit count so the SVG box matches its viewBox
  // aspect exactly. See symbolHeightMm. The fallback is unused when `encoded`
  // is null, since that branch renders text instead of an SVG.
  const svgHeight = encoded ? symbolHeightMm(encoded.bits).toFixed(3) : "0";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(item.item_name || item.item_code)}</title>
<style>
  /* One physical 50x35mm sticker per page. The roll is die-cut and the printer
     already stops at each gap, so the page must match the sticker exactly; any
     @page margin would shift content onto the next label. Labels advance down
     the roll, one per page — never side-by-side.

     The symbol is rotated 90deg so it runs along the sticker's 35mm height
     instead of its 50mm width, which is what stopped it spanning two stickers.
     That costs module width: see PRINTABLE_MM. */
  @page {
    size: 50mm 35mm;
    margin: 0;
  }

  * { box-sizing: border-box; }

  html,
  body {
    margin: 0;
    padding: 0;
    width: 50mm;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
  }

  .barcode-label {
    width: 50mm;
    height: 35mm;
    padding: 2mm;
    margin: 0;
    text-align: center;
    overflow: hidden;

    /* Two columns: the rotated symbol on the left, the text stacked upright on
       the right. Not flex-wrap — a single row that never wraps, so one label is
       always exactly one sticker. */
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2mm;

    page-break-after: always;
    break-after: page;
  }

  /* Without this the final label emits a trailing break, and the printer feeds
     one blank sticker at the end of every job. */
  .barcode-label:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  /* The rotation column. Its width is the symbol's printed thickness (bar
     length + the digit line beneath it); its height is the 31mm the symbol is
     scaled to. Fixed so the text column gets a predictable remainder. */
  .barcode-image {
    flex: 0 0 ${ROTATED_BAND_MM}mm;
    width: ${ROTATED_BAND_MM}mm;
    height: ${PRINTABLE_MM}mm;
    position: relative;
  }

  /* Rotate 90deg about the centre. The inner box is laid out at its natural
     size — 31mm along what becomes the vertical axis — then turned, so the bars
     run across the sticker's 35mm height and the code reads bottom-to-top.
     This is the change that stops the symbol spanning two stickers. */
  .barcode-rot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: ${PRINTABLE_MM}mm;
    transform: translate(-50%, -50%) rotate(-90deg);
    transform-origin: center center;
  }

  /* Height is computed per symbol by symbolHeightMm() so the box matches the
     viewBox aspect. A hardcoded value letterboxes under preserveAspectRatio and
     thins every module — do not replace this with a literal. */
  .barcode-image svg {
    display: block;
    width: 100%;
    height: ${svgHeight}mm;
  }

  /* The upright text column. min-width:0 lets the ellipsis work inside flex. */
  .label-text {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
  }

  .item-name {
    font-size: 9pt;
    font-weight: bold;
    line-height: 1.15;
    /* Two lines: the text column is ~13mm narrower than the old full width. */
    max-height: 10mm;
    overflow: hidden;
  }

  /* Human-readable digits as HTML, not SVG text: inside the SVG they scaled
     down with the symbol and became unreadable. Rotated with the bars so the
     number reads the same way round as the code it labels. */
  .barcode-number {
    font-family: monospace;
    font-size: 7pt;
    line-height: 1;
    letter-spacing: 0.5px;
    margin-top: 0.8mm;
    white-space: nowrap;
  }

  .price {
    font-size: 12pt;
    font-weight: bold;
    line-height: 1;
    margin-top: 2mm;
  }

  .nobarcode {
    font-family: monospace;
    font-size: 9pt;
    padding: 3mm 0;
    border: 1px dashed #999;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${blocks}
<script>
  // Print once the SVG has been laid out. Firing before layout prints a blank
  // page on some browsers.
  window.addEventListener("load", function () {
    window.focus();
    window.print();
  });
</script>
</body>
</html>`;
}

/**
 * Open a print window and print the labels.
 *
 * Returns false when the popup was blocked, so the caller can tell the user —
 * a blocked popup is otherwise completely silent (README 16_Printing.md #3).
 */
export function printBarcodeLabels(item: BarcodeLabelItem, copies: number): boolean {
  // Unnamed window: unlike the receipt, two label jobs may legitimately be
  // queued at once, and reusing one window would cancel the first.
  const win = window.open("", "_blank", "width=800,height=600");
  if (!win) return false;

  win.document.open();
  win.document.write(buildLabelDocument(item, copies));
  win.document.close();
  return true;
}
