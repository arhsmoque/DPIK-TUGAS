# Deliverable

Owns the technical/formal output of a Work Thread: an exact, immutable revision history and its
internal review decision. Every review and approval targets one exact revision (BOM-REVIEW-001);
earlier revisions are never overwritten (BOM-REVIEW-002).

Internal technical approval (`RevisionApproved`) is a separate truth from formal external
authorization to issue (owned by the future `submission` module) — approval here never means
submitted, delivered, or claim-ready.

Self-review is not silently allowed: a reviewer who is also the preparer of the revision under
review must set `selfApproved: true` explicitly on `ReviewRevision`, which the domain then records
visibly on the decision rather than treating as an ordinary independent review.
