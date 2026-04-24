export const summaryCards = [
  { title: "Renda total", value: 1200, tone: "income" },
  { title: "Renda total do mes", value: 1200, tone: "info" },
  { title: "Gastos pagos", value: 0, tone: "danger" },
  { title: "Saldo geral atual", value: 1200, tone: "success" },
];

export const accountSummaryCards = [
  { title: "Contas abertas", value: 2500, tone: "danger" },
  { title: "Contas pagas", value: 1800, tone: "success" },
  { title: "Vencimentos no mes", value: 4, tone: "info" },
  { title: "Parcelas monitoradas", value: 9, tone: "income" },
];

export const capitalSummaryCards = [
  { title: "Capital atual", value: 6200, tone: "success" },
  { title: "Aportes do mes", value: 1850, tone: "income" },
  { title: "Reserva livre", value: 2400, tone: "info" },
  { title: "Saidas planejadas", value: 900, tone: "danger" },
];

export const investmentSummaryCards = [
  { title: "Total investido", value: 15800, tone: "success" },
  { title: "Aporte mensal", value: 1250, tone: "income" },
  { title: "Retorno estimado", value: 480, tone: "info" },
  { title: "Risco moderado", value: 3, tone: "danger" },
];

export const entryRows = [
  { id: "entry-1", label: "Venda de notebook", value: 1000 },
  { id: "entry-2", label: "Bonus mensal", value: 1000 },
];

export const capitalRows = [
  { id: "capital-1", label: "Salario principal", value: 3500, note: "Recorrente" },
  { id: "capital-2", label: "Renda extra", value: 850, note: "Abril/2026" },
  { id: "capital-3", label: "Reserva emergencia", value: 1850, note: "Protegido" },
];

export const initialLeisureRows = [
  { id: "leisure-1", label: "Cinema", value: 1200 },
  { id: "leisure-2", label: "Jantar", value: 500 },
];

export const investmentRows = [
  { id: "investment-1", name: "Tesouro Selic", category: "Renda fixa", value: 5200, yield: "+0,92%" },
  { id: "investment-2", name: "CDB liquidez diaria", category: "Reserva", value: 3400, yield: "+0,81%" },
  { id: "investment-3", name: "ETF IVVB11", category: "Exterior", value: 7200, yield: "+1,34%" },
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
