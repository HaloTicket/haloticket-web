import { getKeycloakSession } from "@/services/keycloakSession";
import { parseJwt } from "@/services/userApi";

/**
 * True when the access token itself carries ROLE_ADMIN. The gateway and the AI service decide by the token and not by the
 * roles stored in the user profile, so a screen that depends on those services must ask the same question.
 */
export function isAdminToken(): boolean {
  const token = getKeycloakSession().getCurrentToken();
  if (!token) return false;
  const payload = parseJwt(token) as (ReturnType<typeof parseJwt> & { roles?: string[] }) | null;
  const roles = [...(payload?.roles ?? []), ...(payload?.realm_access?.roles ?? [])];
  return roles.some((role) => role.toUpperCase() === "ADMIN" || role.toUpperCase() === "ROLE_ADMIN");
}
