import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string; // E.164 "+1XXXXXXXXXX" or ""
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

function toLocal(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  return digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Returns true if value is a valid US phone number (+1 followed by 10 digits) or empty. */
export function isValidPhone(value: string): boolean {
  if (!value) return true;
  return /^\+1\d{10}$/.test(value);
}

export function PhoneInput({
  value,
  onChange,
  disabled = false,
  placeholder = "8188188181",
  className,
}: PhoneInputProps) {
  const local = toLocal(value);

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    onChange(digits ? `+1${digits}` : "");
  }

  return (
    <div
      className={cn(
        "flex items-center rounded-md border border-input bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <span className="shrink-0 select-none border-r border-input px-3 py-2 font-medium text-foreground">
        +1
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
      />
    </div>
  );
}
