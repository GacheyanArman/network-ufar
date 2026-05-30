import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={className}>
        {label && <label htmlFor={inputId} className="label-base">{label}</label>}
        <input
          ref={ref}
          id={inputId}
          className={`input-base ${error ? "input-error" : ""}`}
          {...props}
        />
        {error && <div className="error-msg">{error}</div>}
      </div>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={className}>
        {label && <label htmlFor={inputId} className="label-base">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={`input-base ${error ? "input-error" : ""}`}
          style={{ minHeight: "100px", resize: "vertical" }}
          {...props}
        />
        {error && <div className="error-msg">{error}</div>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", id, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className={className}>
        {label && <label htmlFor={selectId} className="label-base">{label}</label>}
        <div className="select-wrapper">
          <select
            ref={ref}
            id={selectId}
            className={`input-base select-base ${error ? "input-error" : ""}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </div>
    );
  }
);
Select.displayName = "Select";
