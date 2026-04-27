import React from 'react';

interface ErrorPageProps {
  code?: string | number;
  title?: string;
  message?: string;
  onAction?: () => void;
  actionText?: string;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({ 
  code = '404', 
  title = 'PAGE NOT FOUND', 
  message = "The requested resource has been moved, deleted, or simply never existed in this dormitory.",
  onAction,
  actionText = 'Return to Dashboard'
}) => {
  return (
    <div className="min-h-screen bg-[#001F3F] flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FFD700]/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10">
        <div className="mb-8 relative inline-block">
          <h1 className="text-[8rem] md:text-[12rem] font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 leading-none select-none tracking-tighter">
            {code}
          </h1>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 border-[1px] border-[#FFD700]/20 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        <h2 className="text-[#FFD700] text-2xl md:text-4xl font-bold mb-4 tracking-tight uppercase">{title}</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-10 text-lg font-light leading-relaxed">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={onAction || (() => window.location.href = '/')}
            className="px-10 py-4 bg-[#FFD700] text-[#001F3F] font-bold rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_10px_30px_rgba(255,215,0,0.3)] w-full sm:w-auto"
          >
            {actionText}
          </button>
          <button 
            onClick={() => window.history.back()}
            className="px-10 py-4 border border-white/20 text-white font-medium rounded-xl hover:bg-white/5 active:scale-95 transition-all duration-300 w-full sm:w-auto"
          >
            Go Back
          </button>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 w-full text-center">
        <p className="text-white/20 text-sm font-mono tracking-widest uppercase italic">
          Error Code: {code === '404' ? 'SEC_ROOM_NULL_EXCEPTION' : `SEC_ERR_${code}`}
        </p>
      </div>
    </div>
  );
};
