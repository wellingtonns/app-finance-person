const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

export const VIEW_KEYS = [
  "dashboard",
  "entradas",
  "contas",
  "capital",
  "investimentos",
  "pessoas",
];

export const DEFAULT_PEOPLE = [
  {
    id: "person-andressa",
    name: "Andressa",
    fixedSalary: 0,
    extraIncomeByMonth: {},
  },
  {
    id: "person-wellington",
    name: "Wellington",
    fixedSalary: 0,
    extraIncomeByMonth: {},
  },
  {
    id: "person-casal",
    name: "Casal",
    fixedSalary: 0,
    extraIncomeByMonth: {},
  },
];

export const DEFAULT_ENTRIES = [];

export const DEFAULT_LEISURE = [];

export const DEFAULT_DEBTS = [];

export const DEFAULT_CAPITAL = [];

export const DEFAULT_INVESTMENTS = [];

export const DEFAULT_RECURRING_BILLS = [];

const STATUS_LABELS = {
  paid: "Paga",
  open: "A vencer",
  late: "Atrasada",
};

function cloneExtraIncome(extraIncomeByMonth) {
  const source = extraIncomeByMonth && typeof extraIncomeByMonth === "object" ? extraIncomeByMonth : {};
  return Object.fromEntries(
    Object.entries(source)
      .filter(([month, value]) => isMonthValue(month) && Number.isFinite(Number(value)))
      .map(([month, value]) => [month, Number(value)])
  );
}

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }));
}

function clonePeople(people) {
  return people.map((person) => ({
    ...person,
    extraIncomeByMonth: cloneExtraIncome(person.extraIncomeByMonth),
  }));
}

function safeText(value) {
  return String(value || "").trim();
}

function normalizeDisplayName(value) {
  const normalized = safeText(value).replace(/\s+/g, " ");
  if (!normalized) return "";
  return normalized
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeMoney(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeDueDay(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(31, Math.max(1, Math.trunc(parsed)));
}

function normalizeRepeatMonths(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(60, Math.max(1, Math.trunc(parsed)));
}

function normalizeMonth(value) {
  const raw = safeText(value);
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{4}$/.test(raw)) {
    const [month, year] = raw.split("/");
    return `${year}-${month}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [, month, year] = raw.split("/");
    return `${year}-${month}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  return CURRENT_MONTH;
}

function addMonthsToMonth(month, offset) {
  const normalizedMonth = normalizeMonth(month);
  const year = Number(normalizedMonth.slice(0, 4));
  const monthIndex = Number(normalizedMonth.slice(5, 7)) - 1;
  const date = new Date(year, monthIndex + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isMonthValue(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function normalizeDueDate(value, month) {
  const raw = safeText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [day, itemMonth, year] = raw.split("/");
    return `${year}-${itemMonth}-${day}`;
  }
  return `${normalizeMonth(month)}-01`;
}

function getPersonIdByName(people, value) {
  const normalized = normalizeDisplayName(value).toLowerCase();
  if (!normalized) return people[0]?.id;
  const match = people.find((person) => person.name.toLowerCase() === normalized);
  return match ? match.id : people[0]?.id;
}

function resolvePersonId(people, value) {
  if (!value) return people[0]?.id;
  const raw = safeText(value);
  if (!raw) return people[0]?.id;
  const byId = people.find((person) => person.id === raw);
  if (byId) return byId.id;
  return getPersonIdByName(people, raw);
}

function normalizePeople(list, fallback) {
  const source = Array.isArray(list) && list.length ? list : fallback;
  const seenNames = new Set();
  const normalized = source
    .map((item, index) => {
      const legacyName = typeof item === "string" ? item : item?.name;
      const name = normalizeDisplayName(legacyName);
      if (!name) return null;
      const uniqueKey = name.toLowerCase();
      if (seenNames.has(uniqueKey)) return null;
      seenNames.add(uniqueKey);
      return {
        id: safeText(item?.id) || `person-${index + 1}-${name.toLowerCase().replace(/\s+/g, "-")}`,
        name,
        fixedSalary: Number.isFinite(Number(item?.fixedSalary)) ? Number(item.fixedSalary) : 0,
        extraIncomeByMonth: cloneExtraIncome(item?.extraIncomeByMonth),
      };
    })
    .filter(Boolean);
  return normalized.length ? normalized : clonePeople(fallback);
}

function normalizeFilterPerson(value, people, selectedPersonId) {
  if (value === "all") return "all";
  if (value === "selected") return selectedPersonId;
  const resolved = resolvePersonId(people, value);
  return resolved || selectedPersonId;
}

function normalizeStatus(value) {
  return ["all", "paid", "open", "late"].includes(value) ? value : "all";
}

function getComputedDebtStatus(row, today = new Date()) {
  if (row.status === "paid") return "paid";
  const dueDate = safeText(row.dueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return "open";
  return dueDate < today.toISOString().slice(0, 10) ? "late" : "open";
}

function withComputedDebtStatus(row, today = new Date()) {
  const status = getComputedDebtStatus(row, today);
  return {
    ...row,
    status,
    statusLabel: STATUS_LABELS[status],
    delay: status === "late" ? Math.max(1, Number(row.delay || 0)) : 0,
  };
}

function normalizeCategory(value) {
  const category = safeText(value);
  return category || "all";
}

function normalizeEntryRows(rows, fallback, people, defaultPersonId) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const label = safeText(row?.label || row?.description);
      const value = normalizeMoney(row?.value);
      if (!label || !Number.isFinite(value)) return null;
      return {
        id: safeText(row?.id) || createId("entry"),
        personId: resolvePersonId(people, row?.personId || row?.person || defaultPersonId),
        label,
        category: safeText(row?.category) || "Outros ganhos",
        month: normalizeMonth(row?.month || row?.dueDate),
        value,
      };
    })
    .filter(Boolean);
}

function normalizeLeisureRows(rows, fallback, people, defaultPersonId) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const label = safeText(row?.label || row?.description);
      const value = normalizeMoney(row?.value);
      if (!label || !Number.isFinite(value)) return null;
      return {
        id: safeText(row?.id) || createId("leisure"),
        personId: resolvePersonId(people, row?.personId || row?.person || defaultPersonId),
        label,
        category: safeText(row?.category) || "Lazer",
        month: normalizeMonth(row?.month),
        value,
      };
    })
    .filter(Boolean);
}

