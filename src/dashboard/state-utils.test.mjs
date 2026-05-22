import test from "node:test";
import assert from "node:assert/strict";
import {
  addCapitalItem,
  addDebtItem,
  addEntryItem,
  addInvestmentItem,
  addLeisureItem,
  addPersonItem,
  addRecurringBillItem,
  applyComputedDebtStatuses,
  clearFinancialData,
  clearCapitalItems,
  clearLeisureItems,
  completeInitialSetup,
  createDefaultDashboardState,
  generateRecurringDebtsForMonth,
  getMonthExtraIncome,
  normalizeDashboardState,
  removeDebtItem,
  removeEntryItem,
  removeInvestmentItem,
  removePersonItem,
  removeRecurringBillItem,
  setPersonExtraIncome,
  updateDebtItem,
  updateEntryItem,
  updatePersonItem,
  updateRecurringBillItem,
} from "./state-utils.mjs";

test("entry CRUD keeps state immutable", () => {
  const previous = createDefaultDashboardState();
  const personId = previous.people[0].id;
  const added = addEntryItem(
    previous,
    { personId, label: "Freela", category: "Freelance", month: "2026-04", value: 350 },
    () => "entry-test"
  );

  assert.equal(previous.entries.length, 0);
  assert.equal(added.entries.length, 1);
  assert.equal(added.entries.at(-1).label, "Freela");

  const updated = updateEntryItem(added, { id: "entry-test", label: "Freela revisado", value: 450 });
  assert.equal(updated.entries.find((item) => item.id === "entry-test")?.label, "Freela revisado");
  assert.equal(updated.entries.find((item) => item.id === "entry-test")?.value, 450);

  const removed = removeEntryItem(updated, "entry-test");
  assert.equal(removed.entries.length, previous.entries.length);
  assert.notEqual(previous, added);
});

test("clearLeisureItems removes all leisure rows", () => {
  const previous = createDefaultDashboardState();
  const withLeisure = addLeisureItem(
    previous,
    { personId: previous.people[0].id, label: "Cinema", category: "Lazer", month: "2026-04", value: 50 },
    () => "leisure-clear-test"
  );
  const next = clearLeisureItems(withLeisure);

  assert.equal(next.leisureRows.length, 0);
  assert.equal(withLeisure.leisureRows.length, 1);
});

test("addLeisureItem adds a row immutably", () => {
  const previous = createDefaultDashboardState();
  const next = addLeisureItem(
    previous,
    { personId: previous.people[0].id, label: "Cinema", category: "Lazer", month: "2026-04", value: 50 },
    () => "leisure-test"
  );

  assert.equal(next.leisureRows.length, 1);
  assert.equal(next.leisureRows.at(-1).label, "Cinema");
});

test("debt add, update and remove work with normalized ids", () => {
  const previous = createDefaultDashboardState();
  const personId = previous.people[0].id;
  const added = addDebtItem(
    previous,
    {
      personId,
      name: "Conta teste",
      category: "Casa",
      value: 200,
      dueDate: "2026-04-20",
      month: "2026-04",
      status: "open",
    },
    () => "debt-test"
  );

  assert.equal(added.debtRows.length, previous.debtRows.length + 1);

  const updated = updateDebtItem(added, { id: "debt-test", status: "paid", value: 210 });
  assert.equal(updated.debtRows.find((item) => item.id === "debt-test")?.status, "paid");
  assert.equal(updated.debtRows.find((item) => item.id === "debt-test")?.value, 210);

  const removed = removeDebtItem(updated, "debt-test");
  assert.equal(removed.debtRows.length, previous.debtRows.length);
});

test("people support add, update, extra income by month and removal", () => {
  const previous = createDefaultDashboardState();
  const added = addPersonItem(previous, { name: "Marina", fixedSalary: 3200 }, () => "person-marina");
  const marina = added.people.find((item) => item.id === "person-marina");

  assert.equal(Boolean(marina), true);
  assert.equal(marina?.fixedSalary, 3200);

  const updated = updatePersonItem(added, { id: "person-marina", name: "Marina Silva", fixedSalary: 3500 });
  const updatedPerson = updated.people.find((item) => item.id === "person-marina");
  assert.equal(updatedPerson?.name, "Marina Silva");
  assert.equal(updatedPerson?.fixedSalary, 3500);

  const withExtra = setPersonExtraIncome(updated, { personId: "person-marina", month: "2026-05", value: 480 });
  assert.equal(getMonthExtraIncome(withExtra.people.find((item) => item.id === "person-marina"), "2026-05"), 480);

  const removed = removePersonItem(withExtra, "person-marina");
  assert.equal(removed.people.some((item) => item.id === "person-marina"), false);
});

