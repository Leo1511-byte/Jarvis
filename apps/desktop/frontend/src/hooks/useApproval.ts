import { useCallback, useRef, useState } from "react";
import type { ApprovalRequest } from "../permissions";

/**
 * Promise-based approval flow for Level 3 actions (spec §55). Call
 * `requestApproval(req)` and await the result -- it resolves true/false
 * once the user clicks Approve/Deny in the dialog this hook drives.
 * Nothing proceeds until the user actually responds; there's no
 * auto-approve path (spec principle #15: no silently performing
 * destructive actions).
 */
export function useApproval() {
  const [pending, setPending] = useState<ApprovalRequest | null>(null);
  const resolver = useRef<((approved: boolean) => void) | null>(null);

  const requestApproval = useCallback((req: ApprovalRequest): Promise<boolean> => {
    setPending(req);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const respond = useCallback((approved: boolean) => {
    resolver.current?.(approved);
    resolver.current = null;
    setPending(null);
  }, []);

  return { pending, requestApproval, respond };
}
