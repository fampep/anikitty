import React from "react";

const Loading = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center gap-5 bg-background">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-white/[0.06]" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-violet-400 animate-spin" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/30 animate-pulse">
        Loading
      </p>
    </div>
  );
};

export default Loading;
