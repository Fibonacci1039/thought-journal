import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mind OS",
    short_name: "Mind OS",
    description: "思考を整理し、自分と向き合うオペレーティングシステム",
    start_url: "/",
    display: "standalone",
    background_color: "#1c1c1e",
    theme_color: "#2c2c2e",
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
