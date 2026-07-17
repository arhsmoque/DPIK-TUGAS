export type { AuthenticatedIdentity } from "./domain/authenticated-identity";
export type { AuthenticationFailure, IdentityProvider } from "./ports/identity-provider";
export { authenticateIdentity } from "./application/authenticate";
export { SupabaseIdentityProvider } from "./adapters/supabase/supabase-identity-provider";
