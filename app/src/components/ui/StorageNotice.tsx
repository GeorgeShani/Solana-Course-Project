import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { canSaveInBrowser } from "../../lib/storage/browser-store";

/**
 * Watching is kept in this browser only. This says so, and says it plainly when the browser
 * refuses to save (a private window, blocked site data): everything else still works, but nothing
 * watched will be remembered.
 */
export function StorageNotice() {
  // Unknown until the browser has been asked, so server and first client render agree.
  const [saves, setSaves] = useState<boolean | null>(null);
  useEffect(() => setSaves(canSaveInBrowser()), []);

  return (
    <div>
      <span className="storage-note">
        <Icon name="shield" size={13} />
        Stored in this browser only
      </span>
      {saves === false && (
        <p className="field__error" role="alert">
          This browser is blocking storage (a private window or blocked site
          data), so Relay can't remember what you watch. Discover and sources
          still work; watching won't be kept.
        </p>
      )}
    </div>
  );
}
