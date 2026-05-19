import React from "react";
import UiIcon from "./UiIcon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconPosition?: "left" | "right";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  isLoading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseClass = "btn-base";
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const loadingClass = isLoading ? "btn-loading" : "";
  const disabledClass = disabled || isLoading ? "btn-disabled" : "";

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${loadingClass} ${disabledClass} ${className}`.trim()}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="btn-spinner" />
      ) : (
        <>
          {icon && iconPosition === "left" && <UiIcon name={icon} size={size === "sm" ? 14 : 18} />}
          {children}
          {icon && iconPosition === "right" && <UiIcon name={icon} size={size === "sm" ? 14 : 18} />}
        </>
      )}
    </button>
  );
}
