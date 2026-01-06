import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Thought Journal",
    short_name: "Journal",
    description: "AI-powered thought journaling application",
    start_url: "/",
    display: "standalone",
    background_color: "#fdfbf7",
    theme_color: "#fdfbf7",
    icons: [
      {
        src: "/icon-192x192.png", // We don't have these yet but defining them is standard
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
