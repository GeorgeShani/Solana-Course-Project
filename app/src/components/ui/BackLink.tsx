import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { Icon } from "./Icon";

/** Goes back in history when the visit has one; otherwise a real link to `fallback`. */
export function BackLink({
  fallback,
  label,
}: {
  fallback: "/" | "/traders" | "/watchlist";
  label: string;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  if (canGoBack)
    return (
      <button
        type="button"
        className="back"
        onClick={() => router.history.back()}
      >
        <Icon name="back" size={18} />
        Back
      </button>
    );
  return (
    <Link to={fallback} className="back">
      <Icon name="back" size={18} />
      {label}
    </Link>
  );
}
