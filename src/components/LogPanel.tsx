interface LogPanelProps {
  message: string;
}

export function LogPanel({ message }: LogPanelProps) {
  return (
    <div className="absolute top-8 right-8 z-10">
      <div className="flex items-center bg-black/50 backdrop-blur rounded-full p-1 h-12">
        <span className="px-3 text-xs text-white/70">{message}</span>
      </div>
    </div>
  );
}
