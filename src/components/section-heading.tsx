export const SectionHeading = ({
  emoji,
  title,
}: {
  emoji?: string;
  title: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full shrink-0" />
    <h5 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-emerald-500">
      {emoji && <span className="mr-1.5">{emoji}</span>}
      {title}
    </h5>
  </div>
);
