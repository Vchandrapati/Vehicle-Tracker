// pages/_app.js
import "@/styles/globals.css";

export default function MyApp({ Component, pageProps }) {
  return (
    <div className="min-h-screen bg-background text-primary">
      <Component {...pageProps} />
    </div>
  );
}
