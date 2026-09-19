import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mergedCatalogBoughtPrice,
  toMoneyInt,
  unitPurchasePrice,
} from "./scanPrices";

test("toMoneyInt rounds to whole dinars Prisma Int columns can store", () => {
  assert.equal(toMoneyInt(116.67), 117);
  assert.equal(toMoneyInt("80.4"), 80);
  assert.equal(toMoneyInt(undefined), 0);
  assert.equal(Number.isInteger(toMoneyInt(10.5)), true);
});

test("unitPurchasePrice prefers the actual receipt unit price", () => {
  assert.equal(
    unitPurchasePrice({ boughtPrice: 80, actualPurchasePrice: 100 }),
    100,
  );
  assert.equal(unitPurchasePrice({ boughtPrice: 80 }), 80);
});

test("weighted merge of mixed prices is an integer (2@100 + 1@150)", () => {
  const price = mergedCatalogBoughtPrice(
    [
      {
        quantity: 1,
        boughtPrice: 150,
        actualPurchasePrice: 150,
        priceStrategy: "weighted",
      },
    ],
    { quantity: 2, boughtPrice: 100 },
  );
  // (200 + 150) / 3 = 116.666... → 117
  assert.equal(price, 117);
  assert.equal(Number.isInteger(price), true);
});

test("keep-new strategy stores the incoming unit price as an integer", () => {
  const price = mergedCatalogBoughtPrice(
    [
      {
        quantity: 1,
        boughtPrice: 150.4,
        actualPurchasePrice: 150.4,
        priceStrategy: "new",
      },
    ],
    { quantity: 2, boughtPrice: 100 },
  );
  assert.equal(price, 150);
});
