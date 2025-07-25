import React, { useState, useRef, useEffect } from "react";
import { Delete } from "lucide-react";

interface CalculatorModalProps {
  open: boolean;
  onClose: () => void;
}

function safeEval(expr: string): string {
  try {
    if (!/^[\d+\-*/%.()\s]+$/.test(expr)) return "Err";
    const sanitized = expr.replace(/(\d+\.?\d*)%/g, (_, n) =>
      String(Number(n) / 100),
    );
    const fn = new Function(`"use strict"; return (${sanitized})`);
    const result = fn();
    if (typeof result === "number" && isFinite(result)) {
      return result.toString();
    }
    return "Err";
  } catch {
    return "Err";
  }
}

const buttonBase =
  "w-16 h-16 m-1 rounded-xl font-semibold text-2xl transition-all duration-150 select-none shadow-sm border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 active:scale-95 hover:bg-muted active:bg-muted/70";
const opButton = "border border-border bg-card text-foreground font-bold";
const opButtonActive = "ring-2 ring-primary bg-primary text-primary-foreground";
const funcButton = "border border-border bg-card text-foreground font-semibold";
const memButton =
  "w-14 h-8 mx-1 my-0.5 rounded bg-card text-xs font-semibold border border-border text-muted-foreground hover:bg-muted transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-primary/30";

