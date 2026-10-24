import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { setup } from "../setup.mjs";

const PAPER = "paper-action-multiplier";
const MAP = "map-upgrade-action-multiplier";
const invalidValues = [0, -1, 1.5, 1001, Number.MAX_SAFE_INTEGER, NaN, Infinity, "10", null, undefined];

afterEach(() => {
  for (const key of ["Cartography", "game", "mod", "document", "PaperMakingMenuElement", "MapUpgradeMenuElement"]) delete globalThis[key];
});

function loadMod(restored = {}) {
  const configurations = new Map();
  const values = new Map();
  const patchedMethods = [];
  const recipe = { id: "Paper_Normal_Logs", baseQuantity: 3, baseExperience: 7, cost: 1 };
  const otherRecipe = { id: "Paper_Oak_Logs", baseQuantity: 7, baseExperience: 9, cost: 1 };
  const maps = Array.from({ length: 2 }, () => ({
    upgradeActions: 0, charges: 0,
    get tier() { return Math.min(3, Math.floor(this.upgradeActions / 2)); },
    get atMaxTier() { return this.upgradeActions >= 6; },
  }));
  const site = { maps, selectedUpgradeIndex: 0, get selectedUpgradeMap() { return this.maps[this.selectedUpgradeIndex]; } };
  globalThis.Cartography = class {
    constructor() {
      this.isActive = true;
      this._actionMode = 3;
      this.selectedPaperRecipe = recipe;
      this.selectedMapUpgradeDigsite = site;
      this.renderQueue = {};
      Object.assign(this, { logs: 2000, paper: 100, xp: 0, rewardRolls: 0, events: 0, timeSpent: 0, dispatcherCalls: 0, surveyActions: 0, paperActions: 0, mapActions: 0, notifications: 0 });
      this.hooks = { paper: 0, map: 0 };
      this.actionTimer = {
        active: false, maxTicks: 90, ticksLeft: 0,
        get isActive() { return this.active; },
        start(interval) { this.active = true; this.maxTicks = interval / 50; this.ticksLeft = this.maxTicks; },
        stop() { this.active = false; },
      };
    }
    get actionMode() { return this._actionMode; }
    get currentUpgradeMap() { return this.selectedMapUpgradeDigsite?.selectedUpgradeMap; }
    getPaperMakingInterval() { return 4500; }
    getMapUpgradeInterval() { return 5000; }
    getPaperMakingCosts(selected) { return { checkIfOwned: () => this.logs >= selected.cost }; }
    paperIngredientNotify() { this.notifications++; }
    mapIngredientNotify() { this.notifications++; }
    stop() {
      this.isActive = false;
      this._actionMode = 0;
      this.actionTimer.stop();
      game.activeAction = undefined;
    }
    action() {
      this.dispatcherCalls++;
      if (this._actionMode === 3) this.paperMakingAction();
      else if (this._actionMode === 4) this.mapUpgradeAction();
      else { this.surveyActions++; this.actionTimer.start(5000); }
      return "native dispatcher result";
    }
    paperMakingAction() {
      // Vanilla's initial Paper guard does not invoke checkIfOwned().
      const selected = this.selectedPaperRecipe;
      this.paper += selected.baseQuantity;
      if (!this.preserveLogs) this.logs -= selected.cost;
      this.xp += selected.baseExperience;
      this.rewardRolls++;
      this.events++;
      this.timeSpent += this.actionTimer.maxTicks * 50;
      this.paperActions++;
      if (this.getPaperMakingCosts(this.selectedPaperRecipe).checkIfOwned() && !this.bankFull) this.actionTimer.start(this.getPaperMakingInterval());
      else { this.paperIngredientNotify(); this.stop(); }
    }
    mapUpgradeAction() {
      const map = this.currentUpgradeMap;
      const cost = map.tier + 1;
      if (this.paper < cost) { this.mapIngredientNotify(); this.stop(); return; }
      this.paper -= cost;
      this.xp += 11;
      this.rewardRolls++;
      this.events++;
      this.timeSpent += this.actionTimer.maxTicks * 50;
      const oldTier = map.tier;
      map.upgradeActions++;
      if (map.tier !== oldTier) map.charges += 10;
      this.mapActions++;
      if (map.atMaxTier) {
        const next = this.selectedMapUpgradeDigsite.maps.findIndex((candidate) => !candidate.atMaxTier);
        if (next === -1) { this.stop(); return; }
        this.selectedMapUpgradeDigsite.selectedUpgradeIndex = next;
      }
      if (this.paper >= this.currentUpgradeMap.tier + 1) this.actionTimer.start(this.getMapUpgradeInterval());
      else { this.mapIngredientNotify(); this.stop(); }
    }
  };
  // Simulate other mods' hooks on the public native action methods.
  for (const [method, kind] of [["paperMakingAction", "paper"], ["mapUpgradeAction", "map"]]) {
    const native = Cartography.prototype[method];
    Cartography.prototype[method] = function () {
      const result = native.call(this);
      this.hooks[kind]++;
      this.onAfterAction?.(kind);
      return result;
    };
  }
  const cartography = new Cartography();
  globalThis.game = { cartography, activeAction: cartography };
  setup({
    settings: { section(name) {
      assert.equal(name, "Mapmaking");
      return {
        add(config) {
          configurations.set(config.name, config);
          values.set(config.name, Object.hasOwn(restored, config.name) ? restored[config.name] : config.default);
        },
        get(name) { return values.get(name); },
      };
    } },
    patch(target, method) {
      patchedMethods.push([target === Cartography ? "Cartography" : target.name, method]);
      const native = target.prototype[method];
      return {
        replace(hook) { target.prototype[method] = function (...args) { return hook.call(this, native.bind(this), ...args); }; },
        after(hook) { target.prototype[method] = function (...args) { const result = native.apply(this, args); return hook.call(this, result, ...args) ?? result; }; },
      };
    },
  });
  return {
    configurations, values, patchedMethods, cartography, recipe, otherRecipe, site, maps,
    set(name, value) {
      const result = configurations.get(name).onChange(value, values.get(name));
      if (typeof result === "string" || result === false) return result;
      values.set(name, value);
    },
    begin(mode) {
      cartography._actionMode = mode;
      cartography.isActive = true;
      game.activeAction = cartography;
      cartography.actionTimer.active = false;
      cartography.actionTimer.maxTicks = mode === 3 ? 90 : 100;
      cartography.actionTimer.ticksLeft = 0;
    },
  };
}

