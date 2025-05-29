import "@/styles/globals.css";

export default function MyApp({ Component, pageProps }) {
  return (
    <div className="app-container">
      <Component {...pageProps} />
    </div>
  );
}