const CalculatorModal: React.FC<CalculatorModalProps> = ({ open, onClose }) => {
  const [expression, setExpression] = useState("");
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState<number>(0);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" || e.key === "=") handleEquals();
      if (e.key === "Backspace") handleBackspace();
      if (/[0-9.]/.test(e.key)) handleInput(e.key);
      if (["+", "-", "*", "/", "%", "(", ")"].includes(e.key))
        handleInput(e.key);
      if (e.key === "%") handleInput("%");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line
  }, [expression, open]);

  const getLastOperator = () => {
    const match = expression.match(/[+\-*/]$/);
    return match ? match[0] : null;
  };

  const handleInput = (val: string) => {
    if (display === "Err") {
      setDisplay(val);
      setExpression(val);
      return;
    }
    if (expression.length > 32) return;
    if (val === ".") {
      const parts = expression.split(/[^\d.]/);
      if (parts[parts.length - 1].includes(".")) return;
    }
    setExpression((prev) => prev + val);
    setDisplay((prev) => (prev === "0" ? val : prev + val));
  };

  const handleClear = () => {
    setExpression("");
    setDisplay("0");
  };

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1));
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  };

  const handleEquals = () => {
    const result = safeEval(expression);
    setDisplay(result);
    setExpression("");
  };

  const handleSign = () => {
    const match = expression.match(/(.*?)([\d.]+)$/);
    if (match) {
      const [_, before, num] = match;
      if (num.startsWith("-")) {
        setExpression(before + num.slice(1));
        setDisplay((prev) => prev.replace(/-([\d.]+)$/, "$1"));
      } else {
        setExpression(before + "-" + num);
        setDisplay((prev) => prev.replace(/([\d.]+)$/, "-$1"));
      }
    }
  };

  const handleMemory = (type: "M+" | "M-" | "MR" | "MC") => {
    if (type === "M+") {
      const val = Number(display);
      if (!isNaN(val)) setMemory((m) => m + val);
    } else if (type === "M-") {
      const val = Number(display);
      if (!isNaN(val)) setMemory((m) => m - val);
    } else if (type === "MR") {
      setExpression(expression + memory.toString());
      setDisplay((prev) =>
        prev === "0" ? memory.toString() : prev + memory.toString(),
      );
    } else if (type === "MC") {
      setMemory(0);
    }
  };

  const lastOp = getLastOperator();

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${!open ? "hidden" : ""}`}>
      {/* Black semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/40" />
      {/* Calculator Card */}
      <div className="relative z-10 bg-card rounded-2xl shadow-2xl border border-border p-6 min-w-[340px] max-w-[95vw] flex flex-col items-center animate-fadeIn">
        {/* Header row: Title and Close button */}
        <div className="flex w-full items-center justify-between mb-2">
          <div className="flex-1 text-center text-lg font-bold text-foreground select-none">
            Calculator
          </div>
          <button
            onClick={onClose}
            className="text-2xl font-bold px-3 py-1 rounded-full text-foreground hover:bg-muted focus:ring-2 focus:ring-primary focus:outline-none transition-all duration-150 ml-2"
            aria-label="Close calculator"
            style={{ lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        {/* Memory row */}
        <div className="flex flex-row w-full justify-between mb-2">
          <button
            className={memButton}
            onClick={() => handleMemory("M+")}
            aria-label="Memory add"
          >
            M+
          </button>
          <button
            className={memButton}
            onClick={() => handleMemory("M-")}
            aria-label="Memory subtract"
          >
            M-
          </button>
          <button
            className={memButton}
            onClick={() => handleMemory("MR")}
            aria-label="Memory recall"
          >
            MR
          </button>
          <button
            className={memButton}
            onClick={() => handleMemory("MC")}
            aria-label="Memory clear"
          >
            MC
          </button>
        </div>
        {/* Expression display */}
        <div className="w-full text-right text-base text-muted-foreground font-mono pr-1 select-text min-h-[24px] tracking-wide">
          {expression || <span className="opacity-30">0</span>}
        </div>
        {/* Main display */}
        <div
          ref={inputRef}
          tabIndex={0}
          className="bg-card rounded-xl p-4 mb-3 text-right text-4xl font-mono border border-border min-h-[64px] w-[320px] max-w-full outline-none select-text shadow-inner focus:ring-2 focus:ring-primary/30 text-foreground overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-muted"
          style={{ letterSpacing: "1.5px" }}
          aria-label="Calculator display"
        >
          {display}
        </div>
        {/* Calculator buttons grid: 5 rows, 4 columns, = in rightmost column below + */}
        <div className="grid grid-cols-4 gap-2 mt-1">
          {/* Top row: C, ⌫, %, ÷ */}
          <button
            className={`${buttonBase} ${funcButton}`}
            onClick={handleClear}
            aria-label="Clear"
          >
            C
          </button>
          <button
            className={`${buttonBase} ${funcButton} flex items-center justify-center`}
            onClick={handleBackspace}
            aria-label="Backspace"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            className={`${buttonBase} ${funcButton}`}
            onClick={() => handleInput("%")}
            aria-label="Percent"
          >
            %
          </button>
          <button
            className={`${buttonBase} ${opButton}${lastOp === "/" ? ` ${opButtonActive}` : ""}`}
            onClick={() => handleInput("/")}
            aria-label="Divide"
          >
            ÷
          </button>

          {/* Second row: 7, 8, 9, × */}
          <button
            className={buttonBase}
            onClick={() => handleInput("7")}
            aria-label="7"
          >
            7
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput("8")}
            aria-label="8"
          >
            8
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput("9")}
            aria-label="9"
          >
            9
          </button>
          <button
            className={`${buttonBase} ${opButton}${lastOp === "*" ? ` ${opButtonActive}` : ""}`}
            onClick={() => handleInput("*")}
            aria-label="Multiply"
          >
            ×
          </button>

          {/* Third row: 4, 5, 6, - */}
          <button
            className={buttonBase}
            onClick={() => handleInput("4")}
            aria-label="4"
          >
            4
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput("5")}
            aria-label="5"
          >
            5
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput("6")}
            aria-label="6"
          >
            6
          </button>
          <button
            className={`${buttonBase} ${opButton}${lastOp === "-" ? ` ${opButtonActive}` : ""}`}
            onClick={() => handleInput("-")}
            aria-label="Subtract"
          >
            -
          </button>

          {/* Fourth row: 1, 2, 3, + */}
          <button
            className={buttonBase}
            onClick={() => handleInput("1")}
            aria-label="1"
          >
            1
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput("2")}
            aria-label="2"
          >
            2
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput("3")}
            aria-label="3"
          >
            3
          </button>
          <button
            className={`${buttonBase} ${opButton}${lastOp === "+" ? ` ${opButtonActive}` : ""}`}
            onClick={() => handleInput("+")}
            aria-label="Add"
          >
            +
          </button>

          {/* Fifth row: (, 0, ., = */}
          <button
            className={`${buttonBase} ${funcButton}`}
            onClick={() => handleInput("(")}
            aria-label="Left parenthesis"
          >
            (
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput("0")}
            aria-label="0"
          >
            0
          </button>
          <button
            className={buttonBase}
            onClick={() => handleInput(")")}
            aria-label="Right parenthesis"
          >
            )
          </button>
          <button
            className={`${buttonBase} bg-primary text-secondary font-bold hover:bg-primary/90`}
            onClick={handleEquals}
            aria-label="Equals"
          >
            =
          </button>
        </div>
        <div className="mt-4 text-xs text-muted-foreground w-full text-right tracking-wide">
          Memory: {memory}
        </div>
      </div>
      <style>{`
        .animate-fadeIn { animation: fadeInModal 0.35s cubic-bezier(.4,0,.2,1); }
        @keyframes fadeInModal {
          from { opacity: 0; transform: translateY(30px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default CalculatorModal;
