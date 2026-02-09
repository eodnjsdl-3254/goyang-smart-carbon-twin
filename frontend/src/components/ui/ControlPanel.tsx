import React from 'react';

export const ControlPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div style={{
      display: "flex", gap: "6px", padding: "6px 12px",
      backgroundColor: "rgba(9, 9, 11, 0.9)", // 깊은 블랙
      borderRadius: "14px",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
      backdropFilter: "blur(20px)",
      alignItems: "center",
      border: "1px solid rgba(255, 255, 255, 0.1)"
    }}>
      {children}
    </div>
  );
};