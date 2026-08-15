"use client";

import { useState, useEffect, FormEvent, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ImagePlus } from "lucide-react";

export interface EditableRow {
  item_code: string;
  item_name: string;
  barcode: string | null;
  supplier: string | null;
  cost_price: number;
  selling_price: number;
  qty: number;
  image?: string | null;
}

interface Props {
  isOpen: boolean;
  row: EditableRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditInventoryItemModal({ isOpen, row, onClose, onSaved }: Props) {
  const showToast = useUIStore((s) => s.showToast);

  const [itemName, setItemName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-seed the form whenever a different row is opened.
  useEffect(() => {
    if (!isOpen || !row) return;
    setItemName(row.item_name || "");
    setSupplier(row.supplier || "");
    setCostPrice(row.cost_price != null ? String(row.cost_price) : "");
    setSellingPrice(row.selling_price != null ? String(row.selling_price) : "");
    setBarcode(row.barcode || "");
    setQty(row.qty != null ? String(row.qty) : "");
    setError("");
  }, [isOpen, row]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await frappeApi.listSuppliers();
      return data;
    },
    enabled: isOpen,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!row) return;
    setError("");

    if (!itemName.trim()) {
      setError("Item name is required.");
      return;
    }
    if (barcode.trim() && !/^\d{12}$/.test(barcode.trim())) {
      setError("Barcode must be exactly 12 digits.");
      return;
    }
    if (costPrice !== "" && parseFloat(costPrice) < 0) {
      setError("Cost price cannot be negative.");
      return;
    }
    if (sellingPrice !== "" && parseFloat(sellingPrice) < 0) {
      setError("Selling price cannot be negative.");
      return;
    }
    if (qty !== "" && parseFloat(qty) < 0) {
      setError("Quantity cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await frappeApi.updateInventoryItem({
        item_code: row.item_code,
        item_name: itemName.trim(),
        supplier: supplier.trim(),
        cost_price: costPrice === "" ? undefined : parseFloat(costPrice),
        selling_price: sellingPrice === "" ? undefined : parseFloat(sellingPrice),
        barcode: barcode.trim() || undefined,
        qty: qty === "" ? undefined : parseFloat(qty),
      });
      showToast(`${itemName.trim()} updated`, "success");
      if (data?.stock_message) showToast(data.stock_message, "info", 5000);
      onSaved();
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImage = async (file?: File) => {
    if (!row || !file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2 MB.");
      return;
    }
    setError("");
    setIsUploading(true);
    try {
      await frappeApi.uploadItemImage(row.item_code, file);
      showToast(`${row.item_name} image updated`, "success");
      onSaved();
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Item" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-400 font-mono">{row?.item_code}</p>

        <div className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Product image</p>
            <p className="text-xs text-gray-400">JPEG, PNG or WebP, maximum 2 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => handleImage(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={isUploading}
            disabled={isSubmitting || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" /> {row?.image ? "Change Image" : "Add Image"}
          </Button>
        </div>

        <Input
          label="Item Name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          disabled={isSubmitting}
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          >
            <option value="">No supplier</option>
            {/* The current supplier may sit outside the fetched list — keep it selectable. */}
            {supplier && !suppliers.some((s: any) => s.name === supplier) && (
              <option value={supplier}>{supplier}</option>
            )}
            {suppliers.map((s: any) => (
              <option key={s.name} value={s.name}>
                {s.supplier_name || s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Buying Price"
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Selling Price"
            type="number"
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Barcode"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          disabled={isSubmitting}
          hint="Exactly 12 digits. Generated automatically if left empty."
        />

        <Input
          label="Current Stock"
          type="number"
          min="0"
          step="1"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          disabled={isSubmitting}
          hint="Sets the on-hand quantity to this absolute value."
        />

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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            isLoading={isSubmitting}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
