import React from 'react';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string; // 이모지나 아이콘 클래스
  active?: boolean;
}

export const IconButton: React.FC<Props> = ({ icon, children, active, style, ...props }) => {
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "6px 12px",
        border: "1px solid #e5e7eb",
        borderRadius: "6px",
        backgroundColor: active ? "#3b82f6" : "#374151", // 활성화 시 파란색
        color: active ? "white" : "#e5e7eb",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "13px",
        transition: "all 0.2s",
        ...style
      }}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};