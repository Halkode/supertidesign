// POST /api/logout → clears the session cookie
import { sessionCookie } from "../../server/auth.js";
import { json } from "../../server/http.js";

export const onRequestPost = ({ request }) => json({ ok: true }, 200, { "set-cookie": sessionCookie("", request) });
