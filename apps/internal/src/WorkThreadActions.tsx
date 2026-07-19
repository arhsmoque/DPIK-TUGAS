import type { SupabaseClient } from "@supabase/supabase-js";

export interface WorkThreadRow {
  id: string;
  title: string;
  expected_outcome: string;
  source_reference: string;
  lifecycle:
    | "Unassigned"
    | "AwaitingAcknowledgement"
    | "Assigned"
    | "InProgress"
    | "AwaitingAcceptance"
    | "Closed"
    | "Cancelled";
  current_assignee_id: string | null;
  due_at: string | null;
  version: number;
  created_at: string;
  blocked_outcome: string | null;
  blocker_required_resolver: string | null;
  recall_requested_by: string | null;
  recall_reason: string | null;
  renegotiation_requested_by: string | null;
  renegotiation_reason: string | null;
}

interface Props {
  item: WorkThreadRow;
  identityId: string | undefined;
  permissions: Set<string>;
  supabase: SupabaseClient;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onChanged: () => Promise<void>;
}

function inHours(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function WorkThreadActions({
  item,
  identityId,
  permissions,
  supabase,
  onError,
  onSuccess,
  onChanged
}: Props): JSX.Element {
  const isAssignee = item.current_assignee_id !== null && item.current_assignee_id === identityId;
  const hasAssignment = item.current_assignee_id !== null;
  const isTerminal = item.lifecycle === "Closed" || item.lifecycle === "Cancelled";

  async function call(
    fn: string,
    params: Record<string, unknown>,
    successMessage: string
  ): Promise<void> {
    const result = await supabase.rpc(fn, params);
    if (result.error) {
      onError(result.error.message);
      return;
    }
    onSuccess(successMessage);
    await onChanged();
  }

  const buttons: JSX.Element[] = [];

  if (item.lifecycle === "Unassigned" && permissions.has("work.claim")) {
    buttons.push(
      <button
        key="claim"
        onClick={() =>
          void call(
            "claim_work",
            {
              target_work_thread_id: item.id,
              commitment_due_at: inHours(48),
              reason: "Self-claimed from open pool",
              expected_record_version: item.version
            },
            "Claimed."
          )
        }
      >
        Claim
      </button>
    );
  }

  if (item.lifecycle === "AwaitingAcknowledgement" && isAssignee) {
    buttons.push(
      <button
        key="ack"
        onClick={() =>
          void call(
            "acknowledge_assignment",
            { target_work_thread_id: item.id, expected_record_version: item.version },
            "Assignment acknowledged."
          )
        }
      >
        Acknowledge
      </button>
    );
  }

  if (item.lifecycle === "Assigned" && isAssignee) {
    buttons.push(
      <button
        key="start"
        onClick={() =>
          void call(
            "start_work",
            { target_work_thread_id: item.id, expected_record_version: item.version },
            "Work started."
          )
        }
      >
        Start work
      </button>
    );
  }

  if (item.lifecycle === "InProgress" && isAssignee) {
    buttons.push(
      <button
        key="offer"
        onClick={() => {
          const summary = window.prompt("Summary of the completed outcome:");
          if (summary)
            void call(
              "offer_outcome",
              { target_work_thread_id: item.id, summary, expected_record_version: item.version },
              "Outcome offered for acceptance."
            );
        }}
      >
        Offer outcome
      </button>
    );
    if (!item.blocked_outcome) {
      buttons.push(
        <button
          key="raise-blocker"
          className="secondary"
          onClick={() => {
            const blockedOutcome = window.prompt("What outcome is blocked?");
            if (!blockedOutcome) return;
            const reason = window.prompt("Why is it blocked?");
            if (!reason) return;
            const resolverEmail = window.prompt("Who must resolve it? (email)");
            if (!resolverEmail) return;
            const effect =
              window.prompt("What is the effect / consequence?") ?? "Delays completion";
            void call(
              "raise_blocker",
              {
                target_work_thread_id: item.id,
                blocked_outcome: blockedOutcome,
                reason,
                required_resolver_email: resolverEmail,
                effect,
                needed_by_at: inHours(72),
                expected_record_version: item.version
              },
              "Blocker raised."
            );
          }}
        >
          Raise blocker
        </button>
      );
    }
  }

  if (item.blocked_outcome && item.blocker_required_resolver === identityId) {
    buttons.push(
      <button
        key="resolve-blocker"
        onClick={() => {
          const note = window.prompt("Resolution note:");
          if (note)
            void call(
              "resolve_blocker",
              {
                target_work_thread_id: item.id,
                resolution_note: note,
                expected_record_version: item.version
              },
              "Blocker resolved."
            );
        }}
      >
        Resolve blocker
      </button>
    );
  }

  if (item.lifecycle === "AwaitingAcceptance" && permissions.has("work.accept")) {
    buttons.push(
      <button
        key="accept"
        onClick={() =>
          void call(
            "accept_outcome",
            { target_work_thread_id: item.id, expected_record_version: item.version },
            "Outcome accepted. Work closed."
          )
        }
      >
        Accept outcome
      </button>
    );
    buttons.push(
      <button
        key="rework"
        className="secondary"
        onClick={() => {
          const reason = window.prompt("Why does this need rework?");
          if (reason)
            void call(
              "request_rework",
              { target_work_thread_id: item.id, reason, expected_record_version: item.version },
              "Rework requested."
            );
        }}
      >
        Request rework
      </button>
    );
  }

  if (item.lifecycle === "Closed" && permissions.has("work.reopen")) {
    buttons.push(
      <button
        key="reopen"
        className="secondary"
        onClick={() => {
          const reason = window.prompt("Why reopen this?");
          if (reason)
            void call(
              "reopen_work",
              { target_work_thread_id: item.id, reason, expected_record_version: item.version },
              "Work reopened."
            );
        }}
      >
        Reopen
      </button>
    );
  }

  if (!isTerminal && permissions.has("work.update")) {
    buttons.push(
      <button
        key="cancel"
        className="secondary"
        onClick={() => {
          const reason = window.prompt("Why cancel this Work Thread?");
          if (reason)
            void call(
              "cancel_work_thread",
              { target_work_thread_id: item.id, reason, expected_record_version: item.version },
              "Work Thread cancelled."
            );
        }}
      >
        Cancel
      </button>
    );
  }

  if (hasAssignment && !isTerminal && permissions.has("work.change_due_date")) {
    buttons.push(
      <button
        key="due-date"
        className="secondary"
        onClick={() => {
          const days = window.prompt("New due date, days from now:", "3");
          if (!days) return;
          const reason = window.prompt("Reason for the change:");
          if (!reason) return;
          void call(
            "change_due_date",
            {
              target_work_thread_id: item.id,
              new_due_at: inHours(Number(days) * 24),
              reason,
              expected_record_version: item.version
            },
            "Due date changed."
          );
        }}
      >
        Change due date
      </button>
    );
  }

  if (
    hasAssignment &&
    !item.recall_requested_by &&
    !isTerminal &&
    permissions.has("work.request_recall")
  ) {
    buttons.push(
      <button
        key="request-recall"
        className="secondary"
        onClick={() => {
          const reason = window.prompt("Why recall this assignment?");
          if (reason)
            void call(
              "request_recall",
              { target_work_thread_id: item.id, reason, expected_record_version: item.version },
              "Recall requested."
            );
        }}
      >
        Request recall
      </button>
    );
  }
  if (item.recall_requested_by === identityId) {
    buttons.push(
      <button
        key="retract-recall"
        className="secondary"
        onClick={() =>
          void call(
            "retract_recall",
            { target_work_thread_id: item.id, expected_record_version: item.version },
            "Recall retracted."
          )
        }
      >
        Retract recall
      </button>
    );
  }
  if (item.recall_requested_by && permissions.has("work.confirm_recall")) {
    buttons.push(
      <button
        key="confirm-recall"
        onClick={() => {
          const newAssigneeEmail = window.prompt("Reassign to (email):");
          if (!newAssigneeEmail) return;
          const days = window.prompt("New due date, days from now:", "3");
          if (!days) return;
          void call(
            "confirm_recall",
            {
              target_work_thread_id: item.id,
              new_assignee_email: newAssigneeEmail,
              new_due_at: inHours(Number(days) * 24),
              reason: "Confirmed recall",
              expected_record_version: item.version
            },
            "Recall confirmed and reassigned."
          );
        }}
      >
        Confirm recall
      </button>
    );
  }

  if (
    isAssignee &&
    !item.renegotiation_requested_by &&
    !isTerminal &&
    permissions.has("work.request_renegotiation")
  ) {
    buttons.push(
      <button
        key="request-renegotiation"
        className="secondary"
        onClick={() => {
          const reason = window.prompt("Why does this assignment need to change?");
          if (reason)
            void call(
              "request_renegotiation",
              { target_work_thread_id: item.id, reason, expected_record_version: item.version },
              "Renegotiation requested."
            );
        }}
      >
        Request renegotiation
      </button>
    );
  }
  if (item.renegotiation_requested_by && permissions.has("work.adjust_terms")) {
    buttons.push(
      <button
        key="adjust-terms"
        onClick={() => {
          const days = window.prompt("New due date, days from now:", "5");
          if (!days) return;
          void call(
            "adjust_terms",
            {
              target_work_thread_id: item.id,
              new_due_at: inHours(Number(days) * 24),
              note: "Terms adjusted",
              expected_record_version: item.version
            },
            "Terms adjusted."
          );
        }}
      >
        Adjust terms
      </button>
    );
  }
  if (item.renegotiation_requested_by && permissions.has("work.cancel_delegation")) {
    buttons.push(
      <button
        key="cancel-delegation"
        className="secondary"
        onClick={() => {
          const resolution = window.prompt(
            "Resolution: reassign / release_to_pool / escalate",
            "release_to_pool"
          );
          if (!resolution) return;
          const reasonDetail = window.prompt("Reason detail:") ?? "";
          if (resolution === "reassign") {
            const newAssigneeEmail = window.prompt("Reassign to (email):");
            if (!newAssigneeEmail) return;
            void call(
              "cancel_delegation",
              {
                target_work_thread_id: item.id,
                resolution,
                reason_code: "other",
                reason_detail: reasonDetail,
                new_assignee_email: newAssigneeEmail,
                new_due_at: inHours(72),
                escalate_to_email: null,
                expected_record_version: item.version
              },
              "Delegation cancelled and reassigned."
            );
          } else if (resolution === "escalate") {
            const escalateToEmail = window.prompt("Escalate to (email):");
            if (!escalateToEmail) return;
            void call(
              "cancel_delegation",
              {
                target_work_thread_id: item.id,
                resolution,
                reason_code: "other",
                reason_detail: reasonDetail,
                new_assignee_email: null,
                new_due_at: null,
                escalate_to_email: escalateToEmail,
                expected_record_version: item.version
              },
              "Escalated for reassignment."
            );
          } else {
            void call(
              "cancel_delegation",
              {
                target_work_thread_id: item.id,
                resolution: "release_to_pool",
                reason_code: "other",
                reason_detail: reasonDetail,
                new_assignee_email: null,
                new_due_at: null,
                escalate_to_email: null,
                expected_record_version: item.version
              },
              "Released to the open pool."
            );
          }
        }}
      >
        Cancel delegation
      </button>
    );
  }

  return <div className="actions">{buttons}</div>;
}
