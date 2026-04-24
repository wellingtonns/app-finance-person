import test from "node:test";
import assert from "node:assert/strict";
import {
  addCapitalItem,
  addDebtItem,
  addEntryItem,
  addInvestmentItem,
  addLeisureItem,
  addPersonItem,
  clearCapitalItems,
  clearLeisureItems,
  createDefaultDashboardState,
  getMonthExtraIncome,
  normalizeDashboardState,
  removeDebtItem,
  removeEntryItem,
  removeInvestmentItem,
  removePersonItem,
  setPersonExtraIncome,
  updateDebtItem,
  updateEntryItem,
  updatePersonItem,
} from "./state-utils.mjs";

test("entry CRUD keeps state immutable", () => {
  const previous = createDefaultDashboardState();
  const personId = previous.people[0].id;
  const added = addEntryItem(
    previous,
    { personId, label: "Freela", category: "Freelance", month: "2026-04", value: 350 },
    () => "entry-test"
  );

  assert.equal(previous.entries.length, 2);
  assert.equal(added.entries.length, 3);
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
  const next = clearLeisureItems(previous);

  assert.equal(next.leisureRows.length, 0);
  assert.equal(previous.leisureRows.length, 2);
});

test("addLeisureItem adds a row immutably", () => {
  const previous = createDefaultDashboardState();
  const next = addLeisureItem(
    previous,
    { personId: previous.people[0].id, label: "Cinema", category: "Lazer", month: "2026-04", value: 50 },
    () => "leisure-test"
  );

  assert.equal(next.leisureRows.length, previous.leisureRows.length + 1);
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
