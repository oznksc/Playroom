import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Playroom",
  description: "A JSON-first 2D game editor and runtime for Expo and web.",
  base: "/Playroom/",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "GitHub", link: "https://github.com/oznksc/Playroom" },
    ],
    sidebar: [
      {
        text: "Guides",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "CLI reference", link: "/guide/cli" },
          { text: "Editor & agent", link: "/guide/editor-agent" },
          { text: "Schema & components", link: "/guide/schema" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/oznksc/Playroom" }],
  },
});