function normalizeDebtRows(rows, fallback, people, defaultPersonId) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const name = safeText(row?.name || row?.label);
      const value = normalizeMoney(row?.value);
      if (!name || !Number.isFinite(value)) return null;
      const status = ["paid", "open", "late"].includes(row?.status) ? row.status : "open";
      const month = normalizeMonth(row?.month || row?.dueDate);
      return withComputedDebtStatus({
        id: safeText(row?.id) || createId("debt"),
        recurringBillId: safeText(row?.recurringBillId),
        personId: resolvePersonId(people, row?.personId || row?.person || defaultPersonId),
        name,
        category: safeText(row?.category) || "Contas",
        value,
        month,
        dueDate: normalizeDueDate(row?.dueDate, month),
        delay: Number.isFinite(Number(row?.delay)) ? Number(row.delay) : status === "late" ? 3 : 0,
        status,
        statusLabel: safeText(row?.statusLabel) || STATUS_LABELS[status],
      });
    })
    .filter(Boolean);
}

function normalizeRecurringBills(rows, fallback, people, defaultPersonId) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const name = safeText(row?.name || row?.label);
      const value = normalizeMoney(row?.value);
      if (!name || !Number.isFinite(value)) return null;
      return {
        id: safeText(row?.id) || createId("recurring"),
        personId: resolvePersonId(people, row?.personId || row?.person || defaultPersonId),
        name,
        category: safeText(row?.category) || "Contas recorrentes",
        value,
        dueDay: normalizeDueDay(row?.dueDay || row?.day),
        startMonth: normalizeMonth(row?.startMonth || row?.month),
        repeatMonths: normalizeRepeatMonths(row?.repeatMonths),
        active: typeof row?.active === "boolean" ? row.active : true,
      };
    })
    .filter(Boolean);
}

function normalizeCapitalRows(rows, fallback, people, defaultPersonId) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const label = safeText(row?.label);
      const value = normalizeMoney(row?.value);
      if (!label || !Number.isFinite(value)) return null;
      return {
        id: safeText(row?.id) || createId("capital"),
        personId: resolvePersonId(people, row?.personId || row?.person || defaultPersonId),
        label,
        category: safeText(row?.category) || "Capital",
        value,
        month: normalizeMonth(row?.month || row?.note),
        note: safeText(row?.note) || "Atualizado agora",
      };
    })
    .filter(Boolean);
}

function normalizeInvestmentRows(rows, fallback, people, defaultPersonId) {
  const source = Array.isArray(rows) ? rows : fallback;
  return source
    .map((row) => {
      const name = safeText(row?.name || row?.label);
      const value = normalizeMoney(row?.value);
      if (!name || !Number.isFinite(value)) return null;
      return {
        id: safeText(row?.id) || createId("investment"),
        personId: resolvePersonId(people, row?.personId || row?.person || defaultPersonId),
        name,
        category: safeText(row?.category) || "Carteira",
        value,
        month: normalizeMonth(row?.month),
        yield: safeText(row?.yield) || "+0,00%",
      };
    })
    .filter(Boolean);
}

