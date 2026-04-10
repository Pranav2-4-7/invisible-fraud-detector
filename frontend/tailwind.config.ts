import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-surface": "#e2e2e2",
        "on-secondary-fixed": "#1b1b1b",
        "surface-tint": "#c6c6c6",
        "tertiary-container": "#000000",
        "secondary": "#c6c6c6",
        "error-container": "#93000a",
        "on-primary-fixed-variant": "#474747",
        "on-primary-fixed": "#1b1b1b",
        "on-secondary-fixed-variant": "#474747",
        "tertiary-fixed-dim": "#c6c6c6",
        "secondary-fixed-dim": "#c6c6c6",
        "on-tertiary-fixed": "#1b1b1b",
        "on-tertiary-container": "#757575",
        "on-error-container": "#ffdad6",
        "surface-container-highest": "#353535",
        "secondary-fixed": "#e2e2e2",
        "primary-fixed-dim": "#c6c6c6",
        "inverse-primary": "#5e5e5e",
        "on-tertiary": "#303030",
        "primary-fixed": "#e2e2e2",
        "tertiary-fixed": "#e2e2e2",
        "surface": "#131313",
        "on-surface-variant": "#cfc4c5",
        "surface-variant": "#353535",
        "primary-container": "#000000",
        "on-secondary-container": "#b5b5b5",
        "error": "#ffb4ab",
        "surface-container-low": "#1b1b1b",
        "tertiary": "#c6c6c6",
        "background": "#131313",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-high": "#2a2a2a",
        "surface-dim": "#131313",
        "inverse-surface": "#e2e2e2",
        "outline": "#988e90",
        "on-primary-container": "#757575",
        "outline-variant": "#4c4546",
        "on-error": "#690005",
        "on-secondary": "#303030",
        "on-tertiary-fixed-variant": "#474747",
        "on-primary": "#303030",
        "surface-bright": "#393939",
        "surface-container": "#1f1f1f",
        "primary": "#c6c6c6",
        "on-background": "#e2e2e2",
        "inverse-on-surface": "#303030",
        "secondary-container": "#474747"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      fontFamily: {
        headline: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
};

export default config;
