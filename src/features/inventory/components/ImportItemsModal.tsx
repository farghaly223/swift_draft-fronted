"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { frappeApi } from "@/lib/api";
import { extractFrappeError } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { FileSpreadsheet, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

interface PreviewRow {
  row_number: number;
  item_name: string;
  qty: number | null;
  supplier: string | null;
  cost_price: number | null;
  selling_price: number | null;
  action: "create" | "update";
  item_code: string | null;
  // Every sheet line folded into this one. Length > 1 means the quantity shown
  // is the sum of repeated rows for the same item.
  merged_from: number[];
}

interface RowError {
  row: number;
  item_name: string;
  error: string;
  // Present on commit failures. The preview reports validation errors only, so
  // these stay optional rather than forcing empty placeholders into that path.
  supplier?: string;
  qty?: number | null;
  warehouse?: string;
  exception?: string;
  traceback?: string;
}

interface Preview {
  columns_detected: string[];
  total_rows: number;
  valid_count: number;
  create_count: number;
  update_count: number;
  merged_count: number;
  new_suppliers: string[];
  rows: PreviewRow[];
  errors: RowError[];
}

export function ImportItemsModal({ isOpen, onClose, onImported }: Props) {
  const showToast = useUIStore((s) => s.showToast);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [warehouse, setWarehouse] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState("");
  // Rows the server refused during the commit. Kept on screen after a partial
  // import: previously these were returned by the API and thrown away, so a row
  // that appeared in the preview just vanished with no reason given.
  const [failedRows, setFailedRows] = useState<RowError[]>([]);

  // Stock has to land somewhere explicit. Without a choice the server falls back
  // to its own default, which is how items ended up in the wrong warehouse.
  const { data: warehouseData, isLoading: loadingWarehouses } = useQuery({
    queryKey: ["import_warehouses"],
    queryFn: async () => {
      const { data } = await frappeApi.listImportWarehouses();
      return data as {
        warehouses: { name: string; warehouse_name: string }[];
        default: string | null;
      };
    },
    enabled: isOpen,
  });
  const warehouses = warehouseData?.warehouses ?? [];

  // Preselect the server's default so the common case needs no interaction.
  useEffect(() => {
    if (!isOpen || warehouse || warehouses.length === 0) return;
    setWarehouse(warehouseData?.default || warehouses[0].name);
  }, [isOpen, warehouse, warehouses, warehouseData]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setError("");
    setFailedRows([]);
    setIsPreviewing(false);
    setIsCommitting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleClose = () => {
    if (isPreviewing || isCommitting) return;
    reset();
    onClose();
  };

  // Step 1 — the server parses and validates without writing anything.
  const handlePick = async (picked: File | null) => {
    setError("");
    setPreview(null);
    setFailedRows([]);
    setFile(picked);
    if (!picked) return;

    if (!picked.name.toLowerCase().endsWith(".xlsx")) {
      setError("Only .xlsx files are supported. Please re-save the sheet as .xlsx.");
      return;
    }

    setIsPreviewing(true);
    try {
      const { data } = await frappeApi.inventoryImportPreview(picked, warehouse);
      setPreview(data);
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsPreviewing(false);
    }
  };

  // Step 2 — the same file is re-sent and applied row by row.
  const handleCommit = async () => {
    if (!file) return;
    setError("");
    setFailedRows([]);
    setIsCommitting(true);
    try {
      const { data } = await frappeApi.inventoryImportCommit(file, warehouse);
      const parts = [`${data.created} created`, `${data.updated} updated`];
      // Without this the Storekeeper sees fewer items than rows in their sheet
      // and has no way to tell a merge apart from lost data.
      if (data.merged > 0) parts.push(`${data.merged} duplicate rows merged`);
      if (data.skipped > 0) parts.push(`${data.skipped} skipped`);
      const where = data.warehouse ? ` into ${data.warehouse}` : "";
      showToast(
        `Import finished${where}: ${parts.join(", ")}`,
        data.skipped > 0 ? "warning" : "success",
        5000,
      );
      if (data.stock_message) showToast(data.stock_message, "info", 6000);

      onImported();

      // A partial import keeps the dialog open showing exactly which rows failed
      // and why. Clearing here is what previously made rejected rows disappear
      // without explanation.
      const rejected: RowError[] = data.errors ?? [];
      if (rejected.length > 0) {
        setFailedRows(rejected);
        setPreview(null);
        setFile(null);
        if (fileRef.current) fileRef.current.value = "";
      } else {
        reset();
      }
    } catch (err) {
      setError(extractFrappeError(err));
    } finally {
      setIsCommitting(false);
    }
  };

  const busy = isPreviewing || isCommitting;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Items from Excel" maxWidth="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Import into warehouse
          </label>
          <select
            value={warehouse}
            disabled={busy || loadingWarehouses}
            onChange={(e) => {
              setWarehouse(e.target.value);
              // The preview reflects a specific warehouse, so it is no longer
              // valid once the target changes. Re-read the same file against the
              // new warehouse instead of letting a stale preview be committed.
              setFailedRows([]);
              if (file) handlePick(file);
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:opacity-50"
          >
            {loadingWarehouses && <option value="">Loading warehouses...</option>}
            {!loadingWarehouses && warehouses.length === 0 && (
              <option value="">No warehouse available</option>
            )}
            {warehouses.map((w) => (
              <option key={w.name} value={w.name}>
                {w.warehouse_name || w.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            All stock in this sheet will be set in this warehouse.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excel file (.xlsx)</label>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            disabled={busy || !warehouse}
            onChange={(e) => handlePick(e.target.files?.[0] || null)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-gray-100 file:text-sm file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
          />
          <p className="text-xs text-gray-400 mt-1">
            Expected columns: Name, QTY, Supplier, Cost Price, Selling Price
          </p>
        </div>

        {failedRows.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {failedRows.length} row{failedRows.length === 1 ? "" : "s"} could not be imported
            </p>
            <ul className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {failedRows.map((r) => (
                <li key={r.row} className="text-xs text-red-700">
                  <span className="font-medium">Row {r.row}</span>
                  {r.item_name ? ` — ${r.item_name}` : ""}
                  {r.exception ? ` [${r.exception}]` : ""}: {r.error}
                  <div className="text-red-600 mt-0.5">
                    Supplier: {r.supplier || "—"} · Qty: {r.qty ?? "—"} · Warehouse:{" "}
                    {r.warehouse || "—"}
                  </div>
                  {r.traceback && (
                    <details className="mt-0.5">
                      <summary className="cursor-pointer text-red-600 select-none">
                        Traceback
                      </summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all text-[10px] leading-tight text-red-700 bg-red-100 rounded p-2 max-h-40 overflow-y-auto">
                        {r.traceback}
                      </pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-600 mt-2">
              Everything else was imported. Fix these rows and import the sheet again.
            </p>
          </div>
        )}

        {isPreviewing && (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Reading and validating the sheet...
          </p>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg py-2">
                <p className="text-lg font-semibold text-gray-900">{preview.total_rows}</p>
                <p className="text-xs text-gray-500">Rows</p>
              </div>
              <div className="bg-green-50 rounded-lg py-2">
                <p className="text-lg font-semibold text-green-700">{preview.create_count}</p>
                <p className="text-xs text-green-600">New</p>
              </div>
              <div className="bg-blue-50 rounded-lg py-2">
                <p className="text-lg font-semibold text-blue-700">{preview.update_count}</p>
                <p className="text-xs text-blue-600">Update</p>
              </div>
              <div className="bg-red-50 rounded-lg py-2">
                <p className="text-lg font-semibold text-red-700">{preview.errors.length}</p>
                <p className="text-xs text-red-600">Skipped</p>
              </div>
            </div>

            {preview.merged_count > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {preview.merged_count}{" "}
                {preview.merged_count === 1 ? "duplicate row was" : "duplicate rows were"} merged —
                repeated items had their quantities added together.
              </p>
            )}

            <p className="text-xs text-gray-400">
              Detected columns: {preview.columns_detected.join(", ") || "—"}
            </p>

            {preview.new_suppliers.length > 0 && (
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                <span className="font-medium">{preview.new_suppliers.length} new supplier(s)</span> will
                be created: {preview.new_suppliers.join(", ")}
              </p>
            )}

            {preview.rows.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left text-xs text-gray-500">
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">Item Name</th>
                        <th className="px-3 py-2 font-medium">Qty</th>
                        <th className="px-3 py-2 font-medium">Supplier</th>
                        <th className="px-3 py-2 font-medium text-right">Cost</th>
                        <th className="px-3 py-2 font-medium text-right">Sell</th>
                        <th className="px-3 py-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.rows.map((row) => (
                        <tr key={row.row_number}>
                          <td className="px-3 py-1.5 text-xs text-gray-400">{row.row_number}</td>
                          <td className="px-3 py-1.5 text-gray-900">{row.item_name}</td>
                          <td className="px-3 py-1.5 text-gray-600">
                            {row.qty ?? "—"}
                            {row.merged_from.length > 1 && (
                              <span
                                className="ml-1.5 text-xs text-amber-700"
                                title={`Sum of rows ${row.merged_from.join(", ")}`}
                              >
                                (+{row.merged_from.length - 1})
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-gray-600">{row.supplier || "—"}</td>
                          <td className="px-3 py-1.5 text-gray-600 text-right">
                            {row.cost_price ?? "—"}
                          </td>
                          <td className="px-3 py-1.5 text-gray-600 text-right">
                            {row.selling_price ?? 0}
                          </td>
                          <td className="px-3 py-1.5">
                            <span
                              className={
                                row.action === "create"
                                  ? "text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"
                                  : "text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700"
                              }
                            >
                              {row.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.errors.length > 0 && (
              <div className="border border-red-200 bg-red-50 rounded-lg p-3">
                <p className="text-sm font-medium text-red-700 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="h-4 w-4" /> These rows will be skipped
                </p>
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {preview.errors.map((e, i) => (
                    <li key={`${e.row}-${i}`} className="text-xs text-red-700">
                      Row {e.row}
                      {e.item_name ? ` (${e.item_name})` : ""}: {e.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.valid_count === 0 && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> No valid rows to import.
              </p>
            )}

            {preview.valid_count > 0 && (
              <p className="text-sm text-gray-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Ready to import {preview.valid_count} row(s). Stock will be set to the sheet quantity.
              </p>
            )}
          </div>
        )}

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
            onClick={handleClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={handleCommit}
            isLoading={isCommitting}
            disabled={busy || !preview || preview.valid_count === 0}
          >
            <Upload className="h-4 w-4" /> Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}
