"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { ArrowLeft, Plus, Trash2, Barcode } from "lucide-react";

interface Props {
  itemCode: string;
  onBack: () => void;
}

export function ItemDetail({ itemCode, onBack }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();
  const [newBarcode, setNewBarcode] = useState("");
  const [addingBarcode, setAddingBarcode] = useState(false);
  const [removingBarcode, setRemovingBarcode] = useState<string | null>(null);

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["item_detail", itemCode],
    queryFn: async () => {
      const { data } = await frappeApi.getItem(itemCode);
      return data;
    },
  });

  const handleAddBarcode = async () => {
    const bc = newBarcode.trim();
    if (!bc) return;
    setAddingBarcode(true);
    try {
      await frappeApi.addItemBarcode(itemCode, bc);
      showToast(`Barcode ${bc} added`, "success");
      setNewBarcode("");
      queryClient.invalidateQueries({ queryKey: ["item_detail", itemCode] });
    } catch (err) {
      showToast(extractFrappeError(err), "error");
    } finally {
      setAddingBarcode(false);
    }
  };

  const handleRemoveBarcode = async (barcode: string) => {
    setRemovingBarcode(barcode);
    try {
      await frappeApi.removeItemBarcode(itemCode, barcode);
      showToast(`Barcode ${barcode} removed`, "success");
      queryClient.invalidateQueries({ queryKey: ["item_detail", itemCode] });
    } catch (err) {
      showToast(extractFrappeError(err), "error");
    } finally {
      setRemovingBarcode(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="md" /></div>;
  }

  if (error || !item) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 text-sm">{error ? extractFrappeError(error) : "Item not found"}</p>
        <Button variant="ghost" size="sm" onClick={onBack} className="mt-4">Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to list
      </button>

      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-start gap-4">
          {item.image && (
            <img src={item.image} alt="" className="w-20 h-20 rounded-lg object-cover" />
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{item.item_name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{item.item_code}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
              <div>
                <span className="text-gray-400">Group</span>
                <p className="font-medium text-gray-700">{item.item_group}</p>
              </div>
              <div>
                <span className="text-gray-400">UOM</span>
                <p className="font-medium text-gray-700">{item.stock_uom}</p>
              </div>
              <div>
                <span className="text-gray-400">Status</span>
                <p className={`font-medium ${item.disabled ? "text-red-500" : "text-green-600"}`}>
                  {item.disabled ? "Disabled" : "Active"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barcodes */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-4">
          <Barcode className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Barcodes</h3>
        </div>

        {item.barcodes && item.barcodes.length > 0 ? (
          <div className="space-y-2 mb-4">
            {item.barcodes.map((b: any) => (
              <div key={b.barcode} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-sm font-mono text-gray-700">{b.barcode}</span>
                <button
                  onClick={() => handleRemoveBarcode(b.barcode)}
                  disabled={removingBarcode === b.barcode}
                  className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {removingBarcode === b.barcode ? <Spinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No barcodes assigned</p>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newBarcode}
            onChange={(e) => setNewBarcode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddBarcode(); } }}
            placeholder="Scan or type barcode..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <Button variant="primary" size="sm" onClick={handleAddBarcode} isLoading={addingBarcode}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
