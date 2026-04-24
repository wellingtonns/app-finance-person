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
  normalizeDashboardState,
  removeDebtItem,
  removeInvestmentItem,
  removePersonItem,
} from "./state-utils.mjs";

test("addEntryItem adds a new entry immutably", () => {
  const previous = createDefaultDashboardState();
  const next = addEntryItem(previous, { description: "Freela", value: 350 }, () => "entry-test");

  assert.equal(previous.entries.length, 2);
  assert.equal(next.entries.length, 3);
  assert.equal(next.entries.at(-1).label, "Freela");
  assert.notEqual(previous, next);
});

test("clearLeisureItems removes all leisure rows", () => {
  const previous = createDefaultDashboardState();
  const next = clearLeisureItems(previous);

  assert.equal(next.leisureRows.length, 0);
  assert.equal(previous.leisureRows.length, 2);
});

test("addDebtItem and removeDebtItem update debts correctly", () => {
  const previous = createDefaultDashboardState();
  const added = addDebtItem(
    previous,
    {
      person: "Andressa",
      name: "Conta teste",
      value: 200,
      dueDate: "20/04/2026",
      status: "open",
      statusLabel: "A vencer",
      delay: 0,
    },
    () => "debt-test"
  );

  assert.equal(added.debtRows.length, previous.debtRows.length + 1);
  const removed = removeDebtItem(added, "debt-test");
  assert.equal(removed.debtRows.length, previous.debtRows.length);
});

test("addPersonItem avoids duplicates and removePersonItem updates selected person", () => {
  const previous = createDefaultDashboardState();
  const duplicated = addPersonItem(previous, "Andressa");
  assert.equal(duplicated.people.length, previous.people.length);

  const added = addPersonItem(previous, "Marina");
  assert.equal(added.people.includes("Marina"), true);

  const removed = removePersonItem(added, "Andressa");
  assert.equal(removed.people.includes("Andressa"), false);
  assert.equal(removed.selectedPerson, "Wellington");
});

test("capital and investment mutations stay immutable", () => {
  const previous = createDefaultDashboardState();
  const withCapital = addCapitalItem(previous, { label: "Reserva", note: "Teste", value: 400 }, () => "capital-test");
  const clearedCapital = clearCapitalItems(withCapital);
  const withInvestment = addInvestmentItem(
    previous,
    { name: "Tesouro IPCA", category: "Renda fixa", value: 500, yield: "+1,00%" },
    () => "investment-test"
  );
  const removedInvestment = removeInvestmentItem(withInvestment, "investment-test");

  assert.equal(withCapital.capitalItems.length, previous.capitalItems.length + 1);
  assert.equal(clearedCapital.capitalItems.length, 0);
  assert.equal(withInvestment.investmentItems.length, previous.investmentItems.length + 1);
  assert.equal(removedInvestment.investmentItems.length, previous.investmentItems.length);
});

test("normalizeDashboardState protects against invalid snapshots", () => {
  const normalized = normalizeDashboardState({
    people: [null, " ", "Joao", "joao"],
    selectedPerson: "Pessoa inexistente",
    sumSalaries: "yes",
    consolidateDebts: null,
    entries: [{ label: "", value: 12 }, { label: "Extra", value: 99 }],
  });

  assert.deepEqual(normalized.people, ["Joao"]);
  assert.equal(normalized.selectedPerson, "Joao");
  assert.equal(normalized.sumSalaries, true);
  assert.equal(normalized.entries.length, 1);
  assert.equal(normalized.entries[0].label, "Extra");
});

test("addLeisureItem adds a row immutably", () => {
  const previous = createDefaultDashboardState();
  const next = addLeisureItem(previous, { description: "Cinema", value: 50 }, () => "leisure-test");

  assert.equal(next.leisureRows.length, previous.leisureRows.length + 1);
  assert.equal(next.leisureRows.at(-1).label, "Cinema");
});
