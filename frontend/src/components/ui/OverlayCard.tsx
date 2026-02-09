import React from 'react';

interface Props {
  children: React.ReactNode;
  title?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const OverlayCard: React.FC<Props> = ({ children, title, onClose, className = '' }) => {
  return (
    <div className={`backdrop-blur-md p-4 rounded-xl shadow-2xl border ${className}`}>
      <div className="flex justify-between items-center mb-3">
        {/* text-gray-800 제거: 이제 외부 className에서 주는 text-white 등이 적용됩니다 */}
        {title && <h3 className="font-bold text-lg">{title}</h3>}
        {onClose && (
          <button 
            onClick={onClose}
            className="opacity-50 hover:opacity-100 font-bold transition-opacity"
          >
            ✕
          </button>
        )}
      </div>
      <div className="text-sm">
        {children}
      </div>
    </div>
  );
};