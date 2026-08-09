import "./ApprovalDialog.css";
import type { ApprovalRequest } from "../permissions";

interface ApprovalDialogProps {
  request: ApprovalRequest;
  onRespond: (approved: boolean) => void;
}

/**
 * Level 3 approval prompt, formatted per spec §55:
 * ACTION / CONTEXT / REASON / RISK, with explicit Approve/Deny.
 * Rendered as a modal overlay -- nothing else in the app should be
 * clickable while this is up, and there is no default/auto action.
 */
export function ApprovalDialog({ request, onRespond }: ApprovalDialogProps) {
  return (
    <div className="approval-overlay" role="presentation">
      <div
        className="approval-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="approval-action"
      >
        <div className="approval-header">
          <span className="approval-badge">LEVEL 3 · APPROVAL REQUIRED</span>
        </div>

        <dl className="approval-fields">
          <dt>Action</dt>
          <dd id="approval-action">{request.action}</dd>

          <dt>Context</dt>
          <dd>{request.context}</dd>

          <dt>Reason</dt>
          <dd>{request.reason}</dd>

          <dt>Risk</dt>
          <dd className="approval-risk">{request.risk}</dd>
        </dl>

        <div className="approval-actions">
          <button
            type="button"
            className="approval-btn approval-btn-deny"
            onClick={() => onRespond(false)}
            autoFocus
          >
            Deny
          </button>
          <button
            type="button"
            className="approval-btn approval-btn-approve"
            onClick={() => onRespond(true)}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
