import type { ReactNode } from "react";

const GOLD = "var(--french-gold)";
const NAVY = "var(--french-navy)";
const BLUE = "var(--french-blue)";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  narrow?: boolean;
};

const bgStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: `linear-gradient(160deg, #0d1b2a 0%, ${NAVY} 50%, ${BLUE} 100%)`,
  position: "relative" as const,
  overflow: "hidden",
};

const radialOverlay = {
  position: "absolute" as const,
  top: "-30%",
  right: "-10%",
  width: "600px",
  height: "600px",
  background: `radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)`,
  pointerEvents: "none" as const,
};

const radialOverlay2 = {
  position: "absolute" as const,
  bottom: "-20%",
  left: "-10%",
  width: "500px",
  height: "500px",
  background: `radial-gradient(circle, rgba(44,90,160,0.1) 0%, transparent 70%)`,
  pointerEvents: "none" as const,
};

const cardStyle = {
  width: "100%",
  maxWidth: "440px",
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: `1px solid rgba(212, 175, 55, 0.12)`,
  borderRadius: "24px",
  padding: "40px 36px",
  boxShadow: "0 32px 80px rgba(0, 0, 0, 0.4), 0 0 1px rgba(212, 175, 55, 0.1)",
  position: "relative" as const,
  zIndex: 1,
};

const logoStyle = {
  width: "64px",
  height: "64px",
  borderRadius: "20px",
  background: "transparent",
  border: `2px solid ${GOLD}`,
  color: GOLD,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "1.8rem",
  fontWeight: 800,
  margin: "0 auto 20px",
  boxShadow: `0 0 24px rgba(212, 175, 55, 0.12)`,
  letterSpacing: "-0.02em",
};

const titleStyle = {
  margin: 0,
  fontSize: "1.65rem",
  lineHeight: 1.25,
  fontWeight: 800,
  color: "var(--bg-card)",
  textAlign: "center" as const,
  letterSpacing: "-0.02em",
};

const subtitleStyle = {
  margin: "10px 0 0",
  color: "rgba(255, 255, 255, 0.50)",
  fontSize: "0.92rem",
  textAlign: "center" as const,
  lineHeight: 1.5,
};

const dividerStyle = {
  width: "40px",
  height: "2px",
  background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
  margin: "24px auto",
  border: "none",
};

export const authInputStyle = {
  width: "100%",
  height: "48px",
  boxSizing: "border-box" as const,
  background: "rgba(255, 255, 255, 0.06)",
  border: "none",
  borderBottom: "1.5px solid rgba(255, 255, 255, 0.18)",
  borderRadius: "8px 8px 0 0",
  padding: "14px 16px",
  fontSize: "0.92rem",
  color: "var(--bg-card)",
  outline: "none",
  transition: "border-bottom-color 0.2s ease, box-shadow 0.2s ease",
};

export const authLabelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "rgba(255, 255, 255, 0.60)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.1em",
};

export const authButtonStyle = (disabled = false) => ({
  width: "100%",
  height: "50px",
  border: `1px solid rgba(212, 175, 55, ${disabled ? "0.10" : "0.25"})`,
  borderRadius: "12px",
  background: disabled
    ? "rgba(255,255,255,0.08)"
    : `linear-gradient(135deg, ${NAVY}, ${BLUE})`,
  color: disabled ? "rgba(255,255,255,0.35)" : "var(--bg-card)",
  fontSize: "0.92rem",
  fontWeight: 800,
  letterSpacing: "0.06em",
  cursor: disabled ? "not-allowed" : "pointer",
  marginTop: "6px",
  boxShadow: disabled
    ? "none"
    : "0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
  transition: "box-shadow 0.2s ease, background 0.2s ease",
});

export const authErrorStyle = {
  color: "#fca5a5",
  fontSize: "0.86rem",
  textAlign: "center" as const,
  background: "rgba(220, 38, 38, 0.12)",
  border: "1px solid rgba(220, 38, 38, 0.25)",
  padding: "10px 14px",
  borderRadius: "10px",
};

export const authSuccessStyle = {
  color: "#86efac",
  fontSize: "0.86rem",
  textAlign: "center" as const,
  background: "rgba(5, 150, 105, 0.12)",
  border: "1px solid rgba(5, 150, 105, 0.25)",
  padding: "10px 14px",
  borderRadius: "10px",
};

export const authLinkStyle = {
  color: GOLD,
  fontWeight: 700,
  textDecoration: "none",
  fontSize: "0.86rem",
  transition: "text-shadow 0.2s ease",
};

export const authFooterStyle = {
  margin: "24px 0 0",
  textAlign: "center" as const,
  color: "rgba(255, 255, 255, 0.40)",
  fontSize: "0.88rem",
};

export function AuthShell({ title, subtitle, children, footer, narrow }: AuthShellProps) {
  return (
    <main style={bgStyle}>
      <div style={radialOverlay} />
      <div style={radialOverlay2} />
      <section style={narrow ? { ...cardStyle, maxWidth: "380px" } : cardStyle}>
        <div style={logoStyle}>U</div>
        <h1 style={titleStyle}>{title}</h1>
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
        <hr style={dividerStyle} />
        {children}
        {footer && <div style={authFooterStyle}>{footer}</div>}
      </section>
    </main>
  );
}
