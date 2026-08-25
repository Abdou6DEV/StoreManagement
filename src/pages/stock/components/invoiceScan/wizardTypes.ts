export type WizardLine = {
  key: string;
  aiName: string;
  productName: string;
  categoryName: string;
  quantity: number;
  boughtPrice: number;
  sellingPrice: number;
  codebar: string;
  isNewProduct: boolean;
  confirmed: boolean;
  existingProductId?: string;
  priceStrategy?: "weighted" | "new";
  originalBoughtPrice?: number;
  actualPurchasePrice?: number;
  skipped: boolean;
};
