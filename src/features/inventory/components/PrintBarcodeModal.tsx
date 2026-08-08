"use client";

import { useState, useEffect, FormEvent } from "react";
import { Printer } from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { useUIStore } from "@/stores/uiStore";
import {
  printBarcodeLabels,
  encodeCode128,
  type BarcodeLabelItem,
} from "../services/barcodeLabel";

interface Props {
  isOpen: boolean;
  item: BarcodeLabelItem | null;
  onClose: () => void;
}

const PRESETS = [1, 5, 10, 20, 50];
const MAX_COPIES = 200;

export function PrintBarcodeModal({ isOpen, item, onClose }: Props) {
  const showToast = useUIStore((s) => s.showToast);

  const [copies, setCopies] = useState("1");
  const [error, setError] = useState("");

  // Reset to a single copy whenever a different item is opened, so a previous
  // run of 50 is never reprinted by accident.
  useEffect(() => {
    if (!isOpen) return;
    setCopies("1");
    setError("");
  }, [isOpen, item]);

  if (!item) return null;

  const encoded = encodeCode128(item.barcode || "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const n = parseInt(copies, 10);
    if (!Number.isFinite(n) || n < 1) {
      setError("Enter at least 1 copy.");
      return;
    }
    if (n > MAX_COPIES) {
      setError(`Maximum ${MAX_COPIES} copies per print job.`);
      return;
    }

    if (!printBarcodeLabels(item, n)) {
      setError(
        "The print window was blocked. Allow popups for this site, then try again."
      );
      return;
    }

    showToast(`Printing ${n} label${n === 1 ? "" : "s"}`, "success");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Barcode" maxWidth="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="font-medium text-gray-900">{item.item_name}</p>
          <p className="text-xs text-gray-400 font-mono">{item.item_code}</p>
          <p className="mt-1 font-mono text-sm text-gray-600">
            {item.barcode || "No barcode"}
          </p>
        </div>

        {!encoded && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
            {item.barcode
              ? "This barcode is not an even number of digits, so no scannable symbol can be drawn. The label will show the code as text only."
              : "This item has no barcode. Add one from Edit before printing a label."}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of copies
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setCopies(String(n));
                  setError("");
                }}
                className={
                  parseInt(copies, 10) === n
                    ? "px-3 py-1.5 rounded-md text-sm font-medium bg-primary-600 text-white"
                    : "px-3 py-1.5 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                }
              >
                {n}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min="1"
            max={MAX_COPIES}
            step="1"
            value={copies}
            onChange={(e) => {
              setCopies(e.target.value);
              setError("");
            }}
            hint={`1 to ${MAX_COPIES} labels per job.`}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={!item.barcode}
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </form>
    </Modal>
  );
}
