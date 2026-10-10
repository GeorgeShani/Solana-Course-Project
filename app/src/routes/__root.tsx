import { HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Providers } from "../components/Providers";
import { CURTAIN_BOOT_SCRIPT, CurtainIntro } from "../components/theatre/CurtainIntro";
import { Marquee } from "../components/theatre/Marquee";
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0b0716" },
      { name: "color-scheme", content: "dark" },
      { title: "Relay — creator trade plans, checked against the chain" },
      {
        name: "description",
        content:
          "A feed of Solana trade plans: see whether the creator's original entry still applies. Not a recommendation.",
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
        <CurtainIntro />
        <Providers>
          <div className="app">
            <Marquee clusterLabel={CLUSTER_LABEL[CLUSTER]} />
            <main id="main" className="stage">
              {children}
            </main>
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
      <h1 className="page__title">Not on tonight's programme</h1>
      <p className="page__text">This page doesn't exist.</p>
      <Link to="/" className="btn btn--ghost">
        Back to the feed
      </Link>
    </section>
  );
}