test("new bounded settings ignore legacy speeds and preserve default actions, intervals, and Surveying", () => {
  const m = loadMod({ "paper-making-multiplier": 1000, "map-upgrade-multiplier": 1000 });
  assert.deepEqual([...m.configurations.keys()], [PAPER, MAP]);
  assert.deepEqual(m.patchedMethods.filter(([name]) => name === "Cartography").map(([, method]) => method), ["action"]);
  for (const config of m.configurations.values()) {
    assert.equal(config.type, "number"); assert.equal(config.default, 1); assert.equal(config.min, 1); assert.equal(config.max, 1000);
  }
  const c = m.cartography;
  assert.equal(c.getPaperMakingInterval(), 4500);
  assert.equal(c.getMapUpgradeInterval(), 5000);
  assert.equal(c.action(), "native dispatcher result");
  assert.equal(c.paperActions, 1); assert.equal(c.logs, 1999); assert.equal(c.actionTimer.maxTicks, 90);
  m.begin(4); c.action();
  assert.equal(c.mapActions, 1); assert.equal(c.actionTimer.maxTicks, 100);
  m.set(PAPER, 1000); m.set(MAP, 1000); m.begin(2); c.action();
  assert.equal(c.surveyActions, 1); assert.equal(c.paperActions, 1); assert.equal(c.mapActions, 1);
});

