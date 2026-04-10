const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const state = {
  people: [],
  activePersonId: null,
  debtScope: "active",
  debtFilter: "all",
  debtMonthFilter: "",
  investmentScope: "active",
  currentView: "dashboard",
  useCombinedSalaries: false,
  capitalMonth: "",
  darkMode: false,
  appliedTemplates: {
    financeiro2026: false,
  },
};

const storageKey = "controle-gastos-v3";
const legacyKey = "controle-gastos-v2";
const usersKey = "controle-gastos-users-v1";
const sessionKey = "controle-gastos-session-v1";
const financeiroTemplateTag = "financeiro-planilha-csv";
const financeiroMonthMeta = [
  { key: "01", label: "Janeiro", valueIndex: 1, statusIndex: 2 },
  { key: "02", label: "Fevereiro", valueIndex: 3, statusIndex: 4 },
  { key: "03", label: "Marco", valueIndex: 5, statusIndex: 6 },
  { key: "04", label: "Abril", valueIndex: 7, statusIndex: 8 },
  { key: "05", label: "Maio", valueIndex: 9, statusIndex: 10 },
  { key: "06", label: "Junho", valueIndex: 11, statusIndex: 12 },
  { key: "07", label: "Julho", valueIndex: 13, statusIndex: 14 },
  { key: "08", label: "Agosto", valueIndex: 15, statusIndex: 16 },
  { key: "09", label: "Setembro", valueIndex: 17, statusIndex: 18 },
  { key: "10", label: "Outubro", valueIndex: 19, statusIndex: 20 },
  { key: "11", label: "Novembro", valueIndex: 21, statusIndex: 22 },
  { key: "12", label: "Dezembro", valueIndex: 23, statusIndex: 24 },
];
const remoteStateApiPath = "/api/state";
let saveSyncTimeout = null;
let saveSyncInFlight = false;
let saveSyncQueued = false;

const authState = {
  users: [],
  currentUser: null,
};
const knownUsers = ["andressa", "wellington"];
function sanitizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function getScopedStorageKey() {
  return authState.currentUser ? `${storageKey}:${authState.currentUser}` : storageKey;
}

function getRemoteUser() {
  return sanitizeUsername(authState.currentUser || "principal") || "principal";
}

function buildRemoteStateUrl() {
  const url = new URL(remoteStateApiPath, window.location.origin);
  url.searchParams.set("user", getRemoteUser());
  return url.toString();
}

async function pushStateToServer(snapshot) {
  const response = await fetch(buildRemoteStateUrl(), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: snapshot }),
  });
  if (!response.ok) {
    throw new Error(`Falha ao salvar no servidor: ${response.status}`);
  }
}

async function fetchRemoteState() {
  try {
    const response = await fetch(buildRemoteStateUrl(), { method: "GET" });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || typeof payload !== "object") return null;
    if (!payload.state || typeof payload.state !== "object") return null;
    return payload.state;
  } catch (error) {
    console.warn("Nao foi possivel carregar dados do servidor.", error);
    return null;
  }
}

function scheduleRemoteSave() {
  if (saveSyncTimeout) window.clearTimeout(saveSyncTimeout);
  saveSyncTimeout = window.setTimeout(async () => {
    if (saveSyncInFlight) {
      saveSyncQueued = true;
      return;
    }

    saveSyncInFlight = true;
    try {
      do {
        saveSyncQueued = false;
        await pushStateToServer(state);
      } while (saveSyncQueued);
    } catch (error) {
      console.warn("Nao foi possivel sincronizar no servidor.", error);
    } finally {
      saveSyncInFlight = false;
    }
  }, 250);
}

function loadUsers() {
  const raw = localStorage.getItem(usersKey);
  if (!raw) {
    authState.users = [];
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    authState.users = Array.isArray(parsed) ? parsed : [];
  } catch {
    authState.users = [];
  }
}

function setCurrentUser(username, remember = true) {
  authState.currentUser = sanitizeUsername(username);
  if (remember) {
    localStorage.setItem(sessionKey, authState.currentUser);
    sessionStorage.removeItem(sessionKey);
  } else {
    sessionStorage.setItem(sessionKey, authState.currentUser);
    localStorage.removeItem(sessionKey);
  }
}

function clearCurrentUser() {
  authState.currentUser = null;
  localStorage.removeItem(sessionKey);
  sessionStorage.removeItem(sessionKey);
  document.cookie = `${sessionKey}=; path=/; max-age=0; SameSite=Lax`;
}


function tryRestoreSession() {
  loadUsers();
  let cookieUser = "";
  const prefix = `${sessionKey}=`;
  for (const part of document.cookie.split(";")) {
    const item = part.trim();
    if (item.startsWith(prefix)) {
      cookieUser = decodeURIComponent(item.slice(prefix.length));
      break;
    }
  }
  const queryUser = sanitizeUsername(new URLSearchParams(window.location.search).get("user") || "");
  const savedUser = sanitizeUsername(localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey) || cookieUser || queryUser || "");
  if (!savedUser) return false;
  const user = getUser(savedUser);
  if (!user && !knownUsers.includes(savedUser)) return false;
  setCurrentUser(savedUser);
  if (queryUser) {
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, "", cleanUrl);
  }
  return true;
}

