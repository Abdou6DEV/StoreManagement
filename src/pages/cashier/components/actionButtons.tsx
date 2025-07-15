import React from "react";
import { CheckCircle, Trash2 } from "lucide-react";

interface Props {
  onClear: () => void;
  onFinish?: () => void; // Optional callback for future logic
}

export default function ActionButtons({ onClear, onFinish }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <button
        onClick={onFinish}
        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-primary text-primary-foreground font-bold text-lg tracking-wide shadow-md hover:bg-primary/90 transition focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Finish Sale"
      >
        <CheckCircle className="w-6 h-6" />
        <span>Finish Sale</span>
      </button>

      <button
        onClick={onClear}
        className="flex-1 flex items-center justify-center gap-2 py-4 rounded-lg bg-destructive text-white font-semibold text-lg tracking-wide shadow-md hover:bg-destructive/80 transition focus:outline-none focus:ring-2 focus:ring-destructive/50"
        aria-label="Clear Cart"
      >
        <Trash2 className="w-6 h-6" />
        <span>Clear Cart</span>
      </button>
    </div>
  );
}
