"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { Button } from "@/components/common/Button";
import { Spinner } from "@/components/common/Spinner";
import { EditInventoryItemModal, EditableRow } from "./EditInventoryItemModal";
import { PrintBarcodeModal } from "./PrintBarcodeModal";
import type { BarcodeLabelItem } from "../services/barcodeLabel";
import { Search, Download, Pencil, Eye, Printer, X } from "lucide-react";
import { Camera } from "lucide-react";
import { ProductImageModal } from "@/components/common/ProductImageModal";

interface Props {
  onSelectItem: (item_code: string) => void;
}

const PAGE_SIZE = 100;

export function InventoryTable({ onSelectItem }: Props) {
  const queryClient = useQueryClient();
  const showToast = useUIStore((s) => s.showToast);

  const [search, setSearch] = useState("");
  const [supplier, setSupplier] = useState("");
  const [barcode, setBarcode] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<EditableRow | null>(null);
  const [printing, setPrinting] = useState<BarcodeLabelItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [preview, setPreview] = useState<{ image: string; name: string } | null>(null);

  // Debounced mirrors of the free-text inputs. Typing stays responsive while the
  // query refires ~250ms after the last keystroke instead of on every character.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedBarcode, setDebouncedBarcode] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setDebouncedBarcode(barcode.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(id);
  }, [search, barcode]);

  const filters = {
    search: debouncedSearch || undefined,
    supplier: supplier || undefined,
    barcode: debouncedBarcode || undefined,
  };

  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey: ["inventory_list", filters.search, filters.supplier, filters.barcode, page],
    queryFn: async () => {
      const { data } = await frappeApi.inventoryList({
        ...filters,
        limit: PAGE_SIZE,
        start: page * PAGE_SIZE,
      });
      return data;
    },
    // Keep the previous rows on screen while the next search resolves, so the
    // table does not flash empty between keystrokes.
    placeholderData: keepPreviousData,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await frappeApi.listSuppliers();
      return data;
    },
  });

  const resetFilters = () => {
    setSearch("");
    setSupplier("");
    setBarcode("");
    setPage(0);
  };

  const hasFilters = Boolean(search || supplier || barcode);

  // With responseType "blob" a Frappe error body arrives as a Blob, so
  // extractFrappeError (which expects a parsed axios error) sees nothing usable.
  // Pull the message out of the decoded JSON by hand.
  const messageFromFrappeBody = (body: any): string | null => {
    if (!body || typeof body !== "object") return null;

    if (body._server_messages) {
      try {
        const messages = JSON.parse(body._server_messages);
        const first = JSON.parse(messages[0]);
        return first.message || first;
      } catch {
        /* fall through */
      }
    }
    if (typeof body.exception === "string") {
      const line = body.exception.split("\n")[0];
      return line.replace(/^.*?:\s*/, "") || line;
    }
    if (typeof body.message === "string") return body.message;
    return null;
  };

  const decodeBlobError = async (blob: Blob): Promise<string | null> => {
    try {
      return messageFromFrappeBody(JSON.parse(await blob.text()));
    } catch {
      // Not JSON (an HTML error page, or an empty body).
      return null;
    }
  };

  // The endpoint streams raw .xlsx bytes, so turn the blob into a download.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await frappeApi.inventoryExport(filters);
      const blob = response.data as Blob;

      // A server-side throw can still come back as 200 with a JSON body where the
      // spreadsheet should be. Saving that as .xlsx would hand the user a corrupt
      // file, so surface it as an error instead.
      if (blob.type && blob.type.includes("json")) {
        showToast((await decodeBlobError(blob)) || "Export failed", "error", 5000);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "inventory.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const body = (err as { response?: { data?: unknown } })?.response?.data;
      const decoded = body instanceof Blob ? await decodeBlobError(body) : null;
      showToast(decoded || extractFrappeError(err), "error", 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const money = (v: number) => (v > 0 ? v.toFixed(2) : "—");

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search name, code, barcode or supplier..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {/* Results refresh as you type; show that a fetch is in flight without
              blanking the table. */}
          {isFetching && !isLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </span>
          )}
        </div>

        <input
          type="text"
          value={barcode}
          onChange={(e) => {
            setBarcode(e.target.value);
            setPage(0);
          }}
          placeholder="Barcode"
          className="w-full sm:w-40 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />

        <select
          value={supplier}
          onChange={(e) => {
            setSupplier(e.target.value);
            setPage(0);
          }}
          className="w-full sm:w-48 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All suppliers</option>
          {suppliers.map((s: any) => (
            <option key={s.name} value={s.name}>
              {s.supplier_name || s.name}
            </option>
          ))}
        </select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-4 w-4" /> Clear
          </Button>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExport}
          isLoading={isExporting}
          disabled={isExporting}
        >
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            {hasFilters ? "No items match these filters" : "No items yet"}
          </p>
        )}

        {!isLoading && rows.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-medium">Item Name</th>
                <th className="px-3 py-2 font-medium">Barcode</th>
                <th className="px-3 py-2 font-medium">Supplier</th>
                <th className="px-3 py-2 font-medium text-right">Buying</th>
                <th className="px-3 py-2 font-medium text-right">Selling</th>
                <th className="px-3 py-2 font-medium text-right">Stock</th>
                <th className="px-3 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row: any) => (
                <tr key={row.item_code} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <p className="font-medium text-gray-900">{row.item_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.item_code}</p>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {row.barcode || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{row.supplier || "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{money(row.cost_price)}</td>
                  <td className="px-3 py-2 text-right text-gray-600">{money(row.selling_price)}</td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={
                        row.qty > 0 ? "font-medium text-gray-900" : "font-medium text-red-600"
                      }
                    >
                      {row.qty}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">{row.stock_uom}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {row.image && (
                        <button
                          onClick={() => setPreview({ image: row.image, name: row.item_name })}
                          title="View image"
                          className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100 transition-colors"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setPrinting({
                            item_code: row.item_code,
                            item_name: row.item_name,
                            barcode: row.barcode,
                            selling_price: row.selling_price,
                          })
                        }
                        disabled={!row.barcode}
                        title={
                          row.barcode
                            ? "Print barcode"
                            : "No barcode — add one from Edit first"
                        }
                        className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:hover:text-gray-400 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          setEditing({
                            item_code: row.item_code,
                            item_name: row.item_name,
                            barcode: row.barcode,
                            supplier: row.supplier,
                            cost_price: row.cost_price,
                            selling_price: row.selling_price,
                            qty: row.qty,
                            image: row.image,
                          })
                        }
                        title="Edit"
                        className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onSelectItem(row.item_code)}
                        title="View"
                        className="p-1.5 rounded-md text-gray-400 hover:text-primary-600 hover:bg-gray-100 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(page > 0 || rows.length === PAGE_SIZE) && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || isLoading}
          >
            Previous
          </Button>
          <span className="text-xs text-gray-400">Page {page + 1}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={rows.length < PAGE_SIZE || isLoading}
          >
            Next
          </Button>
        </div>
      )}

      <EditInventoryItemModal
        isOpen={editing !== null}
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: ["inventory_list"] });
        }}
      />

      <PrintBarcodeModal
        isOpen={printing !== null}
        item={printing}
        onClose={() => setPrinting(null)}
      />
      <ProductImageModal
        image={preview?.image ?? null}
        itemName={preview?.name ?? "Product image"}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