test("Paper batches pay every cost and grant each selected recipe reward, XP, roll, event, and public hook", () => {
  const m = loadMod(); m.set(PAPER, 10);
  const c = m.cartography; c.selectedPaperRecipe = m.otherRecipe;
  assert.equal(c.actionTimer.isActive, false);
  c.action();
  assert.equal(c.dispatcherCalls, 1); assert.equal(c.paperActions, 10);
  assert.equal(c.logs, 1990); assert.equal(c.paper, 170); assert.equal(c.xp, 90);
  assert.equal(c.rewardRolls, 10); assert.equal(c.events, 10); assert.equal(c.hooks.paper, 10);
  assert.equal(c.timeSpent, 45000); assert.equal(c.actionTimer.maxTicks, 90); assert.equal(c.actionTimer.ticksLeft, 90);
});

test("Map batches recalculate tier costs and preserve every tier upgrade and native reward", () => {
  const m = loadMod(); m.set(MAP, 5); m.begin(4);
  const c = m.cartography; c.action();
  assert.equal(c.dispatcherCalls, 1); assert.equal(c.mapActions, 5);
  assert.equal(m.maps[0].upgradeActions, 5); assert.equal(m.maps[0].tier, 2); assert.equal(m.maps[0].charges, 20);
  assert.equal(c.paper, 91); // Costs: 1 + 1 + 2 + 2 + 3.
  assert.equal(c.xp, 55); assert.equal(c.rewardRolls, 5); assert.equal(c.events, 5); assert.equal(c.hooks.map, 5);
  assert.equal(c.timeSpent, 25000); assert.equal(c.actionTimer.ticksLeft, 100);
});

test("Paper and Map multipliers remain independent", () => {
  const m = loadMod(); m.set(PAPER, 2); m.set(MAP, 3);
  m.cartography.action(); m.begin(4); m.cartography.action();
  assert.equal(m.cartography.paperActions, 2); assert.equal(m.cartography.mapActions, 3);
});

test("invalid changes retain settings and invalid restored values run only one action", () => {
  const m = loadMod();
  for (const name of [PAPER, MAP]) {
    m.set(name, 6);
    for (const value of invalidValues) { assert.equal(typeof m.set(name, value), "string"); assert.equal(m.values.get(name), 6); }
  }
  for (const value of invalidValues) {
    const restored = loadMod({ [PAPER]: value, [MAP]: value });
    restored.cartography.action(); restored.begin(4); restored.cartography.action();
    assert.equal(restored.cartography.paperActions, 1); assert.equal(restored.cartography.mapActions, 1);
  }
  const restored = loadMod({ [PAPER]: 4, [MAP]: 2 });
  restored.cartography.action(); restored.begin(4); restored.cartography.action();
  assert.equal(restored.cartography.paperActions, 4); assert.equal(restored.cartography.mapActions, 2);
});

test("maximum Paper batches remain finite with guaranteed material preservation", () => {
  const m = loadMod(); assert.equal(m.set(PAPER, 1000), undefined);
  const c = m.cartography; c.logs = 1; c.preserveLogs = true; c.action();
  assert.equal(c.paperActions, 1000); assert.equal(c.logs, 1); assert.equal(c.xp, 7000); assert.equal(c.dispatcherCalls, 1);
});

test("Paper stops on exhausted ingredients and never grants a free first action", () => {
  for (const available of [0, 3]) {
    const m = loadMod(); m.set(PAPER, 10);
    const c = m.cartography; c.logs = available; c.action();
    assert.equal(c.paperActions, available); assert.equal(c.paper, 100 + available * 3); assert.equal(c.xp, available * 7);
    assert.equal(c.logs, 0); assert.equal(c.isActive, false); assert.ok(c.notifications > 0);
  }
});

test("Map stops at the last affordable action without unpaid progress or XP", () => {
  const m = loadMod(); m.set(MAP, 10); m.begin(4);
  const c = m.cartography; c.paper = 4; c.action();
  assert.equal(c.mapActions, 3); assert.equal(m.maps[0].upgradeActions, 3);
  assert.equal(c.paper, 0); assert.equal(c.xp, 33); assert.equal(c.isActive, false);
});

