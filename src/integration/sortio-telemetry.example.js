// Import třídy
window.GHRABTelemetry?.recordOutput({
  outputKind: "class-import",
  attemptedQuantity: 1,
  successfulQuantity: 1,
  outcome: "success",
});

// Vytvoření skupin; quantity odpovídá počtu vytvořených skupin.
window.GHRABTelemetry?.recordOutput({
  outputKind: "grouping",
  attemptedQuantity: quantity,
  successfulQuantity: quantity,
  outcome: "success",
});

// Uložení zasedacího pořádku
window.GHRABTelemetry?.recordOutput({
  outputKind: "seating-plan",
  attemptedQuantity: 1,
  successfulQuantity: 1,
  outcome: "success",
});

// Rozdělení rolí; quantity odpovídá počtu přidělených rolí.
window.GHRABTelemetry?.recordOutput({
  outputKind: "roles",
  attemptedQuantity: quantity,
  successfulQuantity: quantity,
  outcome: "success",
});
