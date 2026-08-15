"use client";

import { useState, useRef, FormEvent } from "react";
import { frappeApi } from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { extractFrappeError } from "@/lib/utils";
import { Search } from "lucide-react";

export function BarcodeScanner() {
  const [value, setValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      const { data } = await frappeApi.itemByBarcode(trimmed);
      const added = addItem({
        item_code: data.item_code,
        item_name: data.item_name,
        rate: data.rate,
        minimum_rate: data.minimum_rate,
        uom: data.uom,
        stock_qty: data.stock_qty,
        image: data.image,
      });
      setValue("");
      if (added) {
        showToast(`Added ${data.item_name}`, "success", 1500);
      } else {
        // Already at the available qty — the scan is refused rather than silently ignored.
        showToast(
          `Only ${data.stock_qty} ${data.uom} of ${data.item_name} in stock`,
          "warning",
        );
      }
    } catch (err) {
      showToast(extractFrappeError(err), "error");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Scan barcode or search..."
        disabled={isLoading}
        autoFocus
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
      />
    </form>
  );
}
