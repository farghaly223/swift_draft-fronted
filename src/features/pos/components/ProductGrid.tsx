"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { useCartStore } from "@/stores/cartStore";
import { useUIStore } from "@/stores/uiStore";
import { formatCurrency } from "@/lib/formatting";
import { Spinner } from "@/components/common/Spinner";
import { ProductImageModal } from "@/components/common/ProductImageModal";
import { Camera } from "lucide-react";
import type { PosItem } from "@/types/cart";

interface Props {
  searchQuery: string;
}

export function ProductGrid({ searchQuery }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useUIStore((s) => s.showToast);
  const [preview, setPreview] = useState<{ image: string; name: string } | null>(null);

  const { data: items = [], isLoading } = useQuery<PosItem[]>({
    queryKey: ["item_search", "priced-v2", searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data } = await frappeApi.itemSearch(searchQuery);
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner size="md" />
      </div>
    );
  }

  if (searchQuery.length >= 2 && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        No items found for &quot;{searchQuery}&quot;
      </div>
    );
  }

  if (searchQuery.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Type at least 2 characters to search items
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
      {items.map((item) => (
        <div
          key={item.item_code}
          className="relative bg-white border border-gray-200 rounded-lg p-3 text-left hover:border-primary-400 hover:shadow-sm transition-all"
        >
          <button
            disabled={item.stock_qty <= 0}
            onClick={() => {
              if (addItem(item)) showToast(`Added ${item.item_name}`, "success", 1200);
              else showToast(`Only ${item.stock_qty} ${item.uom} of ${item.item_name} in stock`, "warning");
            }}
            className="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight pr-7">{item.item_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{item.item_code}</p>
            <p className="text-sm font-semibold text-primary-600 mt-1">{formatCurrency(item.rate)}</p>
            <p className="text-xs text-gray-400">Stock: {item.stock_qty} {item.uom}</p>
          </button>
          {item.image && (
            <button
              type="button"
              title="View image"
              onClick={() => setPreview({ image: item.image!, name: item.item_name })}
              className="absolute top-2 right-2 p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <ProductImageModal image={preview?.image ?? null} itemName={preview?.name ?? "Product image"} onClose={() => setPreview(null)} />
    </div>
  );
}
