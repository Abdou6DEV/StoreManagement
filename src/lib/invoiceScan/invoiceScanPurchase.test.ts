import assert from "node:assert/strict";
import test from "node:test";
import {
  findInvoiceScanConflicts,
  mergedCatalogBoughtPrice,
  normalizeInvoiceScanPurchase,
  roundMoney,
  unitPurchasePrice,
  type InvoiceScanPurchaseInput,
} from "./invoiceScanPurchase";

test("roundMoney keeps two decimal places", () => {
  assert.equal(roundMoney(10.555), 10.56);
  assert.equal(roundMoney("4.2"), 4.2);
});

test("unitPurchasePrice prefers the invoice unit price", () => {
  assert.equal(
    unitPurchasePrice({ boughtPrice: 80, actualPurchasePrice: 100 }),
    100,
  );
  assert.equal(unitPurchasePrice({ boughtPrice: 80 }), 80);
});

test("mergedCatalogBoughtPrice weights incoming cost with current stock", () => {
  const price = mergedCatalogBoughtPrice(
    [
      {
        quantity: 2,
        boughtPrice: 120,
        actualPurchasePrice: 120,
        priceStrategy: "weighted",
      },
    ],
    { quantity: 8, boughtPrice: 100 },
  );
  assert.equal(price, 104);
});

test("mergedCatalogBoughtPrice replaces catalog when every line is new", () => {
  const price = mergedCatalogBoughtPrice(
    [
      {
        quantity: 1,
        boughtPrice: 50,
        actualPurchasePrice: 50,
        priceStrategy: "new",
      },
      {
        quantity: 3,
        boughtPrice: 70,
        actualPurchasePrice: 70,
        priceStrategy: "new",
      },
    ],
    { quantity: 10, boughtPrice: 40 },
  );
  assert.equal(price, 65);
});

const sampleInput = (
  patch: Partial<InvoiceScanPurchaseInput> = {},
): InvoiceScanPurchaseInput => ({
  sellerId: "seller-1",
  newProducts: [
    {
      name: "Coca 1L",
      categoryName: "Drinks",
      quantity: 10,
      boughtPrice: 80,
      sellingPrice: 100,
      codebar: "",
    },
  ],
  existingGroups: [],
  ...patch,
});

test("normalizeInvoiceScanPurchase rejects empty or invalid payloads", () => {
  const missingSeller = normalizeInvoiceScanPurchase({
    sellerId: "  ",
    newProducts: [],
    existingGroups: [],
  });
  assert.deepEqual(missingSeller, { success: false, code: "invalid" });

  const badQty = normalizeInvoiceScanPurchase(
    sampleInput({
      newProducts: [
        {
          name: "X",
          categoryName: "Y",
          quantity: 0,
          boughtPrice: 1,
          sellingPrice: 2,
          codebar: "",
        },
      ],
    }),
  );
  assert.deepEqual(badQty, { success: false, code: "invalid" });
});

test("findInvoiceScanConflicts catches duplicate new names before any write", () => {
  const conflict = findInvoiceScanConflicts(
    sampleInput({
      newProducts: [
        {
          name: "Huile 5L",
          categoryName: "Oils",
          quantity: 2,
          boughtPrice: 400,
          sellingPrice: 500,
          codebar: "",
        },
        {
          name: "Huile 5L",
          categoryName: "Oils",
          quantity: 3,
          boughtPrice: 410,
          sellingPrice: 500,
          codebar: "",
        },
      ],
    }),
    [],
  );
  assert.deepEqual(conflict, {
    success: false,
    code: "duplicate_new_name",
    name: "Huile 5L",
  });
});

test("findInvoiceScanConflicts catches a new name that already exists", () => {
  const conflict = findInvoiceScanConflicts(sampleInput(), [
    { id: "p1", name: "Coca 1L", codebar: null },
  ]);
  assert.deepEqual(conflict, {
    success: false,
    code: "name_exists",
    name: "Coca 1L",
  });
});

test("findInvoiceScanConflicts catches duplicate barcodes", () => {
  const conflict = findInvoiceScanConflicts(
    sampleInput({
      newProducts: [
        {
          name: "A",
          categoryName: "X",
          quantity: 1,
          boughtPrice: 1,
          sellingPrice: 2,
          codebar: "123",
        },
        {
          name: "B",
          categoryName: "X",
          quantity: 1,
          boughtPrice: 1,
          sellingPrice: 2,
          codebar: "123",
        },
      ],
    }),
    [],
  );
  assert.deepEqual(conflict, {
    success: false,
    code: "duplicate_barcode",
    name: "123",
  });
});
