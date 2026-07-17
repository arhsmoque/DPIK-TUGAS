# Identity Access

Owns verified internal identity and the port used to authenticate a bearer access token. The
Supabase adapter calls `auth.getUser(token)`, which validates the token with the Auth server; it
does not trust a browser-supplied email or locally decoded claims as identity authority.

The module deliberately stops at authentication. `project-context` resolves active scope and
candidate permissions after identity is known.

