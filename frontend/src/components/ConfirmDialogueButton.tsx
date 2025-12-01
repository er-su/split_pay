import { useState } from "react";

interface ConfirmButtonProps {
  buttonText: string;
  confirmText: string;
  onConfirm: (e: any) => void | Promise<void>;  // callback executed on confirm
  buttonClassName?: string;
}

export default function ConfirmButton({
  buttonText,
  confirmText,
  onConfirm,
  buttonClassName
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    onConfirm(); // perform delete or other action
    setOpen(false);
  };

  return (
    <>
      <button
        className={`px-4 py-2 rounded-lg ${buttonClassName ?? ""}`}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)}}
      >
        {buttonText}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">{confirmText}</h2>

            <div className="flex justify-end gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                }}
                className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
