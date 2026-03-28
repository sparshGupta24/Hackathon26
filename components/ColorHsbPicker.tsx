"use client";

interface ColorHsbPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

export function ColorHsbPicker({ label, value, onChange, disabled }: ColorHsbPickerProps) {
  return (
    <div className="hsb-picker">
      <div className="hsb-head">
        <span>{label}</span>
        <span className="hsb-meta">
          <span className="hsb-swatch" style={{ backgroundColor: value }} />
          {value}
        </span>
      </div>
      <input
        className="color-wheel"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
        disabled={disabled}
        aria-label={`${label} color picker`}
      />
    </div>
  );
}
