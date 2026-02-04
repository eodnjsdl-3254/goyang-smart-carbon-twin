import React from 'react';

interface Props {
  children: React.ReactNode;
}

export const ControlPanel: React.FC<Props> = ({ children }) => {
  return (
    <div style={{
      display: "flex",
      gap: "8px",
      padding: "8px",
      backgroundColor: "rgba(255, 255, 255, 0.9)", // 반투명 흰색
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      backdropFilter: "blur(4px)", // 블러 효과
      alignItems: "center"
    }}>
      {children}
    </div>
  );
};