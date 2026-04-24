export const DEFAULT_PEOPLE = ["Andressa", "Wellington", "Casal"];

export const DEFAULT_ENTRIES = [
  { id: "entry-1", label: "Venda de notebook", value: 1000 },
  { id: "entry-2", label: "Bonus mensal", value: 1000 },
];

export const DEFAULT_LEISURE = [
  { id: "leisure-1", label: "Cinema", value: 1200 },
  { id: "leisure-2", label: "Jantar", value: 500 },
];

export const DEFAULT_DEBTS = [
  {
    id: "debt-1",
    person: "Andressa",
    name: "Cartao Nubank",
    value: 1200,
    dueDate: "07/04/2026",
    delay: 0,
    status: "paid",
    statusLabel: "Paga",
  },
  {
    id: "debt-2",
    person: "Wellington",
    name: "Financiamento",
    value: 1000,
    dueDate: "22/04/2026",
    delay: 0,
    status: "open",
    statusLabel: "A vencer",
  },
  {
    id: "debt-3",
    person: "Casal",
    name: "Mercado parcelado",
    value: 500,
    dueDate: "03/04/2026",
    delay: 3,
    status: "late",
    statusLabel: "Atrasada",
  },
];

export const DEFAULT_CAPITAL = [
  { id: "capital-1", label: "Salario principal", value: 3500, note: "Recorrente" },
  { id: "capital-2", label: "Renda extra", value: 850, note: "Abril/2026" },
  { id: "capital-3", label: "Reserva emergencia", value: 1850, note: "Protegido" },
];

export const DEFAULT_INVESTMENTS = [
  { id: "investment-1", name: "Tesouro Selic", category: "Renda fixa", value: 5200, yield: "+0,92%" },
  { id: "investment-2", name: "CDB liquidez diaria", category: "Reserva", value: 3400, yield: "+0,81%" },
  { id: "investment-3", name: "ETF IVVB11", category: "Exterior", value: 7200, yield: "+1,34%" },
];

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }));
}

function normalizeTextList(list, fallback) {
  if (!Array.isArray(list)) return [...fallback];
  const seen = new Set();
  const normalized = list
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return normalized.length ? normalized : [...fallback];
}

function normalizeMoneyRows(rows, fallback, prefix) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const label = String(row && row.label ? row.label : "").trim();
      const value = Number(row && row.value);
      if (!label || !Number.isFinite(value)) return null;
      return {
        id: String((row && row.id) || createId(prefix)),
        label,
        value,
      };
    })
    .filter(Boolean);
}

function normalizeCapitalRows(rows, fallback) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const label = String(row && row.label ? row.label : "").trim();
      const value = Number(row && row.value);
      if (!label || !Number.isFinite(value)) return null;
      return {
        id: String((row && row.id) || createId("capital")),
        label,
        note: String(row && row.note ? row.note : "Atualizado agora").trim() || "Atualizado agora",
        value,
      };
    })
    .filter(Boolean);
}

function normalizeInvestmentRows(rows, fallback) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const name = String(row && row.name ? row.name : "").trim();
      const value = Number(row && row.value);
      if (!name || !Number.isFinite(value)) return null;
      return {
        id: String((row && row.id) || createId("investment")),
        name,
        category: String(row && row.category ? row.category : "Carteira").trim() || "Carteira",
        value,
        yield: String(row && row.yield ? row.yield : "+0,00%").trim() || "+0,00%",
      };
    })
    .filter(Boolean);
}

function normalizeDebtRows(rows, fallback, people) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const person = String(row && row.person ? row.person : people[0]).trim();
      const name = String(row && row.name ? row.name : "").trim();
      const value = Number(row && row.value);
      if (!person || !name || !Number.isFinite(value)) return null;
      const status = ["paid", "open", "late"].includes(row && row.status) ? row.status : "open";
      const statusLabel = status === "paid" ? "Paga" : status === "late" ? "Atrasada" : "A vencer";
      return {
        id: String((row && row.id) || createId("debt")),
        person,
        name,
        value,
        dueDate: String(row && row.dueDate ? row.dueDate : "A vencer").trim() || "A vencer",
        delay: Number.isFinite(Number(row && row.delay)) ? Number(row.delay) : 0,
        status,
        statusLabel: String(row && row.statusLabel ? row.statusLabel : statusLabel).trim() || statusLabel,
      };
    })
    .filter(Boolean);
}

export function createDefaultDashboardState() {
  return {
    people: [...DEFAULT_PEOPLE],
    selectedPerson: DEFAULT_PEOPLE[0],
    sumSalaries: true,
    consolidateDebts: true,
    entries: cloneRows(DEFAULT_ENTRIES),
    leisureRows: cloneRows(DEFAULT_LEISURE),
    debtRows: cloneRows(DEFAULT_DEBTS),
    capitalItems: cloneRows(DEFAULT_CAPITAL),
    investmentItems: cloneRows(DEFAULT_INVESTMENTS),
    currentView: "dashboard",
  };
}

