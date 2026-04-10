export const summaryCards = [
  { title: "Renda total", value: 1200, tone: "income" },
  { title: "Renda total do mes", value: 1200, tone: "info" },
  { title: "Gastos pagos", value: 0, tone: "danger" },
  { title: "Saldo geral atual", value: 1200, tone: "success" },
];

export const entryRows = [
  { id: "entry-1", label: "Venda de notebook", value: 1000 },
  { id: "entry-2", label: "Bonus mensal", value: 1000 },
];

export const initialLeisureRows = [
  { id: "leisure-1", label: "Cinema", value: 1200 },
  { id: "leisure-2", label: "Jantar", value: 500 },
];

export const debtRows = [
  {
    id: "debt-1",
    person: "Pessoa 1",
    name: "Andressa",
    value: 1200,
    dueDate: "07/0/2026",
    delay: 0,
    status: "paid",
    statusLabel: "Paga",
  },
  {
    id: "debt-2",
    person: "Pessoa 2",
    name: "Jantar",
    value: 1000,
    dueDate: "A vencer",
    delay: 0,
    status: "open",
    statusLabel: "A vencer",
  },
  {
    id: "debt-3",
    person: "Pessoa 3",
    name: "Andressa",
    value: 500,
    dueDate: "07/3/2026",
    delay: 0,
    status: "late",
    statusLabel: "Atrasada",
  },
];

export const debtTotals = [
  { id: "total-month", label: "Total do mes", value: "R$ 0,00" },
  { id: "total-general", label: "Total geral", value: "R$ 0,00" },
  { id: "paid-month", label: "Total pagas (mes)", value: "R$ 0,00" },
  { id: "late-month", label: "Total em atraso (mes)", value: "R$ 0,00" },
  { id: "open-month", label: "Total em aberto (mes)", value: "R$ 0,00" },
];
