interface InlineAlertProps {
  type?: "error" | "warning" | "info" | "success";
  message: string;
}

const styles = {
  error: "bg-red-500/10 border-red-500/20 text-red-300",
  warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-300",
  info: "bg-sky-500/10 border-sky-500/20 text-sky-300",
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
};

export function InlineAlert({ type = "error", message }: InlineAlertProps) {
  return (
    <div
      className={`rounded-md border px-3 py-2.5 text-sm ${styles[type]}`}
    >
      {message}
    </div>
  );
}
