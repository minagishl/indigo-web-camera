interface LogPanelProps {
  message: string;
}

export function LogPanel({ message }: LogPanelProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black/80 backdrop-blur rounded-lg p-3 text-xs text-white/80">
      <div>Log: {message}</div>
    </div>
  );
}
