import type { SupabaseClient } from "@supabase/supabase-js";

export interface RpcResult {
  ok: boolean;
  message: string;
}

export async function callRpc(
  supabase: SupabaseClient,
  fn: string,
  params: Record<string, unknown>,
  successMessage: string
): Promise<RpcResult> {
  const result = await supabase.rpc(fn, params);
  if (result.error) return { ok: false, message: result.error.message };
  return { ok: true, message: successMessage };
}

export function inHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}
