"use client";

import { useState, FormEvent } from "react";
import { usePosSessionStore } from "@/stores/posSessionStore";
import { Modal } from "@/components/common/Modal";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";

interface OpeningCashModalProps {
  isOpen: boolean;
}

export function OpeningCashModal({ isOpen }: OpeningCashModalProps) {
  const { openSession, isOpening, error, clearError } = usePosSessionStore();
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setValidationError("Please enter a valid amount (0 or more).");
      return;
    }

    try {
      await openSession(numAmount);
    } catch {
      // error is set in store
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Start Your Shift"
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Enter the cash amount currently in the register to start your shift.
        </p>

        <Input
          label="Opening Cash Amount"
          type="number"
          placeholder="0.00"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setValidationError("");
          }}
          error={validationError}
          disabled={isOpening}
          autoFocus
        />

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isOpening}
          className="w-full"
        >
          Start Shift
        </Button>
      </form>
    </Modal>
  );
}
