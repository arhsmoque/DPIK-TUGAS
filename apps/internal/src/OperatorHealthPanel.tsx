import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface HealthSnapshot {
  asOf: string;
  databaseConnected: boolean;
  outboxPendingCount: number;
  outboxOldestPendingAt: string | null;
  openDefectCount: number;
  deferredGateCount: number;
}

interface Props {
  supabase: SupabaseClient;
  onError: (message: string) => void;
}

function ageLabel(iso: string | null): string {
  if (!iso) return "none pending";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m old`;
  return `${Math.round(minutes / 60)}h old`;
}

export function OperatorHealthPanel({ supabase, onError }: Props): JSX.Element {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setDenied(false);
    const result = await supabase.rpc("operator_health_snapshot");
    if (result.error) {
      if (result.error.code === "42501") setDenied(true);
      else onError(result.error.message);
    } else {
      setSnapshot(result.data as HealthSnapshot);
    }
    setLoading(false);
  }, [supabase, onError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading) {
    return (
      <section className="panel">
        <h3>Operator Health</h3>
        <p>Loading platform signals…</p>
      </section>
    );
  }

  if (denied) {
    return (
      <section className="panel">
        <h3>Operator Health</h3>
        <p>
          You do not hold the Administration bundle needed to view platform-wide health. Ask an
          existing admin to grant it via Admin &rarr; Capability grants.
        </p>
      </section>
    );
  }

  if (!snapshot) {
    return (
      <section className="panel">
        <h3>Operator Health</h3>
        <p>No health signal available yet.</p>
      </section>
    );
  }

  const attention =
    snapshot.outboxPendingCount > 0 ||
    snapshot.openDefectCount > 0 ||
    snapshot.deferredGateCount > 0;

  return (
    <section className="panel">
      <h3>Operator Health</h3>
      <p>
        Read-only, aggregate-only signals for the whole platform, not just this Project: pending
        outbox messages, open defect reports, and deferred governance gates. Migration and
        infrastructure status are deliberately not shown here — that is CLI/CI evidence, not a
        browser permission.
      </p>
      <div
        className="health"
        style={{ borderLeftColor: attention ? "var(--accent-gold)" : "#23875b" }}
      >
        <strong>{attention ? "Needs attention" : "All clear"}</strong>
        <span className={attention ? undefined : "healthy"}>
          as of {new Date(snapshot.asOf).toLocaleTimeString()}
        </span>
        <button className="secondary" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>
      <div className="metric-grid">
        <article className="metric">
          <span>Outbox pending</span>
          <strong>{snapshot.outboxPendingCount}</strong>
          <small>{ageLabel(snapshot.outboxOldestPendingAt)}</small>
        </article>
        <article className="metric">
          <span>Open defect reports</span>
          <strong>{snapshot.openDefectCount}</strong>
          <small>needs acknowledgement in Admin</small>
        </article>
        <article className="metric">
          <span>Deferred gates</span>
          <strong>{snapshot.deferredGateCount}</strong>
          <small>overridden at operator&rsquo;s own risk</small>
        </article>
      </div>
    </section>
  );
}
