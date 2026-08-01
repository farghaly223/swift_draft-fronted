"use client";

import { useState, FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Plus, Trash2 } from "lucide-react";

interface StockItem {
  item_code: string;
  qty: string;
  s_warehouse?: string;
  t_warehouse?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function StockEntryModal({ isOpen, onClose }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const [entryType, setEntryType] = useState<"Material Receipt" | "Material Issue" | "Material Transfer">("Material Receipt");
  const [items, setItems] = useState<StockItem[]>([{ item_code: "", qty: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => { const { data } = await frappeApi.listWarehouses(); return data; },
    enabled: isOpen,
  });

  const updateItem = (idx: number, field: keyof StockItem, value: string) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addRow = () => setItems((prev) => [...prev, { item_code: "", qty: "" }]);

  const removeRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const parsed = items.map((item) => {
      if (!item.item_code.trim() || !item.qty.trim()) return null;
      const row: any = { item_code: item.item_code.trim(), qty: parseFloat(item.qty) };
      if (entryType === "Material Transfer") {
        row.s_warehouse = item.s_warehouse;
        row.t_warehouse = item.t_warehouse;
      }
      return row;
    }).filter(Boolean);

    if (parsed.length === 0) { setError("At least one item with code and qty is required."); return; }

    setIsSubmitting(true);
    try {
      const { data } = await frappeApi.createStockEntry({
        stock_entry_type: entryType,
        items: parsed,
      });
      showToast(`Stock Entry ${data.stock_entry} created`, "success");
      setItems([{ item_code: "", qty: "" }]);
      setError("");
      onClose();
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Stock Entry" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
          <div className="flex gap-2">
            {(["Material Receipt", "Material Issue", "Material Transfer"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEntryType(type)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  entryType === type
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {type.replace("Material ", "")}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Items</label>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <input
                type="text"
                value={item.item_code}
                onChange={(e) => updateItem(idx, "item_code", e.target.value)}
                placeholder="Item code"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                value={item.qty}
                onChange={(e) => updateItem(idx, "qty", e.target.value)}
                placeholder="Qty"
                min="0.01"
                step="any"
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {entryType === "Material Transfer" && (
                <>
                  <select
                    value={item.s_warehouse || ""}
                    onChange={(e) => updateItem(idx, "s_warehouse", e.target.value)}
                    className="w-36 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">From...</option>
                    {warehouses.map((w: any) => <option key={w.name} value={w.name}>{w.warehouse_name || w.name}</option>)}
                  </select>
                  <select
                    value={item.t_warehouse || ""}
                    onChange={(e) => updateItem(idx, "t_warehouse", e.target.value)}
                    className="w-36 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">To...</option>
                    {warehouses.map((w: any) => <option key={w.name} value={w.name}>{w.warehouse_name || w.name}</option>)}
                  </select>
                </>
              )}
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={items.length <= 1}
                className="text-gray-300 hover:text-red-500 transition-colors p-2 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add row
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="flex-1">
            Submit Stock Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
