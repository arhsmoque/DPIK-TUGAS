import { type Brand, brand } from "./brand";
import { err, ok, type Result } from "../result/result";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InvalidIdFailure = { readonly type: "invalid_id"; readonly raw: string };

export function createId<B extends string>(): Brand<string, B> {
  return brand<string, B>(crypto.randomUUID());
}

export function parseId<B extends string>(raw: string): Result<Brand<string, B>, InvalidIdFailure> {
  if (!UUID_PATTERN.test(raw)) {
    return err({ type: "invalid_id", raw });
  }
  return ok(brand<string, B>(raw));
}

// One branded type per aggregate/entity the domain refers to across module
// boundaries. New aggregates add a line here, not a new ad hoc string type.
export type OrganisationId = Brand<string, "OrganisationId">;
export type ProjectId = Brand<string, "ProjectId">;
export type IdentityId = Brand<string, "IdentityId">;
export type ActorId = Brand<string, "ActorId">;

export type WorkThreadId = Brand<string, "WorkThreadId">;
export type DeliverableId = Brand<string, "DeliverableId">;
export type DeliverableRevisionId = Brand<string, "DeliverableRevisionId">;
export type SubmissionId = Brand<string, "SubmissionId">;
export type DispatchAttemptId = Brand<string, "DispatchAttemptId">;
export type ReceiptEvidenceAttemptId = Brand<string, "ReceiptEvidenceAttemptId">;
export type ClaimPackageId = Brand<string, "ClaimPackageId">;
export type ClaimRequirementId = Brand<string, "ClaimRequirementId">;
export type ConfigurationVersionId = Brand<string, "ConfigurationVersionId">;
export type FormalSubmissionProcessId = Brand<string, "FormalSubmissionProcessId">;

export type CommandId = Brand<string, "CommandId">;
export type DomainEventId = Brand<string, "DomainEventId">;
export type CorrelationId = Brand<string, "CorrelationId">;
export type CausationId = Brand<string, "CausationId">;
export type IdempotencyKey = Brand<string, "IdempotencyKey">;
