import React from "react";

export const ErrorMessage: React.FC<{ error?: any }> = ({ error }) => {
  if (!error) return null;
  return (
    <div style={{ color: "var(--error, #c00)", background: "#fee", padding: 12, borderRadius: 6 }}>
      <strong>Error:</strong>
      <div style={{ whiteSpace: "pre-wrap" }}>{typeof error === "string" ? error : JSON.stringify(error)}</div>
    </div>
  );
};