function createPreferences(snapshot) {
  const source = snapshot?.preferences && typeof snapshot.preferences === "object" ? snapshot.preferences : {};
  return {
    includeFixedSalary:
      typeof source.includeFixedSalary === "boolean"
        ? source.includeFixedSalary
        : typeof snapshot?.sumSalaries === "boolean"
          ? snapshot.sumSalaries
          : true,
    consolidateHouseholdDebts:
      typeof source.consolidateHouseholdDebts === "boolean"
        ? source.consolidateHouseholdDebts
        : typeof snapshot?.consolidateDebts === "boolean"
          ? snapshot.consolidateDebts
          : true,
    autoSync: typeof source.autoSync === "boolean" ? source.autoSync : true,
    compactNumbers: typeof source.compactNumbers === "boolean" ? source.compactNumbers : false,
    setupCompleted: typeof source.setupCompleted === "boolean" ? source.setupCompleted : false,
  };
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDefaultDashboardState() {
  const people = clonePeople(DEFAULT_PEOPLE);
  return {
    people,
    selectedPersonId: people[0].id,
    dashboardFilters: {
      personId: people[0].id,
      month: CURRENT_MONTH,
      category: "all",
      status: "all",
    },
    preferences: {
      includeFixedSalary: true,
      consolidateHouseholdDebts: true,
      autoSync: true,
      compactNumbers: false,
      setupCompleted: false,
    },
    entries: cloneRows(DEFAULT_ENTRIES),
    leisureRows: cloneRows(DEFAULT_LEISURE),
    debtRows: cloneRows(DEFAULT_DEBTS),
    capitalItems: cloneRows(DEFAULT_CAPITAL),
    investmentItems: cloneRows(DEFAULT_INVESTMENTS),
    recurringBills: cloneRows(DEFAULT_RECURRING_BILLS),
    currentView: "dashboard",
  };
}

export function normalizeDashboardState(snapshot) {
  const fallback = createDefaultDashboardState();
  const people = normalizePeople(snapshot?.people, fallback.people);
  const selectedPersonId =
    resolvePersonId(people, snapshot?.selectedPersonId || snapshot?.selectedPerson || people[0]?.id) || people[0].id;

  return {
    people,
    selectedPersonId,
    dashboardFilters: {
      personId: normalizeFilterPerson(snapshot?.dashboardFilters?.personId, people, selectedPersonId),
      month: normalizeMonth(snapshot?.dashboardFilters?.month),
      category: normalizeCategory(snapshot?.dashboardFilters?.category),
      status: normalizeStatus(snapshot?.dashboardFilters?.status),
    },
    preferences: createPreferences(snapshot),
    entries: normalizeEntryRows(snapshot?.entries, fallback.entries, people, selectedPersonId),
    leisureRows: normalizeLeisureRows(snapshot?.leisureRows, fallback.leisureRows, people, selectedPersonId),
    debtRows: normalizeDebtRows(snapshot?.debtRows, fallback.debtRows, people, selectedPersonId),
    capitalItems: normalizeCapitalRows(snapshot?.capitalItems, fallback.capitalItems, people, selectedPersonId),
    investmentItems: normalizeInvestmentRows(
      snapshot?.investmentItems,
      fallback.investmentItems,
      people,
      selectedPersonId
    ),
    recurringBills: normalizeRecurringBills(snapshot?.recurringBills, fallback.recurringBills, people, selectedPersonId),
    currentView: VIEW_KEYS.includes(snapshot?.currentView) ? snapshot.currentView : "dashboard",
  };
}

export function createDashboardSnapshot(state) {
  return {
    people: clonePeople(state.people),
    selectedPersonId: state.selectedPersonId,
    dashboardFilters: { ...state.dashboardFilters },
    preferences: { ...state.preferences },
    entries: cloneRows(state.entries),
    leisureRows: cloneRows(state.leisureRows),
    debtRows: cloneRows(state.debtRows),
    capitalItems: cloneRows(state.capitalItems),
    investmentItems: cloneRows(state.investmentItems),
    recurringBills: cloneRows(state.recurringBills || []),
    currentView: state.currentView,
  };
}

export function getPersonName(people, personId) {
  return people.find((person) => person.id === personId)?.name || "Pessoa";
}

export function getMonthExtraIncome(person, month) {
  if (!person || !person.extraIncomeByMonth) return 0;
  return Number(person.extraIncomeByMonth[normalizeMonth(month)] || 0);
}

export function getPeopleIncomeTotal(people, month, includeFixedSalary = true, personId = "all") {
  return people
    .filter((person) => personId === "all" || person.id === personId)
    .reduce((sum, person) => {
      const fixedSalary = includeFixedSalary ? Number(person.fixedSalary || 0) : 0;
      return sum + fixedSalary + getMonthExtraIncome(person, month);
    }, 0);
}

export function setCurrentView(state, view) {
  if (!VIEW_KEYS.includes(view)) return state;
  return {
    ...state,
    currentView: view,
  };
}

export function setSelectedPerson(state, personId) {
  const resolved = resolvePersonId(state.people, personId);
  if (!resolved) return state;
  return {
    ...state,
    selectedPersonId: resolved,
  };
}

export function setDashboardFilter(state, key, value) {
  if (!state.dashboardFilters || !Object.prototype.hasOwnProperty.call(state.dashboardFilters, key)) return state;
  let nextValue = value;
  if (key === "month") nextValue = normalizeMonth(value);
  if (key === "status") nextValue = normalizeStatus(value);
  if (key === "category") nextValue = normalizeCategory(value);
  if (key === "personId") nextValue = normalizeFilterPerson(value, state.people, state.selectedPersonId);
  return {
    ...state,
    dashboardFilters: {
      ...state.dashboardFilters,
      [key]: nextValue,
    },
  };
}

export function setPreferenceValue(state, key, value) {
  if (!state.preferences || !Object.prototype.hasOwnProperty.call(state.preferences, key)) return state;
  return {
    ...state,
    preferences: {
      ...state.preferences,
      [key]: value,
    },
  };
}

export function completeInitialSetup(state, payload, idFactory = createId) {
  const month = normalizeMonth(payload?.month);
  const primaryName = normalizeDisplayName(payload?.primaryName) || "Principal";
  const secondaryNames = safeText(payload?.secondaryNames)
    .split(",")
    .map((name) => normalizeDisplayName(name))
    .filter(Boolean);
  const names = [...new Set([primaryName, ...secondaryNames])];
  const fixedSalary = normalizeMoney(payload?.fixedSalary);
  const extraIncome = normalizeMoney(payload?.extraIncome);
  const people = names.map((name, index) => ({
    id: idFactory("person"),
    name,
    fixedSalary: index === 0 && Number.isFinite(fixedSalary) ? Math.max(0, fixedSalary) : 0,
    extraIncomeByMonth: index === 0 && Number.isFinite(extraIncome) && extraIncome > 0 ? { [month]: extraIncome } : {},
  }));
  const selectedPersonId = people[0]?.id || state.selectedPersonId;
  const capitalValue = normalizeMoney(payload?.capitalValue);
  const firstBillValue = normalizeMoney(payload?.firstBillValue);
  const firstBillName = safeText(payload?.firstBillName);

  return {
    ...state,
    people: people.length ? people : state.people,
    selectedPersonId,
    dashboardFilters: {
      ...state.dashboardFilters,
      personId: selectedPersonId,
      month,
    },
    preferences: {
      ...state.preferences,
      setupCompleted: true,
    },
    entries: [],
    leisureRows: [],
    debtRows: [],
    investmentItems: [],
    capitalItems:
      Number.isFinite(capitalValue) && capitalValue > 0
        ? [
            {
              id: idFactory("capital"),
              personId: selectedPersonId,
              label: safeText(payload?.capitalLabel) || "Capital inicial",
              category: "Capital inicial",
              value: capitalValue,
              month,
              note: "Setup inicial",
            },
          ]
        : [],
    recurringBills:
      firstBillName && Number.isFinite(firstBillValue) && firstBillValue > 0
        ? [
            {
              id: idFactory("recurring"),
              personId: selectedPersonId,
              name: firstBillName,
              category: safeText(payload?.firstBillCategory) || "Contas recorrentes",
              value: firstBillValue,
              dueDay: normalizeDueDay(payload?.firstBillDueDay),
              startMonth: month,
              repeatMonths: 1,
              active: true,
            },
          ]
        : [],
  };
}

export function clearFinancialData(state) {
  return {
    ...state,
    people: state.people.map((person) => ({
      ...person,
      fixedSalary: 0,
      extraIncomeByMonth: {},
    })),
    entries: [],
    leisureRows: [],
    debtRows: [],
    capitalItems: [],
    investmentItems: [],
    recurringBills: [],
    dashboardFilters: {
      ...state.dashboardFilters,
      personId: state.selectedPersonId,
      category: "all",
      status: "all",
    },
    preferences: {
      ...state.preferences,
      setupCompleted: true,
    },
  };
}

export function addEntryItem(state, payload, idFactory = () => createId("entry")) {
  const label = safeText(payload?.label || payload?.description);
  const value = normalizeMoney(payload?.value);
  if (!label || !Number.isFinite(value) || value <= 0) return state;
  return {
    ...state,
    entries: [
      ...state.entries,
      {
        id: idFactory(),
        personId: resolvePersonId(state.people, payload?.personId || state.selectedPersonId),
        label,
        category: safeText(payload?.category) || "Outros ganhos",
        month: normalizeMonth(payload?.month),
        value,
      },
    ],
  };
}

export function updateEntryItem(state, payload) {
  const id = safeText(payload?.id);
  if (!id) return state;
  return {
    ...state,
    entries: state.entries.map((item) =>
      item.id === id
        ? {
            ...item,
            personId: resolvePersonId(state.people, payload?.personId || item.personId),
            label: safeText(payload?.label || payload?.description) || item.label,
            category: safeText(payload?.category) || item.category,
            month: normalizeMonth(payload?.month || item.month),
            value:
              Number.isFinite(normalizeMoney(payload?.value)) && normalizeMoney(payload?.value) > 0
                ? normalizeMoney(payload?.value)
                : item.value,
          }
        : item
    ),
  };
}

export function removeEntryItem(state, id) {
  return {
    ...state,
    entries: state.entries.filter((row) => row.id !== id),
  };
}

export function addLeisureItem(state, payload, idFactory = () => createId("leisure")) {
  const label = safeText(payload?.label || payload?.description);
  const value = normalizeMoney(payload?.value);
  if (!label || !Number.isFinite(value) || value <= 0) return state;
  return {
    ...state,
    leisureRows: [
      ...state.leisureRows,
      {
        id: idFactory(),
        personId: resolvePersonId(state.people, payload?.personId || state.selectedPersonId),
        label,
        category: safeText(payload?.category) || "Lazer",
        month: normalizeMonth(payload?.month),
        value,
      },
    ],
  };
}

export function updateLeisureItem(state, payload) {
  const id = safeText(payload?.id);
  if (!id) return state;
  return {
    ...state,
    leisureRows: state.leisureRows.map((item) =>
      item.id === id
        ? {
            ...item,
            personId: resolvePersonId(state.people, payload?.personId || item.personId),
            label: safeText(payload?.label || payload?.description) || item.label,
            category: safeText(payload?.category) || item.category,
            month: normalizeMonth(payload?.month || item.month),
            value:
              Number.isFinite(normalizeMoney(payload?.value)) && normalizeMoney(payload?.value) > 0
                ? normalizeMoney(payload?.value)
                : item.value,
          }
        : item
    ),
  };
}

export function removeLeisureItem(state, id) {
  return {
    ...state,
    leisureRows: state.leisureRows.filter((row) => row.id !== id),
  };
}

export function clearLeisureItems(state) {
  return {
    ...state,
    leisureRows: [],
  };
}

export function addPersonItem(state, payload, idFactory = () => createId("person")) {
  const name = normalizeDisplayName(typeof payload === "string" ? payload : payload?.name);
  const fixedSalary = Number.isFinite(normalizeMoney(payload?.fixedSalary))
    ? Math.max(0, normalizeMoney(payload?.fixedSalary))
    : 0;
  if (!name) return state;
  if (state.people.some((person) => person.name.toLowerCase() === name.toLowerCase())) return state;

  return {
    ...state,
    people: [
      ...state.people,
      {
        id: idFactory(),
        name,
        fixedSalary,
        extraIncomeByMonth: {},
      },
    ],
  };
}

export function updatePersonItem(state, payload) {
  const id = safeText(payload?.id);
  const name = normalizeDisplayName(payload?.name);
  const fixedSalary = normalizeMoney(payload?.fixedSalary);
  if (!id || !name) return state;
  const hasDuplicate = state.people.some(
    (person) => person.id !== id && person.name.toLowerCase() === name.toLowerCase()
  );
  if (hasDuplicate) return state;
  return {
    ...state,
    people: state.people.map((person) =>
      person.id === id
        ? {
            ...person,
            name,
            fixedSalary: Number.isFinite(fixedSalary) && fixedSalary >= 0 ? fixedSalary : person.fixedSalary,
          }
        : person
    ),
  };
}

export function setPersonExtraIncome(state, payload) {
  const personId = resolvePersonId(state.people, payload?.personId);
  const month = normalizeMonth(payload?.month);
  const value = normalizeMoney(payload?.value);
  if (!personId || !Number.isFinite(value) || value < 0) return state;

  return {
    ...state,
    people: state.people.map((person) =>
      person.id === personId
        ? {
            ...person,
            extraIncomeByMonth: {
              ...person.extraIncomeByMonth,
              [month]: value,
            },
          }
        : person
    ),
  };
}

export function removePersonExtraIncome(state, personId, month) {
  const resolvedPersonId = resolvePersonId(state.people, personId);
  const normalizedMonth = normalizeMonth(month);
  return {
    ...state,
    people: state.people.map((person) => {
      if (person.id !== resolvedPersonId) return person;
      const nextExtraIncome = { ...person.extraIncomeByMonth };
      delete nextExtraIncome[normalizedMonth];
      return {
        ...person,
        extraIncomeByMonth: nextExtraIncome,
      };
    }),
  };
}

export function removePersonItem(state, personId) {
  if (state.people.length <= 1) return state;
  const resolvedPersonId = resolvePersonId(state.people, personId);
  const nextPeople = state.people.filter((item) => item.id !== resolvedPersonId);
  if (!nextPeople.length) return state;

  return {
    ...state,
    people: nextPeople,
    selectedPersonId: state.selectedPersonId === resolvedPersonId ? nextPeople[0].id : state.selectedPersonId,
    dashboardFilters: {
      ...state.dashboardFilters,
      personId:
        state.dashboardFilters.personId === resolvedPersonId ? nextPeople[0].id : state.dashboardFilters.personId,
    },
    entries: state.entries.filter((row) => row.personId !== resolvedPersonId),
    leisureRows: state.leisureRows.filter((row) => row.personId !== resolvedPersonId),
    debtRows: state.debtRows.filter((row) => row.personId !== resolvedPersonId),
    capitalItems: state.capitalItems.filter((row) => row.personId !== resolvedPersonId),
    investmentItems: state.investmentItems.filter((row) => row.personId !== resolvedPersonId),
    recurringBills: (state.recurringBills || []).filter((row) => row.personId !== resolvedPersonId),
  };
}

export function addDebtItem(state, payload, idFactory = () => createId("debt")) {
  const name = safeText(payload?.name);
  const value = normalizeMoney(payload?.value);
  if (!name || !Number.isFinite(value) || value <= 0) return state;
  const status = ["paid", "open", "late"].includes(payload?.status) ? payload.status : "open";
  const month = normalizeMonth(payload?.month || payload?.dueDate);
  return {
    ...state,
    debtRows: [
      ...state.debtRows,
      withComputedDebtStatus({
        id: idFactory(),
        recurringBillId: safeText(payload?.recurringBillId),
        personId: resolvePersonId(state.people, payload?.personId || state.selectedPersonId),
        name,
        category: safeText(payload?.category) || "Contas",
        value,
        month,
        dueDate: normalizeDueDate(payload?.dueDate, month),
        status,
        statusLabel: safeText(payload?.statusLabel) || STATUS_LABELS[status],
        delay: Number.isFinite(Number(payload?.delay)) ? Number(payload.delay) : status === "late" ? 3 : 0,
      }),
    ],
  };
}

export function updateDebtItem(state, payload) {
  const id = safeText(payload?.id);
  if (!id) return state;
  return {
    ...state,
    debtRows: state.debtRows.map((item) => {
      if (item.id !== id) return item;
      const status = ["paid", "open", "late"].includes(payload?.status) ? payload.status : item.status;
      const month = normalizeMonth(payload?.month || payload?.dueDate || item.month);
      const nextValue = normalizeMoney(payload?.value);
      return withComputedDebtStatus({
        ...item,
        personId: resolvePersonId(state.people, payload?.personId || item.personId),
        name: safeText(payload?.name) || item.name,
        category: safeText(payload?.category) || item.category,
        value: Number.isFinite(nextValue) && nextValue > 0 ? nextValue : item.value,
        month,
        dueDate: normalizeDueDate(payload?.dueDate || item.dueDate, month),
        status,
        statusLabel: STATUS_LABELS[status],
        delay: Number.isFinite(Number(payload?.delay)) ? Number(payload.delay) : status === "late" ? 3 : 0,
      });
    }),
  };
}

export function applyComputedDebtStatuses(state, today = new Date()) {
  return {
    ...state,
    debtRows: state.debtRows.map((row) => withComputedDebtStatus(row, today)),
  };
}

export function removeDebtItem(state, id) {
  return {
    ...state,
    debtRows: state.debtRows.filter((row) => row.id !== id),
  };
}

export function addRecurringBillItem(state, payload, idFactory = () => createId("recurring")) {
  const name = safeText(payload?.name);
  const value = normalizeMoney(payload?.value);
  if (!name || !Number.isFinite(value) || value <= 0) return state;
  return {
    ...state,
    recurringBills: [
      ...(state.recurringBills || []),
      {
        id: idFactory(),
        personId: resolvePersonId(state.people, payload?.personId || state.selectedPersonId),
        name,
        category: safeText(payload?.category) || "Contas recorrentes",
        value,
        dueDay: normalizeDueDay(payload?.dueDay),
        startMonth: normalizeMonth(payload?.startMonth),
        repeatMonths: normalizeRepeatMonths(payload?.repeatMonths),
        active: typeof payload?.active === "boolean" ? payload.active : true,
      },
    ],
  };
}

export function updateRecurringBillItem(state, payload) {
  const id = safeText(payload?.id);
  const value = normalizeMoney(payload?.value);
  if (!id) return state;
  return {
    ...state,
    recurringBills: (state.recurringBills || []).map((item) =>
      item.id === id
        ? {
            ...item,
            personId: resolvePersonId(state.people, payload?.personId || item.personId),
            name: safeText(payload?.name) || item.name,
            category: safeText(payload?.category) || item.category,
            value: Number.isFinite(value) && value > 0 ? value : item.value,
            dueDay: normalizeDueDay(payload?.dueDay || item.dueDay),
            startMonth: normalizeMonth(payload?.startMonth || item.startMonth),
            repeatMonths: normalizeRepeatMonths(payload?.repeatMonths || item.repeatMonths),
            active: typeof payload?.active === "boolean" ? payload.active : item.active,
          }
        : item
    ),
  };
}

export function removeRecurringBillItem(state, id) {
  return {
    ...state,
    recurringBills: (state.recurringBills || []).filter((row) => row.id !== id),
  };
}

function createRecurringDebtRowsForBill(state, bill, startMonth, repeatMonths, idFactory) {
  const monthsToGenerate = normalizeRepeatMonths(repeatMonths);
  const rows = [];

  for (let offset = 0; offset < monthsToGenerate; offset += 1) {
    const normalizedMonth = addMonthsToMonth(startMonth, offset);
    const alreadyExists = state.debtRows.some(
      (row) => row.month === normalizedMonth && row.recurringBillId === bill.id
    );
    if (alreadyExists) continue;

    const daysInMonth = new Date(Number(normalizedMonth.slice(0, 4)), Number(normalizedMonth.slice(5, 7)), 0).getDate();
    const day = String(Math.min(daysInMonth, normalizeDueDay(bill.dueDay))).padStart(2, "0");
    rows.push(
      withComputedDebtStatus({
        id: idFactory(),
        recurringBillId: bill.id,
        personId: resolvePersonId(state.people, bill.personId || state.selectedPersonId),
        name: bill.name,
        category: bill.category,
        value: bill.value,
        month: normalizedMonth,
        dueDate: `${normalizedMonth}-${day}`,
        status: "open",
        statusLabel: STATUS_LABELS.open,
        delay: 0,
      })
    );
  }

  return rows;
}

export function addRecurringBillWithDebts(
  state,
  payload,
  startMonth,
  recurringIdFactory = () => createId("recurring"),
  debtIdFactory = () => createId("debt")
) {
  const name = safeText(payload?.name);
  const value = normalizeMoney(payload?.value);
  if (!name || !Number.isFinite(value) || value <= 0) return state;

  const bill = {
    id: recurringIdFactory(),
    personId: resolvePersonId(state.people, payload?.personId || state.selectedPersonId),
    name,
    category: safeText(payload?.category) || "Contas recorrentes",
    value,
    dueDay: normalizeDueDay(payload?.dueDay),
    startMonth: normalizeMonth(startMonth || payload?.startMonth),
    repeatMonths: normalizeRepeatMonths(payload?.repeatMonths),
    active: typeof payload?.active === "boolean" ? payload.active : true,
  };
  const withBill = {
    ...state,
    recurringBills: [...(state.recurringBills || []), bill],
  };
  const generated = bill.active
    ? createRecurringDebtRowsForBill(withBill, bill, startMonth || payload?.startMonth, bill.repeatMonths, debtIdFactory)
    : [];

  return {
    ...withBill,
    debtRows: [...withBill.debtRows, ...generated],
  };
}

export function updateRecurringBillWithDebts(
  state,
  payload,
  startMonth,
  debtIdFactory = () => createId("debt")
) {
  const id = safeText(payload?.id);
  if (!id) return state;

  const value = normalizeMoney(payload?.value);
  const currentBill = (state.recurringBills || []).find((item) => item.id === id);
  if (!currentBill) return state;

  const bill = {
    ...currentBill,
    personId: resolvePersonId(state.people, payload?.personId || currentBill.personId),
    name: safeText(payload?.name) || currentBill.name,
    category: safeText(payload?.category) || currentBill.category,
    value: Number.isFinite(value) && value > 0 ? value : currentBill.value,
    dueDay: normalizeDueDay(payload?.dueDay || currentBill.dueDay),
    startMonth: normalizeMonth(startMonth || payload?.startMonth || currentBill.startMonth),
    repeatMonths: normalizeRepeatMonths(payload?.repeatMonths || currentBill.repeatMonths),
    active: typeof payload?.active === "boolean" ? payload.active : currentBill.active,
  };
  const preservedDebtRows = state.debtRows.filter(
    (row) => row.recurringBillId !== id || row.status === "paid"
  );
  const withBill = {
    ...state,
    recurringBills: (state.recurringBills || []).map((item) => (item.id === id ? bill : item)),
    debtRows: preservedDebtRows,
  };
  const generated = bill.active
    ? createRecurringDebtRowsForBill(withBill, bill, bill.startMonth, bill.repeatMonths, debtIdFactory)
    : [];

  return {
    ...withBill,
    debtRows: [...preservedDebtRows, ...generated],
  };
}

export function generateRecurringDebtsForMonth(state, month, idFactory = () => createId("debt")) {
  const normalizedMonth = normalizeMonth(month);
  const generated = (state.recurringBills || [])
    .filter((bill) => bill.active)
    .flatMap((bill) => createRecurringDebtRowsForBill(state, bill, normalizedMonth, 1, idFactory));

  return {
    ...state,
    debtRows: [...state.debtRows, ...generated],
  };
}

export function addCapitalItem(state, payload, idFactory = () => createId("capital")) {
  const label = safeText(payload?.label);
  const value = normalizeMoney(payload?.value);
  if (!label || !Number.isFinite(value) || value <= 0) return state;
  return {
    ...state,
    capitalItems: [
      ...state.capitalItems,
      {
        id: idFactory(),
        personId: resolvePersonId(state.people, payload?.personId || state.selectedPersonId),
        label,
        category: safeText(payload?.category) || "Capital",
        value,
        month: normalizeMonth(payload?.month),
        note: safeText(payload?.note) || "Atualizado agora",
      },
    ],
  };
}

export function updateCapitalItem(state, payload) {
  const id = safeText(payload?.id);
  if (!id) return state;
  return {
    ...state,
    capitalItems: state.capitalItems.map((item) =>
      item.id === id
        ? {
            ...item,
            personId: resolvePersonId(state.people, payload?.personId || item.personId),
            label: safeText(payload?.label) || item.label,
            category: safeText(payload?.category) || item.category,
            month: normalizeMonth(payload?.month || item.month),
            note: safeText(payload?.note) || item.note,
            value:
              Number.isFinite(normalizeMoney(payload?.value)) && normalizeMoney(payload?.value) > 0
                ? normalizeMoney(payload?.value)
                : item.value,
          }
        : item
    ),
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
  const name = safeText(payload?.name);
  const value = normalizeMoney(payload?.value);
  if (!name || !Number.isFinite(value) || value <= 0) return state;
  return {
    ...state,
    investmentItems: [
      ...state.investmentItems,
      {
        id: idFactory(),
        personId: resolvePersonId(state.people, payload?.personId || state.selectedPersonId),
        name,
        category: safeText(payload?.category) || "Carteira",
        value,
        month: normalizeMonth(payload?.month),
        yield: safeText(payload?.yield) || "+0,00%",
      },
    ],
  };
}

export function updateInvestmentItem(state, payload) {
  const id = safeText(payload?.id);
  if (!id) return state;
  return {
    ...state,
    investmentItems: state.investmentItems.map((item) =>
      item.id === id
        ? {
            ...item,
            personId: resolvePersonId(state.people, payload?.personId || item.personId),
            name: safeText(payload?.name) || item.name,
            category: safeText(payload?.category) || item.category,
            month: normalizeMonth(payload?.month || item.month),
            yield: safeText(payload?.yield) || item.yield,
            value:
              Number.isFinite(normalizeMoney(payload?.value)) && normalizeMoney(payload?.value) > 0
                ? normalizeMoney(payload?.value)
                : item.value,
          }
        : item
    ),
  };
}

export function removeInvestmentItem(state, id) {
  return {
    ...state,
    investmentItems: state.investmentItems.filter((row) => row.id !== id),
  };
}

export function getAvailableCategories(state) {
  const categories = new Set(["all"]);
  state.entries.forEach((item) => categories.add(item.category));
  state.leisureRows.forEach((item) => categories.add(item.category));
  state.debtRows.forEach((item) => categories.add(item.category));
  state.capitalItems.forEach((item) => categories.add(item.category));
  state.investmentItems.forEach((item) => categories.add(item.category));
  (state.recurringBills || []).forEach((item) => categories.add(item.category));
  return [...categories];
}
