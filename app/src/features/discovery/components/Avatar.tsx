import { useState } from "react";

/**
 * The images Relay shows for the three public-source profiles. Each one is the image the author
 * publishes on their own channel (a photo, publication art or a logo), kept as a file in this app
 * so no visitor's browser calls another site. Anyone without an image gets initials.
 */
const IMAGES: Record<string, { src: string; kind: "photo" | "art" | "logo" }> =
  {
    "benjamin-cowen": { src: "/people/benjamin-cowen.jpg", kind: "photo" },
    "arthur-hayes": { src: "/people/arthur-hayes.jpg", kind: "art" },
    "peter-brandt": { src: "/people/peter-brandt.png", kind: "logo" },
  };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

export function Avatar({
  id,
  name,
  className = "",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const image = IMAGES[id];
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={`avatar ${className}`}
      data-author={id}
      data-kind={image && !broken ? image.kind : "initials"}
    >
      {image && !broken ? (
        <img
          src={image.src}
          alt=""
          width={256}
          height={256}
          onError={() => setBroken(true)}
        />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
    </span>
  );
}
