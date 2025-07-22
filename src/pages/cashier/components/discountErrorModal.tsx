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
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-md space-y-4 flex flex-col items-center animate-in zoom-in-95 duration-300 ease-out">
        {/* Triangle Error Icon */}
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center animate-in zoom-in-90 duration-500 delay-100">
          <svg
            className="w-8 h-8 text-red-600 dark:text-red-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 text-center">
          {message}
        </h2>
        
        <div className="flex justify-end gap-2 w-full">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80 border border-border transition-all duration-200 hover:scale-105 active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountErrorModal; 