test("Paper respects the native bank-full stop after the first action", () => {
  const m = loadMod(); m.set(PAPER, 10); m.cartography.bankFull = true; m.cartography.action();
  assert.equal(m.cartography.paperActions, 1); assert.equal(m.cartography.logs, 1999); assert.equal(m.cartography.isActive, false);
});

test("Perfect ends the batch and preserves vanilla selection of the next map", () => {
  const m = loadMod(); m.set(MAP, 1000); m.begin(4); m.maps[0].upgradeActions = 5;
  const c = m.cartography; c.action();
  assert.equal(m.maps[0].upgradeActions, 6); assert.equal(m.maps[1].upgradeActions, 0);
  assert.equal(c.currentUpgradeMap, m.maps[1]); assert.equal(c.mapActions, 1); assert.equal(c.paper, 97);
  assert.equal(c.isActive, true); assert.equal(c.actionTimer.isActive, true);
});

test("the final Perfect map stops normally without replaying completion", () => {
  const m = loadMod(); m.set(MAP, 1000); m.begin(4);
  m.maps[0].upgradeActions = 5; m.maps[1].upgradeActions = 6; m.cartography.action();
  assert.equal(m.cartography.mapActions, 1); assert.equal(m.cartography.hooks.map, 1); assert.equal(m.cartography.isActive, false);
});

test("batches stop on hook changes to Cartography activity, mode, recipe, or timer", () => {
  const interruptions = [
    (c) => c.stop(), (c) => { c._actionMode = 2; },
    (c, m) => { c.selectedPaperRecipe = m.otherRecipe; }, (c) => c.actionTimer.stop(),
  ];
  for (const interrupt of interruptions) {
    const m = loadMod(); m.set(PAPER, 10);
    m.cartography.onAfterAction = () => interrupt(m.cartography, m); m.cartography.action();
    assert.equal(m.cartography.paperActions, 1); assert.equal(m.cartography.xp, 7); assert.equal(m.cartography.logs, 1999);
  }
});

for (const [label, setting, mode, multiplier, count] of [
  ["Paper", PAPER, 3, 10, "paperActions"],
  ["Map", MAP, 4, 5, "mapActions"],
]) {
  for (const primary of ["another action", "undefined"]) {
    test(`${label} batches continue while Multitasking's primary action is ${primary}`, () => {
      const m = loadMod(); m.set(setting, multiplier); m.begin(mode);
      const c = m.cartography;
      const activeAction = primary === "another action" ? { id: "Combat" } : undefined;
      game.activeAction = activeAction;
      assert.equal(c.isActive, true);
      assert.equal(c.actionTimer.isActive, false);
      c.action();
      assert.equal(c[count], multiplier);
      assert.equal(c.dispatcherCalls, 1);
      assert.equal(c.isActive, true);
      assert.equal(c.actionTimer.isActive, true);
      assert.equal(game.activeAction, activeAction);
      if (mode === 3) {
        assert.equal(c.logs, 1990); assert.equal(c.paper, 130); assert.equal(c.xp, 70);
      } else {
        assert.equal(m.maps[0].upgradeActions, 5); assert.equal(c.paper, 91); assert.equal(c.xp, 55);
      }
    });
  }
}

test("Map batching stops when a public hook changes the exact selected target", () => {
  const m = loadMod(); m.set(MAP, 10); m.begin(4);
  m.cartography.onAfterAction = () => { m.site.selectedUpgradeIndex = 1; }; m.cartography.action();
  assert.equal(m.maps[0].upgradeActions, 1); assert.equal(m.maps[1].upgradeActions, 0); assert.equal(m.cartography.mapActions, 1);
});

test("Auto Cartographer pending transitions stop extras and a later completed timer can batch normally", () => {
  const m = loadMod(); m.set(PAPER, 10);
  let pendingTransition;
  globalThis.mod = { api: { RussellAutoCartographer: { status: () => ({ state: { pendingTransition } }) } } };
  m.cartography.onAfterAction = () => { pendingTransition = "resumeAfterPaper"; };
  m.cartography.action();
  assert.equal(m.cartography.paperActions, 1);
  pendingTransition = undefined; m.cartography.onAfterAction = undefined; m.begin(3); m.cartography.action();
  assert.equal(m.cartography.paperActions, 11);
});

