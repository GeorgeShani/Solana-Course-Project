import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Providers } from "../components/Providers";
import { Cue } from "../components/cue/Cue";
import { CueCursor } from "../components/cue/CueCursor";
import { CurtainIntro, Drapes } from "../features/onboarding/CurtainIntro";
import { Valance } from "../components/theatre/Marquee";
import { Welcome } from "../features/onboarding/Welcome";
import { TabBar } from "../components/ui/TabBar";
import { WalletDialog } from "../components/wallet/WalletDialog";
import { CLUSTER, CLUSTER_LABEL, SITE_URL } from "../lib/config";
import { WELCOME_BOOT_SCRIPT } from "../features/onboarding/welcome-state";
import aboutCss from "../styles/about.css?url";
import audienceCss from "../styles/audience.css?url";
import baseCss from "../styles/base.css?url";
import discoverCss from "../styles/discover.css?url";
import discoveryCss from "../styles/discovery.css?url";
import feedCss from "../styles/feed.css?url";
import screensCss from "../styles/screens.css?url";
import theatreCss from "../styles/theatre.css?url";
import intervalCss from "../styles/interval.css?url";
import showtimeCss from "../styles/showtime.css?url";
import streamCss from "../styles/stream.css?url";
import ticketCss from "../styles/ticket.css?url";
import tokensCss from "../styles/tokens.css?url";

const SITE_TITLE = "Relay — traders' public ideas and the evidence behind them";
const SITE_DESCRIPTION =
  "See the original idea. Follow what changed. Check the evidence. Not financial advice.";

/**
 * What a link to the site looks like when pasted into a chat or a feed. The image tags need an
 * absolute URL, so they appear only in a build made for an address (VITE_SITE_URL, from DOMAIN).
 */
const SHARE_META = [
  { property: "og:type", content: "website" },
  { property: "og:site_name", content: "Relay" },
  { property: "og:title", content: SITE_TITLE },
  { property: "og:description", content: SITE_DESCRIPTION },
  { name: "twitter:title", content: SITE_TITLE },
  { name: "twitter:description", content: SITE_DESCRIPTION },
  ...(SITE_URL
    ? [
        { property: "og:image", content: `${SITE_URL}/og-image.jpg` },
        { property: "og:image:width", content: "1040" },
        { property: "og:image:height", content: "520" },
        { property: "og:image:alt", content: "Relay" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: `${SITE_URL}/og-image.jpg` },
      ]
    : [{ name: "twitter:card", content: "summary" }]),
];

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
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      ...SHARE_META,
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: tokensCss },
      { rel: "stylesheet", href: baseCss },
      { rel: "stylesheet", href: theatreCss },
      { rel: "stylesheet", href: feedCss },
      { rel: "stylesheet", href: screensCss },
      { rel: "stylesheet", href: discoveryCss },
      { rel: "stylesheet", href: discoverCss },
      { rel: "stylesheet", href: streamCss },
      { rel: "stylesheet", href: showtimeCss },
      { rel: "stylesheet", href: intervalCss },
      { rel: "stylesheet", href: aboutCss },
      { rel: "stylesheet", href: audienceCss },
      { rel: "stylesheet", href: ticketCss },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script>{WELCOME_BOOT_SCRIPT}</script>
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
              <Welcome />
              <CurtainIntro sub="Public ideas, with sources" />
              {children}
            </main>
            <Drapes />
            <TabBar />
          </div>
          <WalletDialog />
          <CueCursor />
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <section className="page page--center" data-cursor-zone>
      <Cue pose="unavailable" className="page__cue cue--lit" />
      <h1 className="page__title">Not on tonight's programme</h1>
      <p className="page__text">This page doesn't exist.</p>
      <Link to="/" className="btn btn--primary btn--large">
        Back to Discover
      </Link>
    </section>
  );
}