test("capital and investment mutations stay immutable", () => {
  const previous = createDefaultDashboardState();
  const personId = previous.people[0].id;
  const withCapital = addCapitalItem(
    previous,
    { personId, label: "Reserva", note: "Teste", category: "Reserva", month: "2026-04", value: 400 },
    () => "capital-test"
  );
  const clearedCapital = clearCapitalItems(withCapital);
  const withInvestment = addInvestmentItem(
    previous,
    {
      personId,
      name: "Tesouro IPCA",
      category: "Renda fixa",
      month: "2026-04",
      value: 500,
      yield: "+1,00%",
    },
    () => "investment-test"
  );
  const removedInvestment = removeInvestmentItem(withInvestment, "investment-test");

  assert.equal(withCapital.capitalItems.length, previous.capitalItems.length + 1);
  assert.equal(clearedCapital.capitalItems.length, 0);
  assert.equal(withInvestment.investmentItems.length, previous.investmentItems.length + 1);
  assert.equal(removedInvestment.investmentItems.length, previous.investmentItems.length);
});

test("normalizeDashboardState protects against invalid snapshots and migrates legacy people", () => {
  const normalized = normalizeDashboardState({
    people: [null, " ", "Joao", "joao"],
    selectedPerson: "Pessoa inexistente",
    sumSalaries: "yes",
    consolidateDebts: null,
    entries: [{ label: "", value: 12 }, { label: "Extra", value: 99 }],
    debtRows: [{ person: "Joao", name: "Conta", value: 50, dueDate: "20/04/2026", status: "late" }],
  });

  assert.equal(normalized.people.length, 1);
  assert.equal(normalized.people[0].name, "Joao");
  assert.equal(normalized.selectedPersonId, normalized.people[0].id);
  assert.equal(normalized.preferences.includeFixedSalary, true);
  assert.equal(normalized.entries.length, 1);
  assert.equal(normalized.entries[0].label, "Extra");
  assert.equal(normalized.debtRows[0].personId, normalized.people[0].id);
});

test("debt status is computed from due date when not paid", () => {
  const previous = createDefaultDashboardState();
  const added = addDebtItem(
    previous,
    { personId: previous.people[0].id, name: "Conta antiga", value: 100, dueDate: "2026-01-01", status: "open" },
    () => "late-test"
  );
  const refreshed = applyComputedDebtStatuses(added, new Date("2026-05-22T12:00:00.000Z"));
  assert.equal(refreshed.debtRows.find((row) => row.id === "late-test")?.status, "late");

  const paid = updateDebtItem(refreshed, { id: "late-test", status: "paid" });
  assert.equal(paid.debtRows.find((row) => row.id === "late-test")?.status, "paid");
});

test("recurring bills can be generated once per month", () => {
  const previous = createDefaultDashboardState();
  const withoutRecurring = { ...previous, recurringBills: [], debtRows: [] };
  const withBill = addRecurringBillItem(
    withoutRecurring,
    { personId: previous.people[0].id, name: "Aluguel", category: "Moradia", value: 1500, dueDay: 7 },
    () => "recurring-test"
  );
  const updated = updateRecurringBillItem(withBill, { id: "recurring-test", value: 1600 });
  const generated = generateRecurringDebtsForMonth(updated, "2026-05", () => "debt-recurring-test");
  const generatedAgain = generateRecurringDebtsForMonth(generated, "2026-05", () => "debt-duplicate");
  const removed = removeRecurringBillItem(generatedAgain, "recurring-test");

  assert.equal(updated.recurringBills[0].value, 1600);
  assert.equal(generated.debtRows.length, 1);
  assert.equal(generated.debtRows[0].dueDate, "2026-05-07");
  assert.equal(generatedAgain.debtRows.length, 1);
  assert.equal(removed.recurringBills.length, 0);
});

test("clearFinancialData keeps people and removes all financial values", () => {
  const previous = createDefaultDashboardState();
  const personId = previous.people[0].id;
  const withCapital = addCapitalItem(
    previous,
    { personId, label: "Reserva", month: "2026-05", value: 1000 },
    () => "capital-reset"
  );
  const withEntry = addEntryItem(
    withCapital,
    { personId, label: "Freela", month: "2026-05", value: 500 },
    () => "entry-reset"
  );
  const withDebt = addDebtItem(
    withEntry,
    { personId, name: "Internet", dueDate: "2026-05-10", value: 120 },
    () => "debt-reset"
  );
  const cleared = clearFinancialData(withDebt);

  assert.equal(cleared.people.length, previous.people.length);
  assert.equal(cleared.people.every((person) => person.fixedSalary === 0), true);
  assert.equal(cleared.entries.length, 0);
  assert.equal(cleared.debtRows.length, 0);
  assert.equal(cleared.capitalItems.length, 0);
  assert.equal(cleared.preferences.setupCompleted, true);
});

test("initial setup replaces demo data with user baseline", () => {
  const previous = createDefaultDashboardState();
  const next = completeInitialSetup(
    previous,
    {
      primaryName: "Wellington",
      secondaryNames: "Andressa",
      fixedSalary: "5000",
      extraIncome: "200",
      capitalValue: "1000",
      firstBillName: "Internet",
      firstBillValue: "120",
      firstBillDueDay: "10",
      month: "2026-05",
    },
    (prefix) => `${prefix}-setup`
  );

  assert.equal(next.preferences.setupCompleted, true);
  assert.equal(next.people.length, 2);
  assert.equal(next.people[0].fixedSalary, 5000);
  assert.equal(next.capitalItems.length, 1);
  assert.equal(next.recurringBills.length, 1);
  assert.equal(next.entries.length, 0);
});
