import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cubby",
    short_name: "Cubby",
    description:
      "A wishlist and spending tracker for fashion, beauty, and lifestyle items.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    // Share to Cubby (KAM-51): the installed app shows up in the phone's
    // share sheet (Android/Chrome; iOS Safari doesn't support share targets).
    share_target: {
      action: "/items/new",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
