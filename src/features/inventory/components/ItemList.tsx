"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { Spinner } from "@/components/common/Spinner";
import { Search } from "lucide-react";

interface Props {
  onSelectItem: (item_code: string) => void;
}

export function ItemList({ onSelectItem }: Props) {
  const [query, setQuery] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory_search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const { data } = await frappeApi.itemSearch(query);
      return data;
    },
    enabled: query.length >= 2,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items by name or code..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          autoFocus
        />
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8"><Spinner size="md" /></div>
        )}

        {!isLoading && query.length >= 2 && items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No items found</p>
        )}

        {!isLoading && query.length < 2 && (
          <p className="text-sm text-gray-400 text-center py-8">Type at least 2 characters to search</p>
        )}

        <div className="space-y-1">
          {items.map((item: any) => (
            <button
              key={item.item_code}
              onClick={() => onSelectItem(item.item_code)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
            >
              {item.image && (
                <img src={item.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.item_name}</p>
                <p className="text-xs text-gray-400">{item.item_code} • {item.stock_uom}</p>
              </div>
              <span className="text-sm font-medium text-gray-500 shrink-0">
                {item.rate > 0 ? `$${item.rate.toFixed(2)}` : "—"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
