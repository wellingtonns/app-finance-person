import {
  CalendarDays,
  PiggyBank,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { formatCurrency } from "../utils";

const iconMap = {
  income: WalletCards,
  info: CalendarDays,
  danger: ShoppingCart,
  success: PiggyBank,
};

const toneMap = {
  income: "border-income/45 bg-[#251d11] text-income",
  info: "border-info/45 bg-[#121c33] text-info",
  danger: "border-danger/45 bg-[#2c141c] text-danger",
  success: "border-success/45 bg-[#13271d] text-success",
};

function formatMetricValue(value, format) {
  if (format === "number") return new Intl.NumberFormat("pt-BR").format(value);
  if (format === "text") return String(value);
  return formatCurrency(value);
}

export default function MetricCard({ title, value, tone, format = "currency" }) {
  const Icon = iconMap[tone] || WalletCards;

  return (
    <article
      className={`premium-card relative overflow-hidden rounded-[22px] border px-4 py-4 sm:px-5 ${toneMap[tone]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-copy/80">{title}</p>
          <strong className="mt-2 block font-display text-[1.15rem] font-bold sm:text-[1.85rem]">
            {formatMetricValue(value, format)}
          </strong>
        </div>
        <span className="mt-1 rounded-2xl border border-white/10 bg-black/10 p-2">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </div>
    </article>
  );
}
