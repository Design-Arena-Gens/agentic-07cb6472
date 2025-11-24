export const metadata = {
  title: "Miniature Chase - JAX & NINO",
  description: "Pixar-style miniature 3D chase animation",
};

import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

