import { CheckCircle2 } from "lucide-react";

const currentMonth = new Date().toISOString().slice(0, 7);

export default function InitialSetupPanel({ onComplete }) {
  function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onComplete({
      primaryName: form.get("primaryName"),
      secondaryNames: form.get("secondaryNames"),
      fixedSalary: form.get("fixedSalary"),
      extraIncome: form.get("extraIncome"),
      capitalLabel: form.get("capitalLabel"),
      capitalValue: form.get("capitalValue"),
      firstBillName: form.get("firstBillName"),
      firstBillCategory: form.get("firstBillCategory"),
      firstBillValue: form.get("firstBillValue"),
      firstBillDueDay: form.get("firstBillDueDay"),
      month: form.get("month"),
    });
  }

  return (
    <section className="premium-panel rounded-[22px] p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-2">
        <h3 className="font-display text-[1.9rem] font-bold text-white">Setup inicial</h3>
        <p className="text-base text-copy/78">
          Configure a base do painel com pessoas, renda, capital e uma primeira conta recorrente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input name="primaryName" required placeholder="Pessoa principal" className="field-control" />
          <input name="secondaryNames" placeholder="Outras pessoas, separadas por virgula" className="field-control" />
          <input name="fixedSalary" placeholder="Salario fixo" className="field-control" />
          <input name="extraIncome" placeholder="Renda extra inicial" className="field-control" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <input name="capitalLabel" placeholder="Nome do capital inicial" defaultValue="Reserva inicial" className="field-control" />
          <input name="capitalValue" placeholder="Valor do capital" className="field-control" />
          <input name="month" type="month" defaultValue={currentMonth} className="field-control" />
          <input name="firstBillDueDay" type="number" min="1" max="31" defaultValue="10" placeholder="Dia vencimento" className="field-control" />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input name="firstBillName" placeholder="Primeira conta recorrente" className="field-control" />
          <input name="firstBillCategory" placeholder="Categoria" defaultValue="Contas recorrentes" className="field-control" />
          <input name="firstBillValue" placeholder="Valor" className="field-control" />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-success/30 bg-success/15 px-4 py-3 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            Concluir setup
          </button>
        </div>
      </form>
    </section>
  );
}
