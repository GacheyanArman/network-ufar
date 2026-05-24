export function getAllowedEmailDomains(): string[] {
  const domainsStr = process.env.ALLOWED_EMAIL_DOMAINS || "ufar.am,ufar.com";
  return domainsStr.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
}

export function getInviteCode(): string | undefined {
  return process.env.INVITE_CODE;
}

export function getAllowedEmails(): string[] {
  const emailsStr = process.env.ALLOWED_INDIVIDUAL_EMAILS || "";
  return emailsStr.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}
