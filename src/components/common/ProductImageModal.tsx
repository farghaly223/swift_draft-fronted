"use client";

import { Modal } from "@/components/common/Modal";
import { env } from "@/config/env";

interface Props {
  image: string | null;
  itemName: string;
  onClose: () => void;
}

export function ProductImageModal({ image, itemName, onClose }: Props) {
  let imageUrl: string | null = null;
  if (image) {
    try {
      const backend = new URL(env.FRAPPE_URL);
      const candidate = new URL(image, backend);
      if (candidate.origin === backend.origin && candidate.pathname.startsWith("/files/")) {
        imageUrl = candidate.toString();
      }
    } catch {
      imageUrl = null;
    }
  }
  return (
    <Modal isOpen={Boolean(imageUrl)} onClose={onClose} title={itemName} maxWidth="sm">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={itemName}
          className="w-full max-h-[60vh] object-contain rounded"
        />
      )}
    </Modal>
  );
}
