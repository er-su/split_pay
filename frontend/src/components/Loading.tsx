import React from "react";

export const Loading: React.FC<{ text?: string }> = ({ text = "Loading..." }) => (
  <div style={{ padding: 20, textAlign: "center" }}>
    <div className="spinner" aria-hidden />
    <div>{text}</div>
  </div>
);
