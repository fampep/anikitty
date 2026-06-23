import React from "react";

export const SectionHeading = ({
  icon,
  title,
}: {
  icon?: React.ReactNode;
  title: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="w-0.5 h-5 bg-white/35 shrink-0" />
    {icon && <span className="text-white/45 flex items-center">{icon}</span>}
    <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight">
      {title}
    </h5>
  </div>
);
