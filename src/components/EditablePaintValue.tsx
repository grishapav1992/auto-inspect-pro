import { useState, useRef, useEffect } from "react";

interface EditablePaintValueProps {
  value: number;
  min: number;
  max: number;
  suffix?: string;
  className?: string;
  onChange: (v: number) => void;
}

const EditablePaintValue = ({
  value, min, max, suffix = "мкм", className = "", onChange,
}: EditablePaintValueProps) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setInputVal(String(value));
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [editing]);

  const commit = () => {
    const num = parseInt(inputVal, 10);
    if (!isNaN(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        className={`w-20 text-center text-sm font-semibold bg-muted rounded-lg border border-primary/30 px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={`font-semibold text-foreground underline decoration-dotted decoration-muted-foreground/40 underline-offset-4 hover:text-primary transition-colors ${className}`}
    >
      {value} {suffix}
    </button>
  );
};

export default EditablePaintValue;
