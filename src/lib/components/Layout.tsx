import Navigation from "./Navigation";
import React from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      <div className="pt-[140px]">{children}</div>
    </>
  );
}
