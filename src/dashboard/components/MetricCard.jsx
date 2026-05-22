import {
  CalendarDays,
  CircleAlert,
  PiggyBank,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { formatCurrency } from "../utils";

const iconMap = {
  income: WalletCards,
  info: CalendarDays,
  danger: CircleAlert,
  success: PiggyBank,
};

const toneMap = {
  income: "border-income/35 from-[#242512] to-[#101725] text-income",
  info: "border-info/35 from-[#10233f] to-[#101725] text-info",
  danger: "border-danger/35 from-[#2a1824] to-[#101725] text-danger",
  success: "border-success/35 from-[#123024] to-[#101725] text-success",
};

const sparkToneMap = {
  income: "bg-income",
  info: "bg-info",
  danger: "bg-danger",
  success: "bg-success",
};

function formatMetricValue(value, format) {
  if (format === "number") return new Intl.NumberFormat("pt-BR").format(value);
  if (format === "text") return String(value);
  return formatCurrency(value);
}

export default function MetricCard({ title, value, tone, format = "currency" }) {
  const Icon = iconMap[tone] || ReceiptText;
  const bars = [22, 22, 24, 38, 40, 52, 47, 60, 64, 58, 72, 70];

  return (
    <article
      className={`premium-card relative min-h-[150px] overflow-hidden rounded-[22px] border bg-gradient-to-br px-4 py-4 sm:px-5 ${toneMap[tone]}`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-current opacity-10 blur-2xl" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-copy/80">{title}</p>
          <strong className="mt-2 block truncate font-display text-[1.25rem] font-bold text-white sm:text-[1.75rem]">
            {formatMetricValue(value, format)}
          </strong>
          <p className="mt-2 text-xs font-semibold text-current">Atualizado no filtro ativo</p>
        </div>
        <span className="mt-1 rounded-full border border-white/10 bg-current/20 p-3 text-current shadow-[0_0_32px_rgba(255,255,255,0.08)]">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex h-10 items-end gap-1 opacity-80">
        {bars.map((height, index) => (
          <span
            key={`${title}-${index}`}
            className={`flex-1 rounded-full ${sparkToneMap[tone] || "bg-info"}`}
            style={{ height: `${height}%`, opacity: 0.28 + index * 0.04 }}
          />
        ))}
      </div>
    </article>
  );
}
