import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        carbon: {
          50: "#faf9f7",
          100: "#f0ede8",
          200: "#e0dbd2",
          300: "#cbc3b5",
          400: "#b3a896",
          500: "#9d8f7b",
          600: "#8a7d6b",
          700: "#73685a",
          800: "#60574c",
          900: "#514a41",
          950: "#2b2622",
        },
        accent: {
          50: "#fef3ee",
          100: "#fce4d7",
          200: "#f8c5ad",
          300: "#f39e79",
          400: "#ed6d43",
          500: "#e94d20",
          600: "#da3616",
          700: "#b52714",
          800: "#902118",
          900: "#741e16",
          950: "#3f0c09",
        },
      },
    },
  },
  plugins: [],
};

export default config;
