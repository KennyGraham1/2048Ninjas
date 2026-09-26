import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "2048 Ninjas",
    short_name: "Ninjas 2048",
    description: "A ninja-themed take on the 2048 puzzle. Merge matching ninjas to build the ultimate ninja clan.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1212",
    theme_color: "#0b1212",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
