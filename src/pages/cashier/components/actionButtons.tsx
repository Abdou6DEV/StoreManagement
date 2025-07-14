import React from "react";

interface Props {
  onClear: () => void;
  onFinish?: () => void; // Optional callback for future logic
}

export default function ActionButtons({ onClear, onFinish }: Props) {
  return (
    <div className="flex flex-col space-y-3">
      <button
        onClick={onFinish}
        className="w-full py-4 rounded-md bg-primary text-primary-foreground font-bold text-lg tracking-wide shadow-md hover:bg-primary/90 transition"
      >
        ✅ Finish Sale
      </button>

      <button
        onClick={onClear}
        className="w-full py-3 rounded-md bg-destructive text-destructive-foreground font-semibold text-sm tracking-wide hover:bg-destructive/80 transition"
      >
        🗑️ Clear Cart
      </button>
    </div>
  );
}
