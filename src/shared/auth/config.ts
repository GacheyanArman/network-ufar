export function getAllowedEmailDomains(): string[] {
  const domainsStr = process.env.ALLOWED_EMAIL_DOMAINS || "ufar.am,ufar.com";
  return domainsStr.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

export function getInviteCode(): string | undefined {
  return process.env.INVITE_CODE;
}
