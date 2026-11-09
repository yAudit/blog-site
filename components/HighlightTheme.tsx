"use client";

import { useEffect } from "react";

const HIGHLIGHT_THEME =
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";

/**
 * Loads the light Highlight.js theme. The link goes at the end of <head>, so
 * it comes after the site's own styles.
 */
export default function HighlightTheme() {
  useEffect(() => {
    if (document.getElementById("highlight-theme-link")) return;

    const link = document.createElement("link");
    link.id = "highlight-theme-link";
    link.rel = "stylesheet";
    link.href = HIGHLIGHT_THEME;
    document.head.appendChild(link);

    // Highlight code blocks that are already on the page.
    if (typeof window !== "undefined" && window.hljs) {
      window.hljs.highlightAll();
    }
  }, []);

  return null;
}
