interface StyledNumberInputProps {
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
}

export default function StyledNumberInput({
  value,
  onChange,
  min = 0,
  max = 2_147_483_647,
  placeholder = "",
  disabled = false,
}: StyledNumberInputProps) {
  return (
    <div className="relative w-full">
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "") {
            onChange("");
          } else {
            onChange(Number(val));
          }
        }}
        onFocus={(e) => {
          if (value === 0) {
            e.target.select(); // 👈 select the "0" so typing replaces it
          }
        }}
        className="w-full px-4 py-3 pr-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50"
        placeholder={placeholder}
        min={min}
        max={max}
        disabled={disabled}
      />
    </div>
  );
}
