import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmButtonProps {
  buttonText: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
  buttonClassName?: string;
}

export default function ConfirmButton({
  buttonText,
  confirmText,
  onConfirm,
  buttonClassName,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // handle ESC key and disable body scroll while open
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const handleConfirm = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Trigger button: stops propagation so parent onClick doesn't run */}
      <button
        type="button"
        className={`px-4 py-2 rounded-lg ${buttonClassName ?? "bg-red-600 text-white hover:bg-red-700"}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {buttonText}
      </button>

      {/* Portal overlay/modal - rendered into document.body */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* backdrop - catches clicks to close */}
            <div
              className="absolute inset-0 bg-black/40"
              onClick={(e) => {
                // stop propagation to prevent parent handlers and close modal
                e.stopPropagation();
                setOpen(false);
              }}
            />

            {/* dialog - captures clicks so they don't reach backdrop/underlying UI */}
            <div
              role="dialog"
              aria-modal="true"
              className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-3 text-gray-900">{confirmText}</h2>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? "Working…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
