import type { Metadata, Viewport } from "next"
import "katex/dist/katex.min.css"
import "./globals.css"
import { NextIntlClientProvider } from "next-intl"
import { AppI18nProvider } from "@/components/i18n-provider"
import { getMessagesForLocale } from "@/i18n/messages"
import { resolveRequestLocale } from "@/i18n/resolve-request-locale"
import { ThemeProvider } from "@/components/theme-provider"
import { toIntlLocale } from "@/lib/i18n"
import { APPEARANCE_INIT_SCRIPT } from "@/lib/appearance-script"
import { AppearanceProvider } from "@/components/appearance-provider"
import { OverlayScrollbarsInit } from "@/components/overlay-scrollbars-init"
import { ClipboardFallbackInit } from "@/components/clipboard-fallback-init"
import { WebConnectionGuard } from "@/components/connection/web-connection-guard"
import { WindowResizeGrips } from "@/components/layout/window-resize-grips"

const CODEG_DEBUG_PROBE_SCRIPT = `
(function() {
  try {
    if (window.location.search.indexOf("debug=1") === -1) return;
    function append(message) {
      var box = document.getElementById("__codeg_debug_probe__");
      if (!box) {
        box = document.createElement("pre");
        box.id = "__codeg_debug_probe__";
        box.style.cssText = "position:fixed;z-index:2147483647;left:0;right:0;bottom:0;max-height:50vh;overflow:auto;margin:0;padding:8px;background:#111;color:#00ff66;font:12px/1.4 monospace;white-space:pre-wrap;word-break:break-word;";
        document.documentElement.appendChild(box);
      }
      box.textContent += "\\n" + message;
    }
    window.addEventListener("error", function(event) {
      var target = event.target;
      var resource = target && target !== window && (target.src || target.href);
      append("[error] " + (resource ? "resource failed: " + resource : event.message || "unknown error") + "\\n" + (event.filename || "") + ":" + (event.lineno || "") + ":" + (event.colno || ""));
    }, true);
    window.addEventListener("unhandledrejection", function(event) {
      var reason = event.reason;
      append("[promise] " + (reason && (reason.stack || reason.message) || String(reason)));
    });
    append("[codeg-debug] loaded " + navigator.userAgent);
  } catch (error) {}
})();
`

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "codeg",
  description: "AI Coding Agent Conversation Manager",
  icons: {
    icon: [
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/icon-128x128.png", sizes: "128x128", type: "image/png" },
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const appLocale = await resolveRequestLocale()
  const initialLocale = toIntlLocale(appLocale)
  const initialMessages = await getMessagesForLocale(appLocale)

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body>
        {/* CSS-only dark background: applies before JS executes, preventing white flash in dark mode */}
        <style
          dangerouslySetInnerHTML={{
            __html: `@media(prefers-color-scheme:dark){html:not(.light){background-color:#09090b;color-scheme:dark}}`,
          }}
        />
        {/* Apply appearance preferences (theme color + zoom + dark class) before first paint to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_INIT_SCRIPT }} />
        {/* Optional mobile Safari white-screen diagnostics: append ?debug=1 */}
        <script
          dangerouslySetInnerHTML={{ __html: CODEG_DEBUG_PROBE_SCRIPT }}
        />
        {/* Suppress benign ResizeObserver loop warnings (W3C spec §3.3) */}
        <script>{`window.addEventListener("error",function(e){if(e.message&&e.message.indexOf("ResizeObserver")!==-1){e.stopImmediatePropagation();e.preventDefault()}});window.onerror=function(m){if(typeof m==="string"&&m.indexOf("ResizeObserver")!==-1)return true}`}</script>
        <NextIntlClientProvider
          locale={initialLocale}
          messages={initialMessages}
        >
          <AppI18nProvider
            initialLocale={initialLocale}
            initialMessages={initialMessages}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <AppearanceProvider>
                <OverlayScrollbarsInit />
                <ClipboardFallbackInit />
                <WebConnectionGuard />
                <WindowResizeGrips />
                {children}
              </AppearanceProvider>
            </ThemeProvider>
          </AppI18nProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
