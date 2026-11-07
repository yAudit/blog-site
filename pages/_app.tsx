import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Navbar from "../components/Navbar";
import { Space_Grotesk } from "next/font/google";
import Head from "next/head";
import Footer from "@/components/Footer";
import HighlightTheme from "@/components/HighlightTheme";


const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>yAudit Blogs</title>
      </Head>

      <HighlightTheme />
      {/* <MermaidTheme /> */}
      <main className={spaceGrotesk.className}>
        <Navbar />
        <Component {...pageProps} />
        <Footer />
      </main>
    </>
  );
}
