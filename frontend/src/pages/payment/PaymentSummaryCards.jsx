import { useEffect, useState } from "react";
import { Wallet, History, CalendarDays, Calendar } from "lucide-react";
import api from "../../api/axios";

const PaymentSummaryCards = ({ refreshTrigger, filters }) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const params = {
          _t: Date.now(),
        };

        if (filters?.personnel_id) params.personnel_id = filters.personnel_id;
        if (filters?.personnel_type)
          params.personnel_type = filters.personnel_type;

        const res = await api.get("/payments/summary", { params });
        setSummary(res.data.data);
      } catch (err) {
        console.error("Failed to load payment summary", err);
      }
    };

    loadSummary();
  }, [refreshTrigger, filters?.personnel_id, filters?.personnel_type]);

  if (!summary) return null;

  const cards = [
    { label: "Paid Today", value: summary.today_total, icon: Wallet },
    { label: "Paid Yesterday", value: summary.yesterday_total, icon: History },
    { label: "This Month", value: summary.month_total, icon: CalendarDays },
    { label: "Year to Date", value: summary.year_total, icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white px-4 pt-3.5 pb-4 min-h-[88px] rounded-[16px] sm:rounded-[20px] border border-slate-200/80 shadow-sm hover:border-blue-200 hover:shadow-md transition-all duration-300 relative group overflow-hidden flex flex-col justify-between"
        >
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-blue-100/50 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <div className="flex justify-between items-center mb-1.5 relative z-10">
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              {card.label}
            </span>
            <div className="p-1.5 bg-slate-50 border border-slate-200/60 rounded-[10px] text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors shadow-sm shrink-0">
              <card.icon size={14} strokeWidth={2} />
            </div>
          </div>

          <div className="flex items-baseline gap-1 relative z-10 mt-1">
            <span className="text-[14px] font-semibold text-slate-400">₹</span>
            <h3 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-slate-900 tabular-nums leading-none">
              {Number(card.value || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaymentSummaryCards;
