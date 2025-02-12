/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Example brand colors from your logo
      colors: {
        primary: "#ffffff",
        background: "#000000",
      },
      // Gradient color stops from your logo
      gradientColorStops: {
        c1: "#00d4ff", // teal
        c2: "#aa00ff", // purple
        c3: "#ff0080", // pink
        c4: "#ff8800", // orange
        c5: "#ffff00", // yellow
      },
    },
  },
  plugins: [],
};
