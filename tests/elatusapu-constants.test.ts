import { describe, it, expect } from "vitest";
import { haeVakiot, ELATUSAPU_VAKIOT } from "../src/data/elatusapu-constants.js";

describe("Elatusapu Constants", () => {
  it("haeVakiot(2026) returns 2026 data", () => {
    const v = haeVakiot(2026);
    expect(v.vuosi).toBe(2026);
  });

  it("haeVakiot() without argument returns latest year", () => {
    const v = haeVakiot();
    const latest = Math.max(...Object.keys(ELATUSAPU_VAKIOT).map(Number));
    expect(v.vuosi).toBe(latest);
  });

  it("has correct base costs for 2026", () => {
    const v = haeVakiot(2026);
    expect(v.peruskulutus["0-6"]).toBe(362.23);
    expect(v.peruskulutus["7-12"]).toBe(421.95);
    expect(v.peruskulutus["13-17"]).toBe(567.64);
  });

  it("has correct Kela minimum for 2026", () => {
    const v = haeVakiot(2026);
    expect(v.kelaElatustuki).toBe(197.71);
  });

  it("has correct modification threshold", () => {
    const v = haeVakiot(2026);
    expect(v.muutoskynnys).toBe(0.15);
  });

  it("has correct index coefficient for 2026", () => {
    const v = haeVakiot(2026);
    expect(v.indeksikerroin.osoittaja).toBe(2338);
    expect(v.indeksikerroin.nimittaja).toBe(2343);
  });

  it("has correct housing percentages for sole custody", () => {
    const v = haeVakiot(2026);
    expect(v.asumisprosentitYksinhuolto["1"]).toBe(23);
    expect(v.asumisprosentitYksinhuolto["2"]).toBe(19);
    expect(v.asumisprosentitYksinhuolto["3"]).toBe(16);
  });

  it("has correct housing percentages for shared custody", () => {
    const v = haeVakiot(2026);
    expect(v.asumisprosentitVuoroasuminen["1"]).toBe(11.5);
    expect(v.asumisprosentitVuoroasuminen["2"]).toBe(9.5);
  });

  it("has board and lodging deduction for all age groups", () => {
    const v = haeVakiot(2026);
    expect(v.luonapitovahennys["0-6"]["7-9"]).toBe(37.0);
    expect(v.luonapitovahennys["7-12"]["10-12"]).toBe(55.0);
    expect(v.luonapitovahennys["13-17"]["13-15"]).toBe(77.5);
  });
});
