import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Providers } from "../components/Providers";
import { Cue } from "../components/cue/Cue";
import {
  CURTAIN_BOOT_SCRIPT,
  Drapes,
} from "../components/theatre/CurtainIntro";
import { Valance } from "../components/theatre/Marquee";
import { TabBar } from "../components/ui/TabBar";
import { CLUSTER, CLUSTER_LABEL } from "../lib/config";
import baseCss from "../styles/base.css?url";
import feedCss from "../styles/feed.css?url";
import theatreCss from "../styles/theatre.css?url";
import tokensCss from "../styles/tokens.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#1b1035" },
      { name: "color-scheme", content: "dark" },
      { title: "Relay — Solana traders' ideas and the evidence behind them" },
      {
        name: "description",
        content:
          "Discover Solana traders, explore their public ideas, and see the activity Relay can verify. Not financial advice.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: tokensCss },
      { rel: "stylesheet", href: baseCss },
      { rel: "stylesheet", href: theatreCss },
      { rel: "stylesheet", href: feedCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script>{CURTAIN_BOOT_SCRIPT}</script>
        <HeadContent />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Providers>
          <div className="app theatre">
            <div className="stage-floor" aria-hidden="true" />
            <Valance clusterLabel={CLUSTER_LABEL[CLUSTER]} />
            <main id="main" className="stage">
              {children}
            </main>
            <Drapes />
            <TabBar />
          </div>
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <section className="page">
      <Cue pose="unavailable" className="page__cue cue--lit" />
      <h1 className="page__title">Not on tonight's programme</h1>
      <p className="page__text">This page doesn't exist.</p>
      <Link to="/" className="btn btn--ghost">
        Back to Discover
      </Link>
    </section>
  );
}