function toNumber(value) {
  return Number(value) || 0;
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function daysOverdue(dueDate) {
  if (typeof dueDate !== "string" || !dueDate) return 0;
  const due = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function sumBy(items) {
  return items.reduce((sum, item) => sum + toNumber(item.value), 0);
}

function confirmAction(message) {
  return window.confirm(message);
}

function createPerson(name, salary, includeInCombined = false) {
  return {
    id: uid("person"),
    name,
    salary: toNumber(salary),
    includeInCombined: Boolean(includeInCombined),
    extras: [],
    leisure: [],
    debts: [],
    investments: [],
  };
}

function findOrCreatePersonByName(name, salary = 0, includeInCombined = true) {
  const normalizedName = String(name || "").trim().toLowerCase();
  let person = state.people.find((item) => String(item.name || "").trim().toLowerCase() === normalizedName);
  if (person) return person;
  person = createPerson(name, salary, includeInCombined);
  state.people.push(person);
  return person;
}

function ensureBasePeopleSalaries() {
  const targets = [
    { name: "Wellington", salary: 8200 },
    { name: "Andressa", salary: 1200 },
  ];
  let changed = false;

  for (const target of targets) {
    const normalized = target.name.toLowerCase();
    let person = state.people.find((item) => String(item.name || "").trim().toLowerCase() === normalized);
    if (!person) {
      person = createPerson(target.name, target.salary, true);
      state.people.push(person);
      changed = true;
      continue;
    }
    if (toNumber(person.salary) !== target.salary) {
      person.salary = target.salary;
      changed = true;
    }
    if (!person.includeInCombined) {
      person.includeInCombined = true;
      changed = true;
    }
  }

  if (!state.activePersonId && state.people.length) {
    state.activePersonId = state.people[0].id;
    changed = true;
  }

  return changed;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseBrMoney(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const negative = raw.includes("(") && raw.includes(")");
  const normalized = raw.replace(/\./g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized) || 0;
  return negative ? -Math.abs(parsed) : parsed;
}

function detectCsvDelimiter(headerLine) {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsvLine(line, delimiter = ",") {
  const cols = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cols.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cols.push(current);
  return cols;
}

function shouldImportAsIncome(descriptionNormalized) {
  return descriptionNormalized.includes("salario") || descriptionNormalized === "extras";
}

async function applyFinanceiro2026Template(csvContent, yearInput) {
  const csv = String(csvContent || "").trim();
  if (!csv) {
    throw new Error("CSV vazio.");
  }
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("Planilha sem dados para importar.");
  }

  const delimiter = detectCsvDelimiter(lines[0]);
  const parsedYear = Number(yearInput);
  const year = Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100 ? parsedYear : new Date().getFullYear();
  const person = findOrCreatePersonByName(`Financeiro ${year}`, 0, true);
  person.debts = person.debts.filter((item) => item.source !== financeiroTemplateTag);
  person.extras = person.extras.filter((item) => item.source !== financeiroTemplateTag);

  const salaryByMonth = {};

  for (const line of lines.slice(1)) {
    const cols = parseCsvLine(line, delimiter);
    const description = String(cols[0] || "").trim();
    if (!description) continue;

    const descriptionNorm = normalizeText(description);
    if (descriptionNorm.startsWith("total")) continue;
    if (descriptionNorm === "wellington" || descriptionNorm === "santander") continue;

    for (const month of financeiroMonthMeta) {
      const value = parseBrMoney(cols[month.valueIndex]);
      if (value <= 0) continue;

      const status = normalizeText(cols[month.statusIndex]);
      const monthKey = `${year}-${month.key}`;

      if (shouldImportAsIncome(descriptionNorm)) {
        if (descriptionNorm.includes("salario")) {
          salaryByMonth[monthKey] = value;
        } else {
          person.extras.push({
            id: uid("extra"),
            description: `${description} (${month.label}/${year})`,
            value,
            month: monthKey,
            recurring: false,
            source: financeiroTemplateTag,
          });
        }
        continue;
      }

      person.debts.push({
        id: uid("debt"),
        name: description,
        value,
        dueDate: `${monthKey}-10`,
        paid: status === "pago" || status === "recebido",
        source: financeiroTemplateTag,
      });
    }
  }

  const currentMonth = getCurrentMonthKey();
  const salaryForCurrentMonth = toNumber(salaryByMonth[currentMonth]);
  const fallbackSalary = toNumber(Object.values(salaryByMonth)[0]);
  if (salaryForCurrentMonth || fallbackSalary) {
    person.salary = salaryForCurrentMonth || fallbackSalary;
  }

  state.activePersonId = person.id;
  state.debtScope = "active";
  state.debtFilter = "all";
  state.debtMonthFilter = "";
  state.capitalMonth = getCurrentMonthKey();
  state.appliedTemplates.financeiro2026 = true;
  save();
  render();
}

function normalizePerson(person, fallbackName = "Pessoa") {
  const source = person && typeof person === "object" ? person : {};
  const currentMonth = getCurrentMonthKey();
  let fixedSalary = toNumber(source.salary);
  if (!fixedSalary && source.salaries && typeof source.salaries === "object") {
    fixedSalary = toNumber(source.salaries[currentMonth]);
    if (!fixedSalary) {
      const firstSalary = Object.values(source.salaries)[0];
      fixedSalary = toNumber(firstSalary);
    }
  }

  return {
    id: source.id || uid("person"),
    name: String(source.name || fallbackName),
    salary: fixedSalary,
    includeInCombined: Boolean(source.includeInCombined),
    extras: Array.isArray(source.extras)
      ? source.extras.map((item) => ({
          ...item,
          id: item.id || uid("extra"),
          month: /^\d{4}-\d{2}$/.test(item.month) ? item.month : currentMonth,
          recurring: typeof item.recurring === "boolean" ? item.recurring : !/^\d{4}-\d{2}$/.test(item.month),
        }))
      : [],
    leisure: Array.isArray(source.leisure)
      ? source.leisure.map((item) => ({ ...item, id: item.id || uid("leisure") }))
      : [],
    debts: Array.isArray(source.debts)
      ? source.debts.map((debt) => ({
          ...debt,
          id: debt.id || uid("debt"),
          dueDate: typeof debt.dueDate === "string" ? debt.dueDate : "",
          paid: Boolean(debt.paid),
        }))
      : [],
    investments: Array.isArray(source.investments)
      ? source.investments.map((item) => ({
          ...item,
          id: item.id || uid("inv"),
          date: typeof item.date === "string" ? item.date : "",
          realized: Boolean(item.realized),
          type: item.type || "Renda fixa",
        }))
      : [],
  };
}

function getCurrentMonthLabel() {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getDashboardMonth() {
  return state.debtMonthFilter || getCurrentMonthKey();
}

function getActivePerson() {
  if (state.activePersonId === "__all__") {
    return state.people[0] || createPerson("Principal", 0, true);
  }

  let person = state.people.find((item) => item.id === state.activePersonId);
  if (person) return person;

  if (!state.people.length) {
    const base = createPerson("Principal", 0, true);
    state.people.push(base);
    state.activePersonId = base.id;
    save();
    return base;
  }

  person = state.people[0];
  state.activePersonId = person.id;
  return person;
}

function getPersonSalary(person) {
  return toNumber(person.salary);
}

function setPersonSalary(person, value) {
  person.salary = toNumber(value);
}

function getCombinedSalaryInfo() {
  const markedPeople = state.people.filter((person) => person.includeInCombined);
  return {
    total: markedPeople.reduce((sum, person) => sum + getPersonSalary(person), 0),
    count: markedPeople.length,
  };
}

function getEffectiveSalary(person) {
  if (state.activePersonId === "__all__") {
    return state.people.reduce((sum, item) => sum + getPersonSalary(item), 0);
  }
  const combinedInfo = getCombinedSalaryInfo();
  if (state.useCombinedSalaries && combinedInfo.count > 0) return combinedInfo.total;
  return getPersonSalary(person);
}

function applyLoadedState(data) {
  state.people = Array.isArray(data.people) ? data.people.map((person) => normalizePerson(person)) : [];
  state.activePersonId = data.activePersonId || null;
  state.debtScope = ["active", "all"].includes(data.debtScope) ? data.debtScope : "active";
  state.debtFilter = ["all", "open", "overdue", "paid"].includes(data.debtFilter) ? data.debtFilter : "all";
  state.debtMonthFilter = /^\d{4}-\d{2}$/.test(data.debtMonthFilter) ? data.debtMonthFilter : "";
  state.investmentScope = ["active", "all"].includes(data.investmentScope) ? data.investmentScope : "active";
  state.currentView = ["dashboard", "accounts", "people", "investments"].includes(data.currentView) ? data.currentView : "dashboard";
  state.useCombinedSalaries = Boolean(data.useCombinedSalaries);
  state.capitalMonth = /^\d{4}-\d{2}$/.test(data.capitalMonth) ? data.capitalMonth : getCurrentMonthKey();
  state.darkMode = Boolean(data.darkMode);
  state.appliedTemplates = {
    financeiro2026: Boolean(data.appliedTemplates && data.appliedTemplates.financeiro2026),
  };
}

function save() {
  localStorage.setItem(getScopedStorageKey(), JSON.stringify(state));
  scheduleRemoteSave();
}

function load() {
  const saved = localStorage.getItem(getScopedStorageKey());
  if (saved) {
    try {
      const data = JSON.parse(saved);
      applyLoadedState(data);
      if (ensureBasePeopleSalaries()) save();
      return;
    } catch {
      // Ignora localStorage inválido
    }
  }

  const legacy = localStorage.getItem(`${legacyKey}:${authState.currentUser}`) || localStorage.getItem(legacyKey);
  if (legacy) {
    try {
      const data = JSON.parse(legacy);
      const migrated = normalizePerson(
        {
          name: "Principal",
          salary: data.salary,
          includeInCombined: true,
          extras: data.extras,
          leisure: data.leisure,
          debts: data.debts,
        },
        "Principal"
      );
      state.people = [migrated];
      state.activePersonId = migrated.id;
      state.capitalMonth = getCurrentMonthKey();
      ensureBasePeopleSalaries();
      save();
      return;
    } catch {
      // segue para padrão
    }
  }

  state.people = [];
  state.activePersonId = null;
  state.capitalMonth = getCurrentMonthKey();
  state.darkMode = false;
  state.appliedTemplates = { financeiro2026: false };
  ensureBasePeopleSalaries();
  save();
}

function setView(view) {
  state.currentView = view;
  save();
  render();
}

function renderView() {
  const dashboard = document.getElementById("view-dashboard");
  const accounts = document.getElementById("view-accounts");
  const people = document.getElementById("view-people");
  const investments = document.getElementById("view-investments");
  const navDashboard = document.getElementById("nav-dashboard");
  const navAccounts = document.getElementById("nav-accounts");
  const navPeople = document.getElementById("nav-people");
  const navInvestments = document.getElementById("nav-investments");

  dashboard.classList.toggle("hidden", state.currentView !== "dashboard");
  accounts.classList.toggle("hidden", state.currentView !== "accounts");
  people.classList.toggle("hidden", state.currentView !== "people");
  investments.classList.toggle("hidden", state.currentView !== "investments");
  navDashboard.classList.toggle("active", state.currentView === "dashboard");
  navAccounts.classList.toggle("active", state.currentView === "accounts");
  navPeople.classList.toggle("active", state.currentView === "people");
  navInvestments.classList.toggle("active", state.currentView === "investments");
}

function renderPeopleSelector() {
  const select = document.getElementById("active-person-select");
  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "__all__";
  allOption.textContent = "Todos";
  select.appendChild(allOption);

  for (const person of state.people) {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = person.name;
    select.appendChild(option);
  }

  const active = getActivePerson();
  select.value = state.activePersonId === "__all__" ? "__all__" : active.id;
}

function renderOwnerSelect(selectId, selectedId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = "";
  for (const person of state.people) {
    const option = document.createElement("option");
    option.value = person.id;
    option.textContent = person.name;
    select.appendChild(option);
  }
  if (selectedId) select.value = selectedId;
}

function renderPeopleList() {
  const list = document.getElementById("people-list");
  list.innerHTML = "";

  for (const person of state.people) {
    const salary = getPersonSalary(person);
    const li = document.createElement("li");
    li.className = "list-row";
    li.innerHTML = `
      <div>
        <strong>${person.name}</strong>
        <div class="list-meta">Salário fixo: ${money.format(salary)} | Soma conjunta: ${person.includeInCombined ? "Sim" : "Não"}</div>
      </div>
      <div class="actions">
        <button class="secondary" type="button" data-action="toggle-include-combined" data-id="${person.id}">
          ${person.includeInCombined ? "Remover da soma" : "Somar no painel"}
        </button>
        <button class="secondary" type="button" data-action="select-person" data-id="${person.id}">Selecionar</button>
        <button class="danger" type="button" data-action="delete-person" data-id="${person.id}">Excluir</button>
      </div>
    `;
    list.appendChild(li);
  }

  document.getElementById("people-count").textContent = `${state.people.length} pessoa(s) cadastrada(s)`;
}

function renderSimpleList(listId, items, actionPrefix, allowDelete = true) {
  const list = document.getElementById(listId);
  list.innerHTML = "";

  for (const item of items) {
    const li = document.createElement("li");
    li.className = "list-row";
    li.innerHTML = allowDelete
      ? `<span>${item.description}: ${money.format(toNumber(item.value))}</span>
         <button class="danger" type="button" data-action="delete-${actionPrefix}" data-id="${item.id}">Excluir</button>`
      : `<span>${item.description}: ${money.format(toNumber(item.value))}</span>`;
    list.appendChild(li);
  }
}

function renderExtras(person, month) {
  const monthExtras = person.extras.filter((item) => item.month === month || item.recurring);
  renderSimpleList("extra-list", monthExtras, "extra", false);
  const total = sumBy(monthExtras);
  document.getElementById("extra-total").textContent = money.format(total);
  return total;
}

function renderCapitalExtras(person, month) {
  const monthExtras = person.extras.filter((item) => item.month === month || item.recurring);
  const mapped = monthExtras.map((item) => ({
    ...item,
    description: item.recurring ? `${item.description} (Recorrente)` : `${item.description} (${item.month})`,
  }));
  renderSimpleList("capital-extra-list", mapped, "capital-extra", true);
}

function renderLeisure(person) {
  renderSimpleList("leisure-list", person.leisure, "leisure", true);
  const total = sumBy(person.leisure);
  document.getElementById("leisure-total").textContent = money.format(total);
  return total;
}

function getDebtStatus(debt) {
  if (debt.paid) return { label: "Paga", css: "paid", overdueDays: 0 };
  const overdueDays = daysOverdue(debt.dueDate);
  if (overdueDays > 0) return { label: "Atrasada", css: "overdue", overdueDays };
  return { label: "Em aberto", css: "open", overdueDays: 0 };
}

function matchesDebtFilter(status, filter) {
  if (filter === "all") return true;
  if (filter === "paid") return status.label === "Paga";
  if (filter === "overdue") return status.label === "Atrasada";
  if (filter === "open") return status.label === "Em aberto";
  return true;
}

function matchesDebtMonthFilter(dueDate, monthFilter) {
  if (!monthFilter) return true;
  if (typeof dueDate !== "string") return false;
  return dueDate.startsWith(monthFilter);
}

function buildTestDebts() {
  const year = new Date().getFullYear();
  return [
    { id: uid("debt"), name: "Cartao Nubank", value: 620.45, dueDate: `${year}-01-10`, paid: true },
    { id: uid("debt"), name: "Financiamento Moto", value: 480.0, dueDate: `${year}-02-12`, paid: false },
    { id: uid("debt"), name: "Internet", value: 119.9, dueDate: `${year}-03-15`, paid: false },
    { id: uid("debt"), name: "Academia", value: 95.0, dueDate: `${year}-05-08`, paid: true },
    { id: uid("debt"), name: "Emprestimo Banco", value: 750.0, dueDate: `${year}-08-20`, paid: false },
    { id: uid("debt"), name: "Condominio", value: 320.0, dueDate: `${year}-11-05`, paid: false },
  ];
}

function getDebtEntries() {
  if (state.debtScope === "all") {
    const all = [];
    for (const person of state.people) {
      for (const debt of person.debts) {
        all.push({ ownerId: person.id, ownerName: person.name, debt });
      }
    }
    return all;
  }

  const person = getActivePerson();
  return person.debts.map((debt) => ({ ownerId: person.id, ownerName: person.name, debt }));
}

function renderDebts() {
  const tbodyDashboard = document.getElementById("debt-list-dashboard");
  const tbodyAccounts = document.getElementById("debt-list-accounts");
  tbodyDashboard.innerHTML = "";
  tbodyAccounts.innerHTML = "";

  const monthBase = state.debtMonthFilter || getDashboardMonth();
  let total = 0;
  let totalMonth = 0;
  let paidTotal = 0;
  let overdueTotal = 0;
  let openTotal = 0;

  for (const entry of getDebtEntries()) {
    const { ownerId, ownerName, debt } = entry;
    const value = toNumber(debt.value);
    total += value;
    const isInMonthBase = matchesDebtMonthFilter(debt.dueDate, monthBase);
    if (isInMonthBase) totalMonth += value;

    const status = getDebtStatus(debt);
    if (isInMonthBase && status.label === "Paga") paidTotal += value;
    if (isInMonthBase && status.label === "Atrasada") overdueTotal += value;
    if (isInMonthBase && (status.label === "Em aberto" || status.label === "Atrasada")) openTotal += value;
    const due = new Date(`${debt.dueDate}T00:00:00`);
    const dueDate = Number.isNaN(due.getTime()) ? "-" : due.toLocaleDateString("pt-BR");

    const trAccounts = document.createElement("tr");
    trAccounts.innerHTML = `
      <td>${ownerName}</td>
      <td>${debt.name}</td>
      <td>${money.format(value)}</td>
      <td>${dueDate}</td>
      <td>${status.overdueDays}</td>
      <td class="status ${status.css}">${status.label}</td>
      <td>
        <div class="actions">
          <button class="secondary" data-action="edit-debt" data-owner-id="${ownerId}" data-id="${debt.id}" type="button">
            Editar
          </button>
          <button class="secondary" data-action="toggle-paid" data-owner-id="${ownerId}" data-id="${debt.id}" type="button">
            ${debt.paid ? "Desmarcar" : "Marcar paga"}
          </button>
          <button class="danger" data-action="delete-debt" data-owner-id="${ownerId}" data-id="${debt.id}" type="button">Excluir</button>
        </div>
      </td>
    `;
    tbodyAccounts.appendChild(trAccounts);

    if (!matchesDebtFilter(status, state.debtFilter)) continue;
    if (!matchesDebtMonthFilter(debt.dueDate, state.debtMonthFilter)) continue;

    const trDashboard = document.createElement("tr");
    trDashboard.innerHTML = `
      <td>${ownerName}</td>
      <td>${debt.name}</td>
      <td>${money.format(value)}</td>
      <td>${dueDate}</td>
      <td>${status.overdueDays}</td>
      <td class="status ${status.css}">${status.label}</td>
      <td>
        <div class="actions">
          <button class="secondary" data-action="toggle-paid" data-owner-id="${ownerId}" data-id="${debt.id}" type="button">
            ${debt.paid ? "Desmarcar" : "Marcar paga"}
          </button>
          <button class="danger" data-action="delete-debt" data-owner-id="${ownerId}" data-id="${debt.id}" type="button">Excluir</button>
        </div>
      </td>
    `;
    tbodyDashboard.appendChild(trDashboard);
  }

  document.getElementById("debt-total-month").textContent = money.format(totalMonth);
  document.getElementById("debt-total").textContent = money.format(total);
  document.getElementById("debt-paid-total").textContent = money.format(paidTotal);
  document.getElementById("debt-overdue-total").textContent = money.format(overdueTotal);
  document.getElementById("debt-open-total").textContent = money.format(openTotal);

  return { total, paidTotal };
}

function getInvestmentEntries() {
  if (state.investmentScope === "all") {
    const all = [];
    for (const person of state.people) {
      for (const investment of person.investments) {
        all.push({ ownerId: person.id, ownerName: person.name, investment });
      }
    }
    return all;
  }
  const person = getActivePerson();
  return person.investments.map((investment) => ({ ownerId: person.id, ownerName: person.name, investment }));
}

function renderInvestments() {
  const tbody = document.getElementById("investment-list");
  tbody.innerHTML = "";
  let total = 0;
  let activeTotal = 0;

  for (const entry of getInvestmentEntries()) {
    const { ownerId, ownerName, investment } = entry;
    const value = toNumber(investment.value);
    total += value;
    if (!investment.realized) activeTotal += value;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${ownerName}</td>
      <td>${investment.name}</td>
      <td>${investment.type}</td>
      <td>${money.format(value)}</td>
      <td>${new Date(`${investment.date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
      <td class="status ${investment.realized ? "paid" : "open"}">${investment.realized ? "Resgatado" : "Ativo"}</td>
      <td>
        <div class="actions">
          <button class="secondary" data-action="toggle-investment" data-owner-id="${ownerId}" data-id="${investment.id}" type="button">
            ${investment.realized ? "Reabrir" : "Marcar resgatado"}
          </button>
          <button class="danger" data-action="delete-investment" data-owner-id="${ownerId}" data-id="${investment.id}" type="button">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  }

  document.getElementById("investment-total").textContent = money.format(total);
  document.getElementById("investment-active-total").textContent = money.format(activeTotal);
}

function renderSummary(person, extraTotal, leisureTotal, debtStats) {
  const salaryBase = getEffectiveSalary(person);
  const incomeTotal = salaryBase;
  const incomeTotalMonth = salaryBase + extraTotal;
  const paidOutTotal = debtStats.paidTotal + leisureTotal;
  const balanceTotal = incomeTotalMonth - paidOutTotal;

  document.getElementById("income-total").textContent = money.format(incomeTotal);
  document.getElementById("income-total-month").textContent = money.format(incomeTotalMonth);
  document.getElementById("paid-out-total").textContent = money.format(paidOutTotal);
  document.getElementById("balance-total").textContent = money.format(balanceTotal);
}

function renderMonthLabels() {
  const monthLabel = getCurrentMonthLabel();
  document.getElementById("current-month-badge").textContent = `Painel de ${monthLabel}`;
  document.getElementById("dashboard-month-label").textContent = `Dashboard - ${monthLabel}`;
}

function renderCapitalControls(person) {
  const personSelect = document.getElementById("capital-person-select");
  personSelect.innerHTML = "";

  for (const item of state.people) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    personSelect.appendChild(option);
  }

  personSelect.value = person.id;
  document.getElementById("capital-month").value = state.capitalMonth;
  document.getElementById("capital-salary-input").value = getPersonSalary(person) || "";
  renderCapitalExtras(person, state.capitalMonth);
}

function render() {
  const userLabel = document.getElementById("auth-user-label");
  if (userLabel) userLabel.textContent = authState.currentUser ? `Usuário: ${authState.currentUser}` : "";
  renderView();
  renderMonthLabels();
  document.body.classList.toggle("dark-mode", state.darkMode);
  document.getElementById("theme-toggle").checked = state.darkMode;

  const person = getActivePerson();
  const dashboardMonth = getDashboardMonth();
  const combinedInfo = getCombinedSalaryInfo();
  const selectedLabel = state.activePersonId === "__all__" ? "Todos" : person.name;

  renderPeopleSelector();
  renderOwnerSelect("debt-owner-select", person.id);
  renderOwnerSelect("investment-owner-select", person.id);
  renderPeopleList();
  renderCapitalControls(person);

  document.getElementById("debt-scope").value = state.debtScope;
  document.getElementById("use-all-debts").checked = state.debtScope === "all";
  document.getElementById("debt-filter").value = state.debtFilter;
  document.getElementById("debt-month-filter").value = state.debtMonthFilter;
  document.getElementById("investment-scope").value = state.investmentScope;
  document.getElementById("use-combined-salaries").checked = state.useCombinedSalaries;

  document.getElementById("combined-mode-note").textContent = state.useCombinedSalaries
    ? combinedInfo.count > 0
      ? `Modo combinado ativo (${dashboardMonth}): ${combinedInfo.count} pessoa(s), total ${money.format(combinedInfo.total)}`
      : `Modo combinado ativo sem pessoas marcadas. Usando salário individual de ${person.name}.`
    : `Modo individual ativo (${dashboardMonth}): salário de ${selectedLabel}`;
  const debtModeNote = state.debtScope === "all"
    ? "Dívidas em modo consolidado (todas as pessoas)."
    : "Dívidas em modo separado (pessoa selecionada).";
  document.getElementById("combined-mode-note").textContent += ` | ${debtModeNote}`;

  const extraTotal = renderExtras(person, dashboardMonth);
  const leisureTotal = renderLeisure(person);
  const debtStats = renderDebts();
  renderSummary(person, extraTotal, leisureTotal, debtStats);
  renderInvestments();
}

function handleDebtAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const ownerId = button.dataset.ownerId || state.activePersonId;
  const person = state.people.find((item) => item.id === ownerId);
  if (!person) return;
  const debtId = button.dataset.id;
  const action = button.dataset.action;
  const debt = person.debts.find((item) => item.id === debtId);
  if (!debt) return;

  if (action === "edit-debt") {
    const name = window.prompt("Nome da dívida:", debt.name);
    if (name === null) return;
    const valueRaw = window.prompt("Valor da dívida (ex: 1250.90):", String(debt.value ?? ""));
    if (valueRaw === null) return;
    const dueDate = window.prompt("Data de vencimento (AAAA-MM-DD):", debt.dueDate || "");
    if (dueDate === null) return;

    const parsedValue = toNumber(String(valueRaw).replace(",", "."));
    const trimmedName = String(name).trim();
    const trimmedDate = String(dueDate).trim();
    if (!trimmedName || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      window.alert("Dados inválidos. Use nome preenchido e data no formato AAAA-MM-DD.");
      return;
    }

    debt.name = trimmedName;
    debt.value = parsedValue;
    debt.dueDate = trimmedDate;
  }

  if (action === "toggle-paid") {
    debt.paid = !debt.paid;
  }

  if (action === "delete-debt") {
    if (!confirmAction("Deseja excluir esta dívida?")) return;
    person.debts = person.debts.filter((item) => item.id !== debtId);
  }

  save();
  render();
}

function setupEvents() {
  document.getElementById("logout-btn").addEventListener("click", () => {
    clearCurrentUser();
    window.location.assign("index.html");
  });

  document.getElementById("theme-toggle").addEventListener("change", (event) => {
    state.darkMode = event.target.checked;
    save();
    render();
  });

  document.getElementById("nav-dashboard").addEventListener("click", () => setView("dashboard"));
  document.getElementById("nav-accounts").addEventListener("click", () => setView("accounts"));
  document.getElementById("nav-people").addEventListener("click", () => setView("people"));
  document.getElementById("nav-investments").addEventListener("click", () => setView("investments"));
  document.getElementById("go-people").addEventListener("click", () => setView("people"));
  document.getElementById("go-accounts").addEventListener("click", () => setView("accounts"));

  document.getElementById("active-person-select").addEventListener("change", (event) => {
    state.activePersonId = event.target.value;
    save();
    render();
  });

  document.getElementById("use-combined-salaries").addEventListener("change", (event) => {
    state.useCombinedSalaries = event.target.checked;
    save();
    render();
  });

  document.getElementById("use-all-debts").addEventListener("change", (event) => {
    state.debtScope = event.target.checked ? "all" : "active";
    save();
    render();
  });

  document.getElementById("person-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("person-name").value.trim();
    const salary = toNumber(document.getElementById("person-salary").value);
    const includeInCombined = document.getElementById("person-include-combined").checked;
    if (!name) return;

    const person = createPerson(name, salary, includeInCombined);
    state.people.push(person);
    state.activePersonId = person.id;
    save();
    render();
    event.target.reset();
  });

  document.getElementById("people-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const personId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "select-person") {
      state.activePersonId = personId;
      state.currentView = "dashboard";
      save();
      render();
      return;
    }

    if (action === "delete-person") {
      if (state.people.length === 1) {
        window.alert("Você precisa manter pelo menos uma pessoa cadastrada.");
        return;
      }
      if (!confirmAction("Deseja excluir esta pessoa e todos os dados dela?")) return;

      state.people = state.people.filter((item) => item.id !== personId);
      if (state.activePersonId === personId) state.activePersonId = state.people[0]?.id || null;
      save();
      render();
      return;
    }

    if (action === "toggle-include-combined") {
      const person = state.people.find((item) => item.id === personId);
      if (!person) return;
      person.includeInCombined = !person.includeInCombined;
      save();
      render();
    }
  });

  document.getElementById("capital-person-select").addEventListener("change", (event) => {
    state.activePersonId = event.target.value;
    save();
    render();
  });

  document.getElementById("capital-month").addEventListener("change", (event) => {
    state.capitalMonth = event.target.value || getCurrentMonthKey();
    save();
    render();
  });

  document.getElementById("capital-salary-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const person = getActivePerson();
    const value = toNumber(document.getElementById("capital-salary-input").value);
    setPersonSalary(person, value);
    save();
    render();
  });

  document.getElementById("capital-extra-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const person = getActivePerson();
    const description = document.getElementById("capital-extra-desc").value.trim();
    const value = toNumber(document.getElementById("capital-extra-value").value);
    const recurring = document.getElementById("capital-extra-recurring").checked;
    if (!description) return;

    person.extras.push({ id: uid("extra"), description, value, month: state.capitalMonth, recurring });
    save();
    render();
    event.target.reset();
  });

  document.getElementById("clear-capital-extras").addEventListener("click", () => {
    const person = getActivePerson();
    const hasMonthExtra = person.extras.some((item) => item.month === state.capitalMonth);
    if (!hasMonthExtra) return;
    if (!confirmAction(`Deseja limpar toda a renda extra de ${state.capitalMonth}?`)) return;

    person.extras = person.extras.filter((item) => item.month !== state.capitalMonth);
    save();
    render();
  });

  document.getElementById("capital-extra-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='delete-capital-extra']");
    if (!button) return;
    if (!confirmAction("Deseja excluir esta renda extra?")) return;

    const person = getActivePerson();
    person.extras = person.extras.filter((item) => item.id !== button.dataset.id);
    save();
    render();
  });

  document.getElementById("leisure-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const person = getActivePerson();
    const description = document.getElementById("leisure-desc").value.trim();
    const value = toNumber(document.getElementById("leisure-value").value);
    if (!description) return;

    person.leisure.push({ id: uid("leisure"), description, value });
    save();
    render();
    event.target.reset();
  });

  document.getElementById("debt-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const ownerId = document.getElementById("debt-owner-select").value || state.activePersonId;
    const person = state.people.find((item) => item.id === ownerId);
    if (!person) return;
    const name = document.getElementById("debt-name").value.trim();
    const value = toNumber(document.getElementById("debt-value").value);
    const dueDate = document.getElementById("debt-due").value;
    if (!name || !dueDate) return;

    person.debts.push({ id: uid("debt"), name, value, dueDate, paid: false });
    save();
    render();
    event.target.reset();
  });

  document.getElementById("leisure-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='delete-leisure']");
    if (!button) return;
    if (!confirmAction("Deseja excluir este item de lazer?")) return;

    const person = getActivePerson();
    person.leisure = person.leisure.filter((item) => item.id !== button.dataset.id);
    save();
    render();
  });

  document.getElementById("debt-list-dashboard").addEventListener("click", handleDebtAction);
  document.getElementById("debt-list-accounts").addEventListener("click", handleDebtAction);

  document.getElementById("debt-filter").addEventListener("change", (event) => {
    state.debtFilter = event.target.value;
    save();
    render();
  });

  document.getElementById("debt-scope").addEventListener("change", (event) => {
    state.debtScope = event.target.value;
    save();
    render();
  });

  document.getElementById("debt-month-filter").addEventListener("change", (event) => {
    state.debtMonthFilter = event.target.value;
    save();
    render();
  });

  document.getElementById("clear-debt-filters").addEventListener("click", () => {
    state.debtFilter = "all";
    state.debtMonthFilter = "";
    save();
    render();
  });

  document.getElementById("clear-leisure").addEventListener("click", () => {
    const person = getActivePerson();
    if (!person.leisure.length) return;
    if (!confirmAction("Deseja limpar todos os gastos de lazer?")) return;
    person.leisure = [];
    save();
    render();
  });

  document.getElementById("clear-debts").addEventListener("click", () => {
    if (state.debtScope === "all") {
      const hasDebts = state.people.some((person) => person.debts.length);
      if (!hasDebts) return;
      if (!confirmAction("Deseja limpar todas as dívidas de todas as pessoas?")) return;
      for (const person of state.people) person.debts = [];
    } else {
      const person = getActivePerson();
      if (!person.debts.length) return;
      if (!confirmAction("Deseja limpar todas as dívidas da pessoa selecionada?")) return;
      person.debts = [];
    }
    save();
    render();
  });

  document.getElementById("add-test-debts").addEventListener("click", () => {
    const person = getActivePerson();
    if (person.debts.length && !confirmAction("Adicionar dívidas de teste sem apagar as atuais?")) return;
    person.debts = [...person.debts, ...buildTestDebts()];
    save();
    render();
  });

  const csvInput = document.getElementById("financeiro-csv-input");
  const csvYearInput = document.getElementById("financeiro-csv-year");
  const applyCsvButton = document.getElementById("apply-financeiro-csv");
  const csvStatus = document.getElementById("financeiro-csv-status");
  if (!csvInput) return;
  if (csvYearInput && !csvYearInput.value) csvYearInput.value = String(new Date().getFullYear());
  if (!applyCsvButton) return;

  applyCsvButton.addEventListener("click", async () => {
    const file = csvInput.files && csvInput.files[0];
    if (!file) {
      if (csvStatus) csvStatus.textContent = "Selecione um CSV para importar.";
      window.alert("Selecione um arquivo CSV antes de aplicar.");
      return;
    }

    const yearRaw = csvYearInput && csvYearInput.value ? csvYearInput.value : String(new Date().getFullYear());
    const alreadyApplied = state.appliedTemplates.financeiro2026;
    if (alreadyApplied && !confirmAction("Ja existe uma importacao anterior. Deseja substituir os dados importados deste ano?")) return;

    try {
      if (csvStatus) csvStatus.textContent = "Importando CSV...";
      const csvText = await file.text();
      await applyFinanceiro2026Template(csvText, yearRaw);
      if (csvStatus) csvStatus.textContent = "Importacao concluida com sucesso.";
      window.alert("CSV importado e salvo com sucesso.");
      csvInput.value = "";
    } catch (error) {
      console.error(error);
      if (csvStatus) csvStatus.textContent = "Falha ao importar CSV.";
      window.alert("Nao foi possivel importar esse CSV. Verifique o formato da planilha.");
    }
  });

  document.getElementById("investment-scope").addEventListener("change", (event) => {
    state.investmentScope = event.target.value;
    save();
    render();
  });

  document.getElementById("investment-owner-select").addEventListener("change", (event) => {
    state.activePersonId = event.target.value;
    save();
    render();
  });

  document.getElementById("investment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const ownerId = document.getElementById("investment-owner-select").value || state.activePersonId;
    const person = state.people.find((item) => item.id === ownerId);
    if (!person) return;

    const name = document.getElementById("investment-name").value.trim();
    const type = document.getElementById("investment-type").value;
    const value = toNumber(document.getElementById("investment-value").value);
    const date = document.getElementById("investment-date").value;
    if (!name || !date) return;

    person.investments.push({ id: uid("inv"), name, type, value, date, realized: false });
    save();
    render();
    event.target.reset();
  });

  document.getElementById("investment-list").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const ownerId = button.dataset.ownerId;
    const person = state.people.find((item) => item.id === ownerId);
    if (!person) return;
    const itemId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "toggle-investment") {
      const investment = person.investments.find((item) => item.id === itemId);
      if (!investment) return;
      investment.realized = !investment.realized;
    }

    if (action === "delete-investment") {
      if (!confirmAction("Deseja excluir este investimento?")) return;
      person.investments = person.investments.filter((item) => item.id !== itemId);
    }

    save();
    render();
  });
}

async function bootstrap() {
  try {
    const queryUser = sanitizeUsername(new URLSearchParams(window.location.search).get("user") || "");
    const rememberedUser = sanitizeUsername(localStorage.getItem(sessionKey) || sessionStorage.getItem(sessionKey) || "");
    authState.currentUser = queryUser || rememberedUser || "principal";
    setupEvents();
    load();
    render();

    const remoteState = await fetchRemoteState();
    if (remoteState) {
      applyLoadedState(remoteState);
      ensureBasePeopleSalaries();
      localStorage.setItem(getScopedStorageKey(), JSON.stringify(state));
      render();
    } else {
      scheduleRemoteSave();
    }
  } catch (error) {
    console.error("Falha ao abrir dashboard. Reiniciando estado local.", error);
    localStorage.removeItem(getScopedStorageKey());
    localStorage.removeItem(legacyKey);
    authState.currentUser = "principal";
    load();
    render();
  }
}

bootstrap();

