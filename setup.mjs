export function setup(ctx) {
  const settings = ctx.settings.section("Mapmaking");
  const maximum = 1000;
  const isValid = (value) => Number.isSafeInteger(value) && value >= 1 && value <= maximum;
  const getMultiplier = (name) => {
    const value = settings.get(name);
    // Melvor restores saved settings without calling onChange validation.
    return isValid(value) ? value : 1;
  };
  const actions = [
    {
      mode: 3,
      name: "paper-action-multiplier",
      label: "Paper Making multiplier",
      method: "paperMakingAction",
      rateKey: "paperMakingRates",
      menu: typeof PaperMakingMenuElement === "undefined" ? undefined : PaperMakingMenuElement,
    },
    {
      mode: 4,
      name: "map-upgrade-action-multiplier",
      label: "Map Upgrade multiplier",
      method: "mapUpgradeAction",
      rateKey: "mapUpgradeRates",
      menu: typeof MapUpgradeMenuElement === "undefined" ? undefined : MapUpgradeMenuElement,
    },
  ];

  for (const { name, label, rateKey, menu } of actions) {
    settings.add({
      type: "number",
      name,
      label,
      hint: "Whole number from 1 to 1000. Actions per normal-duration cycle, each with normal material costs, output/progress and XP. Applies at the next completion.",
      default: 1,
      min: 1,
      max: maximum,
      onChange(value) {
        if (!isValid(value)) return "Enter a whole number from 1 to 1000.";
        const renderQueue = game.cartography?.renderQueue;
        if (renderQueue) renderQueue[rateKey] = true;
      },
    });

    if (menu) {
      const summaries = new WeakMap();
      ctx.patch(menu, "updateRates").after(function () {
        let summary = summaries.get(this);
        if (!summary) {
          summary = document.createElement("div");
          summary.className = "text-muted font-size-sm mt-2";
          this.appendChild(summary);
          summaries.set(this, summary);
        }
        const multiplier = getMultiplier(name);
        const text = `Up to ${multiplier} actions per cycle. Listed costs, output/progress and XP are per action.`;
        if (summary.textContent !== text) summary.textContent = text;
        const hidden = multiplier === 1;
        if (summary.hidden !== hidden) summary.hidden = hidden;
      });
    }
  }

  ctx.patch(Cartography, "action").replace(function (original) {
    const mode = this.actionMode;
    const action = actions.find((candidate) => candidate.mode === mode);
    if (!action) return original();
    const isPaper = mode === 3;
    const target = isPaper ? this.selectedPaperRecipe : this.currentUpgradeMap;
    if (target === undefined) return original();
    const multiplier = getMultiplier(action.name);
    let result;

    for (let completed = 0; completed < multiplier; completed++) {
      if (completed > 0) {
        // Multitasking can own game.activeAction while Cartography continues running.
        if (!this.isActive || this.actionMode !== mode || !this.actionTimer.isActive) break;
        const selected = isPaper ? this.selectedPaperRecipe : this.currentUpgradeMap;
        if (selected !== target || (!isPaper && target.atMaxTier)) break;
        // Auto Cartographer performs queued refill/resume/advance transitions after the game tick.
        if (typeof mod !== "undefined" && mod.api?.RussellAutoCartographer?.status?.()?.state?.pendingTransition) break;
      }
      // Vanilla's initial Paper affordability guard currently omits the method call.
      if (isPaper && !this.getPaperMakingCosts(target).checkIfOwned()) {
        this.paperIngredientNotify();
        this.stop();
        break;
      }
      // Call the dispatcher once; replay public action methods so other mods' hooks run for every action.
      if (completed === 0) result = original();
      else this[action.method]();
    }
    return result;
  });
}