test("valid changes queue only matching rates and leave the running timer unchanged", () => {
  const m = loadMod();
  const timer = m.cartography.actionTimer;
  timer.start(4500);
  timer.ticksLeft = 42;
  m.set(PAPER, 10);
  assert.deepEqual(m.cartography.renderQueue, { paperMakingRates: true });
  m.cartography.renderQueue = {};
  m.set(MAP, 5);
  assert.deepEqual(m.cartography.renderQueue, { mapUpgradeRates: true });
  m.cartography.renderQueue = {};
  assert.equal(typeof m.set(PAPER, 1.5), "string");
  assert.deepEqual(m.cartography.renderQueue, {});
  assert.equal(m.cartography.actionTimer, timer);
  assert.equal(timer.ticksLeft, 42);
  assert.equal(timer.maxTicks, 90);
  assert.equal(timer.isActive, true);
});

test("menu summaries update without duplication, preserve native rates, and hide at 1×", () => {
  class Menu {
    children = [];
    nativeCalls = 0;
    appendChild(child) { this.children.push(child); }
    updateRates() { this.nativeCalls++; return "native rates"; }
  }
  globalThis.PaperMakingMenuElement = class PaperMakingMenuElement extends Menu {};
  globalThis.MapUpgradeMenuElement = class MapUpgradeMenuElement extends Menu {};
  globalThis.document = { createElement(tag) { assert.equal(tag, "div"); return {}; } };
  const m = loadMod();
  for (const [Type, setting, multiplier] of [[PaperMakingMenuElement, PAPER, 10], [MapUpgradeMenuElement, MAP, 5]]) {
    const menu = new Type();
    assert.equal(menu.updateRates(), "native rates");
    assert.equal(menu.children.length, 1);
    const summary = menu.children[0];
    assert.equal(summary.hidden, true);
    m.set(setting, multiplier);
    menu.updateRates();
    assert.equal(menu.children.length, 1);
    assert.equal(menu.children[0], summary);
    assert.equal(summary.hidden, false);
    assert.match(summary.textContent, new RegExp(`Up to ${multiplier} actions per cycle`));
    assert.match(summary.textContent, /costs, output\/progress and XP are per action/);
    m.set(setting, 1);
    menu.updateRates();
    assert.equal(menu.children.length, 1);
    assert.equal(summary.hidden, true);
    assert.equal(menu.nativeCalls, 3);
    const anotherMenu = new Type();
    anotherMenu.updateRates();
    assert.equal(anotherMenu.children.length, 1);
    assert.notEqual(anotherMenu.children[0], summary);
  }
});

test("unchanged menu rates do not rewrite the batch summary", () => {
  let textWrites = 0, hiddenWrites = 0;
  globalThis.PaperMakingMenuElement = class {
    nativeCalls = 0;
    appendChild(child) { this.summary = child; }
    updateRates() { this.nativeCalls++; }
  };
  globalThis.document = { createElement() {
    let text = "", hidden = false;
    return {
      get textContent() { return text; },
      set textContent(value) { textWrites++; text = value; },
      get hidden() { return hidden; },
      set hidden(value) { hiddenWrites++; hidden = value; },
    };
  } };
  const m = loadMod();
  const menu = new PaperMakingMenuElement();
  for (let render = 0; render < 1000; render++) menu.updateRates();
  assert.equal(menu.nativeCalls, 1000, "native rate updates still run every time");
  assert.equal(textWrites, 1);
  assert.equal(hiddenWrites, 1);
  m.set(PAPER, 10);
  menu.updateRates();
  assert.equal(textWrites, 2); assert.equal(hiddenWrites, 2);
  assert.match(menu.summary.textContent, /Up to 10 actions per cycle/);
  assert.equal(menu.summary.hidden, false);
  m.set(PAPER, 20);
  menu.updateRates();
  assert.equal(textWrites, 3); assert.equal(hiddenWrites, 2);
  assert.match(menu.summary.textContent, /Up to 20 actions per cycle/);
});
