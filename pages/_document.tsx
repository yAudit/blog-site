import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Expert insights on zero-knowledge proofs, smart contract security audits, blockchain vulnerabilities, and cutting-edge cryptography research from the yAudit security team." />
        <meta
          name="keywords"
          content="yAudit, Zero Knowledge, Smart Contract Security, Blockchain Security, Ethereum, Cryptography, DeFi"
        />
        <meta name="referrer" content="origin" />
        <meta name="creator" content="yAudit Team" />
        <meta name="robots" content="follow, index" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://blog.yaudit.dev" />
        <meta property="og:title" content="yAudit Blog - ZK & Smart Contract Security Research" />
        <meta
          property="og:description"
          content="Expert insights on zero-knowledge proofs, smart contract security audits, blockchain vulnerabilities, and cutting-edge cryptography research from the yAudit security team."
        />
        <meta property="og:site_name" content="yAudit" />
        <meta
          property="og:image"
          content="https://blog.yaudit.dev/twitter.png"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="yAudit - Zero Knowledge and Smart Contract Security" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@yaudit" />
        <meta name="twitter:creator" content="@yaudit" />
        <meta name="twitter:title" content="yAudit Blog - ZK & Smart Contract Security Research" />
        <meta name="twitter:description" content="Expert insights on zero-knowledge proofs, smart contract security audits, blockchain vulnerabilities, and cutting-edge cryptography research from the yAudit security team." />
        <meta name="twitter:image" content="https://blog.yaudit.dev/twitter.png" />
        <meta name="twitter:image:alt" content="yAudit - Zero Knowledge and Smart Contract Security" />

        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"
          integrity="sha384-n8MVd4RsNIU0tAv4ct0nTaAbDJwPJzDEaqSD1odI+WdtXRGWt2kTvGFasHpSy3SV"
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />

        <Script
          strategy="afterInteractive"
          src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
        />
        <Script
          strategy="afterInteractive"
          src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/solidity.min.js"
        />

        {/* Initialize highlight.js after libraries are loaded */}
        <Script id="highlight-init" strategy="afterInteractive">
          {`
            window.onload = function() {
              // Initialize syntax highlighting
              hljs.highlightAll();

              // Make hljs available globally for theme switching
              window.hljs = hljs;
            }
          `}
          </Script>
{/* Load mermaid library */}
<Script
          type="module"
          id="mermaid-init"
  src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs"
/>

{/* Initialize mermaid with theme matching your CSS variables */}
<Script type="module" id="mermaid">
  {`
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    
    // Theme configuration
    const themes = {
      light: {
        theme: 'base',
        themeVariables: {
          primaryColor: '#0055FF',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#e5e7eb',
          lineColor: '#0055FF',
          secondaryColor: '#f5f5f5',
          tertiaryColor: '#0055FF',
          background: '#fdfdfd',
          mainBkg: '#f3f3f3',
          secondBkg: '#f5f5f5',
          tertiaryBkg: '#e9e9e9',
          primaryTextColor: '#000000',
          pie1: '#0055FF',
          pie2: '#0055FF',
          pie3: '#f5f5f5',
          pie4: '#e9e9e9'
        }
      },
      dark: {
        theme: 'base',
        themeVariables: {
          darkMode: true,
          primaryColor: '#0055FF',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#2a2a2a',
          lineColor: '#0055FF',
          secondaryColor: '#1a1a1a',
          tertiaryColor: '#0055FF',
          background: '#021e1a',
          mainBkg: '#032823',
          secondBkg: '#1a1a1a',
          tertiaryBkg: '#021e1a',
          primaryTextColor: '#ededed',
          secondaryTextColor: '#ffffff63',
          pie1: '#0055FF',
          pie2: '#0055FF',
          pie3: '#032823',
          pie4: '#1a1a1a'
        }
      }
    };

    // Helper functions
    const isDarkMode = () => document.documentElement.classList.contains('dark') || 
                             window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const resetDiagrams = () => {
      document.querySelectorAll('.mermaid').forEach(element => {
        element.removeAttribute('data-processed');
        element.innerHTML = element.textContent;
      });
    };

    // Initialize mermaid with the appropriate theme
    const initMermaid = () => {
      const currentTheme = isDarkMode() ? themes.dark : themes.light;
      mermaid.initialize({ 
        startOnLoad: true,
        ...currentTheme
      });
    };

    // Update diagrams when theme changes
    const updateDiagrams = () => {
      resetDiagrams();
      const currentTheme = isDarkMode() ? themes.dark : themes.light;
      mermaid.initialize({ 
        startOnLoad: false,
        ...currentTheme
      });
      setTimeout(() => mermaid.run(), 100);
    };
    
    // Initialize on load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMermaid);
    } else {
      setTimeout(initMermaid, 0);
    }
    
    // Watch for theme changes
    new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          updateDiagrams();
        }
      });
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
  `}
</Script>
        <Script
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-Q647YTPGSE"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-Q647YTPGSE');
          `}
        </Script>
      </body>
    </Html>
  );
}
