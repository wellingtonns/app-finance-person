module.exports = {
  content: ["./index.html", "./dashboard.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#070b13",
        panel: "#121822",
        panelSoft: "#1a2332",
        stroke: "#314766",
        copy: "#edf3ff",
        muted: "#a8bad7",
        income: "#f6bf54",
        info: "#76a8ff",
        danger: "#ff667f",
        success: "#57d48d",
        action: "#f4a917",
      },
      boxShadow: {
        panel: "0 24px 70px rgba(0, 0, 0, 0.38)",
        glow: "inset 0 1px 0 rgba(177, 205, 255, 0.12), 0 18px 32px rgba(0, 0, 0, 0.34)",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["Manrope", "sans-serif"],
      },
      backgroundImage: {
        shell: "radial-gradient(circle at top left, rgba(32,63,117,0.92) 0%, rgba(10,17,30,0.98) 32%, rgba(4,7,13,1) 100%)",
        sidebar: "linear-gradient(180deg, rgba(25,42,72,0.96) 0%, rgba(15,24,39,0.98) 100%)",
        panelGradient: "linear-gradient(180deg, rgba(18,24,35,0.98) 0%, rgba(12,17,26,0.98) 100%)",
      },
    },
  },
  plugins: [],
};
