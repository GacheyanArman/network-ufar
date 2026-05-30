import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "elevated" | "outlined" | "flat";
  interactive?: boolean;
}

export function Card({
  children,
  padding = "md",
  variant = "elevated",
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`card-base card-padding-${padding} card-${variant} ${interactive ? "card-interactive" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
