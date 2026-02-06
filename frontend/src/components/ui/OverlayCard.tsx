import React from 'react';

interface Props {
  children: React.ReactNode;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const OverlayCard: React.FC<Props> = ({ children, title, onClose, className = '' }) => {
  return (
    <div className={`bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-200 min-w-[280px] ${className}`}>
      <div className="flex justify-between items-center mb-3">
        {title && <h3 className="font-bold text-gray-800 text-lg">{title}</h3>}
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold"
          >
            ✕
          </button>
        )}
      </div>
      <div className="text-sm text-gray-700">
        {children}
      </div>
    </div>
  );
};