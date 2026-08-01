"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/common/Button";
import { ItemDetail } from "@/features/inventory/components/ItemDetail";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { CreateItemModal } from "@/features/inventory/components/CreateItemModal";
import { StockEntryModal } from "@/features/inventory/components/StockEntryModal";
import { ImportItemsModal } from "@/features/inventory/components/ImportItemsModal";
import { Plus, PackagePlus, FileUp } from "lucide-react";

export default function InventoryPage() {
  const { fullName } = useAuthStore();
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [showCreateItem, setShowCreateItem] = useState(false);
  const [showStockEntry, setShowStockEntry] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-gray-900">SWIFT Inventory</h1>
          <span className="text-xs text-gray-400 hidden sm:inline">{fullName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowCreateItem(true)}>
            <Plus className="h-4 w-4" /> New Item
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <FileUp className="h-4 w-4" /> Import Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowStockEntry(true)}>
            <PackagePlus className="h-4 w-4" /> Stock Entry
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-4">
        <div className="bg-white border border-gray-200 rounded-lg h-full overflow-y-auto p-4">
          {selectedItem ? (
            <ItemDetail
              itemCode={selectedItem}
              onBack={() => setSelectedItem(null)}
            />
          ) : (
            <InventoryTable onSelectItem={setSelectedItem} />
          )}
        </div>
      </div>

      <CreateItemModal
        isOpen={showCreateItem}
        onClose={() => setShowCreateItem(false)}
        onCreated={(code) => {
          setShowCreateItem(false);
          queryClient.invalidateQueries({ queryKey: ["inventory_list"] });
          setSelectedItem(code);
        }}
      />
      <StockEntryModal
        isOpen={showStockEntry}
        onClose={() => {
          setShowStockEntry(false);
          queryClient.invalidateQueries({ queryKey: ["inventory_list"] });
        }}
      />
      <ImportItemsModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => {
          setShowImport(false);
          queryClient.invalidateQueries({ queryKey: ["inventory_list"] });
        }}
      />
    </div>
  );
}
