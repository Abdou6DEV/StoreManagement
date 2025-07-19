import React from "react";

interface DiscountErrorModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

const DiscountErrorModal: React.FC<DiscountErrorModalProps> = ({ open, message, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-md space-y-4 flex flex-col items-center">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
          {message}
        </h2>
        <div className="flex justify-end gap-2 w-full">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80 border border-border"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountErrorModal; 