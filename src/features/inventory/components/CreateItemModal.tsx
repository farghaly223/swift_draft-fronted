"use client";

import { useState, useRef, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Barcode, Plus, Trash2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item_code: string) => void;
}

export function CreateItemModal({ isOpen, onClose, onCreated }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemGroup, setItemGroup] = useState("");
  const [uom, setUom] = useState("Nos");
  const [openingStock, setOpeningStock] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const barcodeRef = useRef<HTMLInputElement>(null);

  const { data: itemGroups = [] } = useQuery({
    queryKey: ["item_groups"],
    queryFn: async () => {
      const { data } = await frappeApi.listItemGroups();
      return data;
    },
    enabled: isOpen,
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data } = await frappeApi.listWarehouses();
      return data;
    },
    enabled: isOpen,
  });

  const reset = () => {
    setItemCode("");
    setItemName("");
    setItemGroup("");
    setUom("Nos");
    setOpeningStock("");
    setWarehouse("");
    setBuyingPrice("");
    setSellingPrice("");
    setBarcodes([]);
    setBarcodeInput("");
    setError("");
  };

  const addBarcode = () => {
    const bc = barcodeInput.trim();
    if (!bc) return;
    if (barcodes.includes(bc)) {
      showToast("Barcode already added", "warning");
      return;
    }
    setBarcodes((prev) => [...prev, bc]);
    setBarcodeInput("");
    barcodeRef.current?.focus();
  };

  const removeBarcode = (bc: string) => {
    setBarcodes((prev) => prev.filter((b) => b !== bc));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!itemName.trim()) { setError("Item name is required."); return; }
    if (!itemGroup) { setError("Item group is required."); return; }
    if (!uom.trim()) { setError("UOM is required."); return; }

    setIsSubmitting(true);
    try {
      const { data } = await frappeApi.createItem({
        item_code: itemCode.trim() || undefined,
        item_name: itemName.trim(),
        item_group: itemGroup,
        uom: uom.trim(),
        opening_stock: openingStock ? parseFloat(openingStock) : 0,
        warehouse: warehouse || undefined,
        valuation_rate: buyingPrice ? parseFloat(buyingPrice) : undefined,
        selling_price: sellingPrice ? parseFloat(sellingPrice) : undefined,
        barcodes: barcodes.length > 0 ? barcodes : undefined,
      });
      showToast(`Item ${data.item_code} created`, "success");
      reset();
      onCreated(data.item_code);
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Item" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Item Code (optional)"
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          placeholder="Auto-generated if left empty"
          disabled={isSubmitting}
        />

        <Input
          label="Item Name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="e.g. Coca Cola 500ml"
          disabled={isSubmitting}
          autoFocus
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Group</label>
          <select
            value={itemGroup}
            onChange={(e) => setItemGroup(e.target.value)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          >
            <option value="">Select group...</option>
            {itemGroups.map((g: any) => (
              <option key={g.name} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>

        <Input
          label="Unit of Measure (UOM)"
          value={uom}
          onChange={(e) => setUom(e.target.value)}
          placeholder="e.g. Nos, Kg, Liter"
          disabled={isSubmitting}
        />

        <Input
          label="Opening Stock (optional)"
          type="number"
          min="0"
          step="1"
          value={openingStock}
          onChange={(e) => setOpeningStock(e.target.value)}
          placeholder="0"
          disabled={isSubmitting}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
          >
            <option value="">Default warehouse</option>
            {warehouses.map((w: any) => (
              <option key={w.name} value={w.name}>{w.warehouse_name || w.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Buying Price (Cost)"
            type="number"
            min="0"
            step="0.01"
            value={buyingPrice}
            onChange={(e) => setBuyingPrice(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
          <Input
            label="Selling Price"
            type="number"
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0.00"
            disabled={isSubmitting}
          />
        </div>

        {/* Barcodes section */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <Barcode className="h-4 w-4" /> Barcodes
          </label>

          {barcodes.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {barcodes.map((bc) => (
                <div key={bc} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-mono text-gray-700">{bc}</span>
                  <button
                    type="button"
                    onClick={() => removeBarcode(bc)}
                    disabled={isSubmitting}
                    className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={barcodeRef}
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addBarcode(); }
              }}
              placeholder="Scan or type barcode..."
              disabled={isSubmitting}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
            />
            <Button type="button" variant="secondary" size="sm" onClick={addBarcode} disabled={isSubmitting}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Scan barcode or type manually, then press Enter or click Add</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="flex-1">
            Create Item
          </Button>
        </div>
      </form>
    </Modal>
  );
}
