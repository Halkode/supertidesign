// /admin/* — when Cloudflare Access is configured (ACCESS_TEAM_DOMAIN + ACCESS_AUD), the panel
// files are only served to requests carrying a valid Access token.
import { accessDenied, accessEnabled, verifyAccess } from "../../server/access.js";

export async function onRequest({ request, env, next }) {
  if (accessEnabled(env)) {
    const a = await verifyAccess(request, env);
    if (a.error) return accessDenied(a.error);
  }
  return next();
}