export function normalizeDashboardState(snapshot) {
  const fallback = createDefaultDashboardState();
  const people = normalizeTextList(snapshot && snapshot.people, fallback.people);
  const selectedPerson = people.includes(snapshot && snapshot.selectedPerson) ? snapshot.selectedPerson : people[0];

  return {
    people,
    selectedPerson,
    sumSalaries: snapshot && typeof snapshot.sumSalaries === "boolean" ? snapshot.sumSalaries : true,
    consolidateDebts: snapshot && typeof snapshot.consolidateDebts === "boolean" ? snapshot.consolidateDebts : true,
    entries: normalizeMoneyRows(snapshot && snapshot.entries, fallback.entries, "entry"),
    leisureRows: normalizeMoneyRows(snapshot && snapshot.leisureRows, fallback.leisureRows, "leisure"),
    debtRows: normalizeDebtRows(snapshot && snapshot.debtRows, fallback.debtRows, people),
    capitalItems: normalizeCapitalRows(snapshot && snapshot.capitalItems, fallback.capitalItems),
    investmentItems: normalizeInvestmentRows(snapshot && snapshot.investmentItems, fallback.investmentItems),
    currentView: ["dashboard", "contas", "capital", "investimentos"].includes(snapshot && snapshot.currentView)
      ? snapshot.currentView
      : "dashboard",
  };
}

export function createDashboardSnapshot(state) {
  return {
    people: [...state.people],
    selectedPerson: state.selectedPerson,
    sumSalaries: state.sumSalaries,
    consolidateDebts: state.consolidateDebts,
    entries: cloneRows(state.entries),
    leisureRows: cloneRows(state.leisureRows),
    debtRows: cloneRows(state.debtRows),
    capitalItems: cloneRows(state.capitalItems),
    investmentItems: cloneRows(state.investmentItems),
    currentView: state.currentView,
  };
}

export function addEntryItem(state, payload, idFactory = () => createId("entry")) {
  return {
    ...state,
    entries: [
      ...state.entries,
      {
        id: idFactory(),
        label: payload.description.trim(),
        value: Number(payload.value),
      },
    ],
  };
}

export function addLeisureItem(state, payload, idFactory = () => createId("leisure")) {
  return {
    ...state,
    leisureRows: [
      ...state.leisureRows,
      {
        id: idFactory(),
        label: payload.description.trim(),
        value: Number(payload.value),
      },
    ],
  };
}

export function clearLeisureItems(state) {
  return {
    ...state,
    leisureRows: [],
  };
}

export function addPersonItem(state, name) {
  const normalized = String(name || "").trim();
  if (!normalized) return state;
  const formatted = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  if (state.people.some((person) => person.toLowerCase() === formatted.toLowerCase())) return state;
  return {
    ...state,
    people: [...state.people, formatted],
  };
}

export function removePersonItem(state, person) {
  if (state.people.length <= 1) return state;
  const nextPeople = state.people.filter((item) => item !== person);
  return {
    ...state,
    people: nextPeople,
    selectedPerson: state.selectedPerson === person ? nextPeople[0] : state.selectedPerson,
    debtRows: state.debtRows.filter((row) => row.person !== person),
  };
}

export function addDebtItem(state, payload, idFactory = () => createId("debt")) {
  return {
    ...state,
    debtRows: [
      ...state.debtRows,
      {
        id: idFactory(),
        person: payload.person,
        name: payload.name.trim(),
        value: Number(payload.value),
        dueDate: payload.dueDate,
        status: payload.status,
        statusLabel: payload.statusLabel,
        delay: Number(payload.delay || 0),
      },
    ],
  };
}

export function removeDebtItem(state, id) {
  return {
    ...state,
    debtRows: state.debtRows.filter((row) => row.id !== id),
  };
}

export function addCapitalItem(state, payload, idFactory = () => createId("capital")) {
  return {
    ...state,
    capitalItems: [
      ...state.capitalItems,
      {
        id: idFactory(),
        label: payload.label.trim(),
        note: String(payload.note || "").trim() || "Atualizado agora",
        value: Number(payload.value),
      },
    ],
  };
}

export function removeCapitalItem(state, id) {
  return {
    ...state,
    capitalItems: state.capitalItems.filter((row) => row.id !== id),
  };
}

export function clearCapitalItems(state) {
  return {
    ...state,
    capitalItems: [],
  };
}

export function addInvestmentItem(state, payload, idFactory = () => createId("investment")) {
  return {
    ...state,
    investmentItems: [
      ...state.investmentItems,
      {
        id: idFactory(),
        name: payload.name.trim(),
        category: String(payload.category || "").trim() || "Carteira",
        value: Number(payload.value),
        yield: String(payload.yield || "").trim() || "+0,00%",
      },
    ],
  };
}

export function removeInvestmentItem(state, id) {
  return {
    ...state,
    investmentItems: state.investmentItems.filter((row) => row.id !== id),
  };
}
