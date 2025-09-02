import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStock } from "../../../lib/contexts/stockContext";
import { Product } from "@prisma/client";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Button } from "../../../lib/components/button";
import {
  AlertTriangle,
  Loader2,
  Package,
  Check,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";
import { Skeleton } from "../../../lib/components/skeleton";
import { ImageUpload } from "../../../lib/components/imageUpload";
import { Switch } from "../../../lib/components/switch";

import type { AddStockFormState } from "../../../types";
import { useToast } from "../../../lib/contexts/toastContext";
import rendererLogger from "../../../lib/logger/rendererLogger";
import { PriceConfirmationDialog } from "./priceConfirmationDialog";
import { SellingPriceWarningDialog } from "./sellingPriceWarningDialog";

// Helper function for safe price calculations with 2 decimal precision
const safePrice = (value: number | string | undefined): number => {
  const num = Number(value || 0);
  return parseFloat(num.toFixed(2));
};

// Helper function for safe price comparison with tolerance
const isPriceDifferent = (price1: number, price2: number): boolean => {
  return Math.abs(price1 - price2) > 0.01;
};

// Helper function for safe multiplication with precision
const safeMultiply = (a: number, b: number): number => {
  return parseFloat((a * b).toFixed(2));
};

const initialForm: AddStockFormState = {
  name: "",
  categoryName: "",
  quantity: "",
  boughtPrice: "",
  sellingPrice: "",
  codebar: "",
  sellerId: "",
  photo: null,
};

interface PendingProduct {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  boughtPrice: number;
  sellingPrice: number;
  codebar: string;
  sellerId: string;
  photo: string | null;
  isNewProduct: boolean;
  existingProductId?: string;
}

export default function AddStockForm({
  openPanel,
  setOpenPanel,
}: {
  openPanel: "add" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | null>>;
}) {
  const { t } = useTranslation();
  const { products, categories, refetchCategories, refetchProducts } =
    useStock();
  const { showToast } = useToast();

  // Mode toggle
  const [isMultiMode, setIsMultiMode] = useState(false);

  // Pending products for multi-mode
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);
  const [multiSellerId, setMultiSellerId] = useState("");

  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [dropdownProductSearch, setDropdownProductSearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] =
    useState<string[]>(categories);
  const [dropdownCategorySearch, setDropdownCategorySearch] = useState("");
  const [showSellerDropdown, setShowSellerDropdown] = useState(false);
  const [sellers, setSellers] = useState<{ id: string; name: string; phone?: string; email?: string; address?: string; notes?: string }[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<{ id: string; name: string; phone?: string; email?: string; address?: string; notes?: string }[]>([]);
  const [dropdownSellerSearch, setDropdownSellerSearch] = useState("");
  const [form, setForm] = useState<AddStockFormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [finishingPurchase, setFinishingPurchase] = useState(false);
  
  // Price confirmation dialog state
  const [showPriceConfirmation, setShowPriceConfirmation] = useState(false);
  const [priceConfirmationData, setPriceConfirmationData] = useState<{
    productId: string;
    newPrice: number;
    previousPrice: number;
    newSellingPrice: number;
    previousSellingPrice: number;
    sellerName: string | null;
    quantity: number;
    sellerId: string;
    purchaseHistory: Array<{
      id: string;
      quantity: number;
      price: number;
      createdAt: string;
      purchase: {
        id: string;
        seller: {
          name: string;
        } | null;
      };
    }>;
  } | null>(null);

  // Selling price warning dialog state
  const [showSellingPriceWarning, setShowSellingPriceWarning] = useState(false);
  const [sellingPriceWarningData, setSellingPriceWarningData] = useState<{
    sellingPrice: number;
    boughtPrice: number;
    isMultiMode: boolean;
    productCount?: number;
  } | null>(null);

  // For infinite scroll in product dropdown
  const PAGE_SIZE = 50;
  const [productPage, setProductPage] = useState(1);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);

  // Reset product dropdown paging when opening or searching
  React.useEffect(() => {
    setProductPage(1);
    setHasMoreProducts(true);
  }, [showProductDropdown, dropdownProductSearch]);

  // Compute paginated products
  const paginatedProducts = filteredProducts.slice(0, productPage * PAGE_SIZE);
  React.useEffect(() => {
    setHasMoreProducts(filteredProducts.length > productPage * PAGE_SIZE);
  }, [filteredProducts, productPage]);

  // Handler for loading more products
  const handleLoadMoreProducts = () => {
    if (!hasMoreProducts || loadingMoreProducts) return;
    setLoadingMoreProducts(true);
    const timeoutId = setTimeout(() => {
      setProductPage((prev) => prev + 1);
      setLoadingMoreProducts(false);
    }, 500); // Simulate async load
    
    // Cleanup timeout if component unmounts
    return () => clearTimeout(timeoutId);
  };

  // Fetch sellers on component mount
  React.useEffect(() => {
    const fetchSellers = async () => {
      try {
        const sellersData = await window.api.database.sellers.getAll();
        setSellers(sellersData);
        setFilteredSellers(sellersData);
      } catch (error) {
        rendererLogger.error("Failed to fetch sellers", "AddStockForm", error);
      }
    };
    fetchSellers();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!form.quantity || Number(form.quantity) <= 0) {
      showToast(t("stock.quantityRequired", "Quantity is required and must be greater than 0"), "error");
      return;
    }
    
    if (!form.name.trim()) {
      showToast(t("stock.nameRequired", "Product name is required"), "error");
      return;
    }
    
    if (!form.categoryName.trim()) {
      showToast(t("stock.categoryRequired", "Product category is required"), "error");
      return;
    }
    
    if (!form.boughtPrice || Number(form.boughtPrice) <= 0) {
      showToast(t("stock.boughtPriceRequired", "Bought price is required and must be greater than 0"), "error");
      return;
    }
    
    // Check if selling price is less than bought price
    if (form.sellingPrice && Number(form.sellingPrice) > 0 && Number(form.sellingPrice) < Number(form.boughtPrice)) {
      setSellingPriceWarningData({
        sellingPrice: Number(form.sellingPrice),
        boughtPrice: Number(form.boughtPrice),
        isMultiMode: false
      });
      setShowSellingPriceWarning(true);
      return; // Wait for user decision
    }
    
    setLoading(true);

    try {
      if (isMultiMode) {
        // Add to pending products list
        await window.api.database.categories.ensure(form.categoryName);

        // Check if product already exists
        const existingProduct = products.find(
          (p) =>
            p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
            p.categoryName.toLowerCase() ===
              form.categoryName.toLowerCase().trim(),
        );

        const pendingProduct: PendingProduct = {
          id: Date.now().toString(),
          name: form.name,
          categoryName: form.categoryName,
          quantity: Number(form.quantity || 0),
          boughtPrice: safePrice(form.boughtPrice),
          sellingPrice: safePrice(form.sellingPrice),
          codebar: form.codebar,
          sellerId: form.sellerId,
          photo: form.photo,
          isNewProduct: !existingProduct,
          existingProductId: existingProduct?.id,
        };

        setPendingProducts((prev) => [...prev, pendingProduct]);
        setForm(initialForm);

        showToast(
          t("stock.productAddedToPending", "Product added to purchase list"),
          "success",
        );
      } else {
        // Single product mode - process immediately as before
        await window.api.database.categories.ensure(form.categoryName);

        const existingProduct = products.find(
          (p) =>
            p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
            p.categoryName.toLowerCase() ===
              form.categoryName.toLowerCase().trim(),
        );

        const quantity = Number(form.quantity || 0);
        const boughtPrice = safePrice(form.boughtPrice);
        const purchaseData = {
          sellerId: form.sellerId || undefined,
          quantity: quantity,
          price: boughtPrice,
        };

        if (existingProduct) {
          // Check if the new price is different from the current bought price
          if (isPriceDifferent(boughtPrice, existingProduct.boughtPrice)) {
            // Check for remembered choice first
            const rememberedChoice = localStorage.getItem('priceConfirmationChoice');
            
            if (rememberedChoice) {
              // Automatically apply the remembered choice
              try {
                const purchaseData = {
                  sellerId: form.sellerId || undefined,
                  quantity: quantity,
                  price: boughtPrice,
                };

                if (rememberedChoice === 'weighted') {
                  // Apply weighted average
                  await window.api.database.products.updateWithPurchase({
                    productId: existingProduct.id,
                    additionalQuantity: quantity,
                    purchaseData: purchaseData,
                    updateBoughtPrice: true,
                    newSellingPrice: safePrice(form.sellingPrice),
                  });
                  showToast(
                    t("stock.toastUpdateSuccess", "Product updated successfully with weighted average price!"),
                    "success",
                  );
                } else {
                  // Apply new price
                  await window.api.database.products.updateWithPurchase({
                    productId: existingProduct.id,
                    additionalQuantity: quantity,
                    purchaseData: purchaseData,
                    updateBoughtPrice: false,
                    newSellingPrice: safePrice(form.sellingPrice),
                  });
                  showToast(
                    t("stock.toastUpdateSuccess", "Product updated successfully!"),
                    "success",
                  );
                }

                setForm(initialForm);
                refetchProducts();
                refetchCategories();
                return;
              } catch (err) {
                showToast(t("stock.toastAddError", "Failed to add product"), "error");
                return;
              }
            }
            
            // No remembered choice, show the dialog
            try {
              // Fetch product with purchase history for the dialog
              const productWithHistory = await window.api.database.products.getWithPurchaseHistory(existingProduct.id);
              
            // Show price confirmation dialog
            setPriceConfirmationData({
              productId: existingProduct.id,
              newPrice: boughtPrice,
              previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
              previousSellingPrice: existingProduct.sellingPrice,
              sellerName: sellers.find(s => s.id === form.sellerId)?.name || null,
              quantity: quantity,
              sellerId: form.sellerId,
                purchaseHistory: productWithHistory?.PurchaseItems || [],
            });
            setShowPriceConfirmation(true);
            return; // Don't proceed yet, wait for user decision
            } catch (error) {
              rendererLogger.error("Failed to fetch product history", "AddStockForm", error);
              // Fallback to basic confirmation without history
              setPriceConfirmationData({
                productId: existingProduct.id,
                newPrice: boughtPrice,
                previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
                previousSellingPrice: existingProduct.sellingPrice,
                sellerName: sellers.find(s => s.id === form.sellerId)?.name || null,
                quantity: quantity,
                sellerId: form.sellerId,
                purchaseHistory: [],
              });
              setShowPriceConfirmation(true);
              return;
            }
          }
          
          // Same price, proceed normally
          await window.api.database.products.updateWithPurchase({
            productId: existingProduct.id,
            additionalQuantity: quantity,
            purchaseData: purchaseData,
            updateBoughtPrice: false,
            newSellingPrice: safePrice(form.sellingPrice),
          });
          showToast(
            t("stock.toastUpdateSuccess", "Product updated successfully!"),
            "success",
          );
        } else {
          const productData = {
            name: form.name,
            categoryName: form.categoryName,
            quantity: quantity,
            boughtPrice: safePrice(form.boughtPrice),
            sellingPrice: safePrice(form.sellingPrice),
            codebar: form.codebar,
            photo: form.photo,
          };

          await window.api.database.products.createWithPurchase({
            productData: productData,
            purchaseData: purchaseData,
          });
          showToast(
            t("stock.toastAddSuccess", "Product added successfully!"),
            "success",
          );
        }

        setForm(initialForm);
        refetchProducts();
        refetchCategories();
      }
    } catch (err) {
      showToast(t("stock.toastAddError", "Failed to add product"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishPurchase = async () => {
    if (pendingProducts.length === 0) {
      showToast(
        t("stock.noPendingProducts", "No products in purchase list"),
        "error",
      );
      return;
    }

    // Validate that all products have required data
    const invalidProducts = pendingProducts.filter(p => 
      !p.name.trim() || !p.categoryName.trim() || p.quantity <= 0 || p.boughtPrice <= 0
    );
    
    // Check for products with selling price less than bought price
    const lossProducts = pendingProducts.filter(p => 
      p.sellingPrice > 0 && p.boughtPrice > 0 && p.sellingPrice < p.boughtPrice
    );
    
              if (lossProducts.length > 0) {
      setSellingPriceWarningData({
        sellingPrice: 0, // Not relevant for multi-mode
        boughtPrice: 0, // Not relevant for multi-mode
        isMultiMode: true,
        productCount: lossProducts.length
      });
      setShowSellingPriceWarning(true);
      return; // Wait for user decision
    }
    
    if (invalidProducts.length > 0) {
      showToast(
        t("stock.invalidProductsInList", "Some products in the list have invalid data"),
        "error",
      );
      return;
    }

    setFinishingPurchase(true);
    try {
      // Create new products first
      const newProducts = pendingProducts.filter((p) => p.isNewProduct);
      const existingProducts = pendingProducts.filter((p) => !p.isNewProduct);

      const purchaseItems: Array<{
        productId: string;
        quantity: number;
        price: number;
      }> = [];

      // Create new products and collect their IDs
      for (const newProduct of newProducts) {
        await window.api.database.categories.ensure(newProduct.categoryName);

        const productData = {
          name: newProduct.name,
          categoryName: newProduct.categoryName,
          quantity: newProduct.quantity, // Set initial quantity directly
          boughtPrice: safePrice(newProduct.boughtPrice),
          sellingPrice: safePrice(newProduct.sellingPrice),
          codebar: newProduct.codebar,
          photo: newProduct.photo,
        };

        const createdProduct =
          await window.api.database.products.add(productData);
        purchaseItems.push({
          productId: createdProduct.id,
          quantity: newProduct.quantity,
          price: newProduct.boughtPrice,
        });
      }

      // Add existing products to purchase items
      for (const existingProduct of existingProducts) {
        if (existingProduct.existingProductId) {
          purchaseItems.push({
            productId: existingProduct.existingProductId,
            quantity: existingProduct.quantity,
            price: existingProduct.boughtPrice,
          });
        }
      }

      // Create the multi-product purchase
      await window.api.database.purchases.createWithItems({
        sellerId: multiSellerId || undefined,
        items: purchaseItems,
      });

      // Update quantities for existing products only (new products already have correct quantity)
      for (const item of purchaseItems) {
        const isExistingProduct = existingProducts.some(p => p.existingProductId === item.productId);
        if (isExistingProduct) {
          const currentQuantity =
            products.find((p) => p.id === item.productId)?.quantity || 0;
          await window.api.database.products.update(item.productId, {
            quantity: currentQuantity + item.quantity,
          });
        }
      }

      showToast(
        t("stock.purchaseCompletedSuccess", "Purchase completed successfully!"),
        "success",
      );

      // Reset everything
      setPendingProducts([]);
      setMultiSellerId("");
      setForm(initialForm);
      refetchProducts();
      refetchCategories();
    } catch (error) {
      showToast(
        t("stock.purchaseCompletedError", "Failed to complete purchase"),
        "error",
      );
    } finally {
      setFinishingPurchase(false);
    }
  };

  const removePendingProduct = (id: string) => {
    setPendingProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Handle price confirmation dialog actions
  const handleCalculateWeightedAverage = async () => {
    if (!priceConfirmationData) return;
    
    try {
      setLoading(true);
      
      const purchaseData = {
        sellerId: priceConfirmationData.sellerId || undefined,
        quantity: priceConfirmationData.quantity,
        price: priceConfirmationData.newPrice,
      };

      // Update with weighted average
      await window.api.database.products.updateWithPurchase({
        productId: priceConfirmationData.productId,
        additionalQuantity: priceConfirmationData.quantity,
        purchaseData: purchaseData,
        updateBoughtPrice: true,
        newSellingPrice: safePrice(form.sellingPrice),
      });

      showToast(
        t("stock.toastUpdateSuccess", "Product updated successfully with weighted average price!"),
        "success",
      );

      // Reset form and close dialog
      setForm(initialForm);
      setShowPriceConfirmation(false);
      setPriceConfirmationData(null);
      
      // Refresh data
      refetchProducts();
      refetchCategories();
    } catch (err) {
      showToast(t("stock.toastAddError", "Failed to add product"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeepNewPrice = async () => {
    if (!priceConfirmationData) return;
    
    try {
      setLoading(true);
      
      const purchaseData = {
        sellerId: priceConfirmationData.sellerId || undefined,
        quantity: priceConfirmationData.quantity,
        price: priceConfirmationData.newPrice,
      };

      // Update with NEW bought price (not weighted average)
      await window.api.database.products.updateWithPurchase({
        productId: priceConfirmationData.productId,
        additionalQuantity: priceConfirmationData.quantity,
        purchaseData: purchaseData,
        updateBoughtPrice: false, // false = keep NEW price, true = calculate weighted average
        newSellingPrice: safePrice(form.sellingPrice),
      });

      showToast(
        t("stock.toastUpdateSuccess", "Product updated successfully!"),
        "success",
      );

      // Reset form and close dialog
      setForm(initialForm);
      setShowPriceConfirmation(false);
      setPriceConfirmationData(null);
      
      // Refresh data
      refetchProducts();
      refetchCategories();
    } catch (err) {
      showToast(t("stock.toastAddError", "Failed to add product"), "error");
    } finally {
      setLoading(false);
    }
  };

  // Selling price warning dialog handlers
  const handleSellingPriceWarningConfirm = async () => {
    if (!sellingPriceWarningData) return;
    
    if (sellingPriceWarningData.isMultiMode) {
      // Continue with multi-mode purchase
      await handleFinishPurchaseInternal();
    } else {
      // Continue with single mode
      await handleAddProductInternal();
    }
  };

  const handleSellingPriceWarningCancel = () => {
    // User cancelled, do nothing
    setShowSellingPriceWarning(false);
    setSellingPriceWarningData(null);
  };

  // Internal handlers for after price warning confirmation
  const handleAddProductInternal = async () => {
    setLoading(true);

    try {
      if (isMultiMode) {
        // Add to pending products list
        await window.api.database.categories.ensure(form.categoryName);

        // Check if product already exists
        const existingProduct = products.find(
          (p) =>
            p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
            p.categoryName.toLowerCase() ===
              form.categoryName.toLowerCase().trim(),
        );

        const pendingProduct: PendingProduct = {
          id: Date.now().toString(),
          name: form.name,
          categoryName: form.categoryName,
          quantity: Number(form.quantity || 0),
          boughtPrice: safePrice(form.boughtPrice),
          sellingPrice: safePrice(form.sellingPrice),
          codebar: form.codebar,
          sellerId: form.sellerId,
          photo: form.photo,
          isNewProduct: !existingProduct,
          existingProductId: existingProduct?.id,
        };

        setPendingProducts((prev) => [...prev, pendingProduct]);
        setForm(initialForm);

        showToast(
          t("stock.productAddedToPending", "Product added to purchase list"),
          "success",
        );
      } else {
        // Single product mode - process immediately as before
        await window.api.database.categories.ensure(form.categoryName);

        const existingProduct = products.find(
          (p) =>
            p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
            p.categoryName.toLowerCase() ===
              form.categoryName.toLowerCase().trim(),
        );

        const quantity = Number(form.quantity || 0);
        const boughtPrice = safePrice(form.boughtPrice);
        const purchaseData = {
          sellerId: form.sellerId || undefined,
          quantity: quantity,
          price: boughtPrice,
        };

        if (existingProduct) {
          // Check if the new price is different from the current bought price
          if (isPriceDifferent(boughtPrice, existingProduct.boughtPrice)) {
            // Check for remembered choice first
            const rememberedChoice = localStorage.getItem('priceConfirmationChoice');
            
            if (rememberedChoice) {
              // Automatically apply the remembered choice
              try {
                const purchaseData = {
                  sellerId: form.sellerId || undefined,
                  quantity: quantity,
                  price: boughtPrice,
                };

                if (rememberedChoice === 'weighted') {
                  // Apply weighted average
                  await window.api.database.products.updateWithPurchase({
                    productId: existingProduct.id,
                    additionalQuantity: quantity,
                    purchaseData: purchaseData,
                    updateBoughtPrice: true,
                    newSellingPrice: safePrice(form.sellingPrice),
                  });
                  showToast(
                    t("stock.toastUpdateSuccess", "Product updated successfully with weighted average price!"),
                    "success",
                  );
                } else {
                  // Apply new price
                  await window.api.database.products.updateWithPurchase({
                    productId: existingProduct.id,
                    additionalQuantity: quantity,
                    purchaseData: purchaseData,
                    updateBoughtPrice: false,
                    newSellingPrice: safePrice(form.sellingPrice),
                  });
                  showToast(
                    t("stock.toastUpdateSuccess", "Product updated successfully!"),
                    "success",
                  );
                }

                setForm(initialForm);
                refetchProducts();
                refetchCategories();
                return;
              } catch (err) {
                showToast(t("stock.toastAddError", "Failed to add product"), "error");
                return;
              }
            }
            
            // No remembered choice, show the dialog
            try {
              // Fetch product with purchase history for the dialog
              const productWithHistory = await window.api.database.products.getWithPurchaseHistory(existingProduct.id);
              
              // Show price confirmation dialog
              setPriceConfirmationData({
                productId: existingProduct.id,
                newPrice: boughtPrice,
                previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
                previousSellingPrice: existingProduct.sellingPrice,
                sellerName: sellers.find(s => s.id === form.sellerId)?.name || null,
                quantity: quantity,
                sellerId: form.sellerId,
                purchaseHistory: productWithHistory?.PurchaseItems || [],
              });
              setShowPriceConfirmation(true);
              return; // Don't proceed yet, wait for user decision
            } catch (error) {
              rendererLogger.error("Failed to fetch product history", "AddStockForm", error);
              // Fallback to basic confirmation without history
              setPriceConfirmationData({
                productId: existingProduct.id,
                newPrice: boughtPrice,
                previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
                previousSellingPrice: existingProduct.sellingPrice,
                sellerName: sellers.find(s => s.id === form.sellerId)?.name || null,
                quantity: quantity,
                sellerId: form.sellerId,
                purchaseHistory: [],
              });
              setShowPriceConfirmation(true);
              return;
            }
          }
          
          // Same price, proceed normally
          await window.api.database.products.updateWithPurchase({
            productId: existingProduct.id,
            additionalQuantity: quantity,
            purchaseData: purchaseData,
            updateBoughtPrice: false,
            newSellingPrice: safePrice(form.sellingPrice),
          });
          showToast(
            t("stock.toastUpdateSuccess", "Product updated successfully!"),
            "success",
          );
        } else {
          const productData = {
            name: form.name,
            categoryName: form.categoryName,
            quantity: quantity,
            boughtPrice: safePrice(form.boughtPrice),
            sellingPrice: safePrice(form.sellingPrice),
            codebar: form.codebar,
            photo: form.photo,
          };

          await window.api.database.products.createWithPurchase({
            productData: productData,
            purchaseData: purchaseData,
          });
          showToast(
            t("stock.toastAddSuccess", "Product added successfully!"),
            "success",
          );
        }

        setForm(initialForm);
        refetchProducts();
        refetchCategories();
      }
    } catch (err) {
      showToast(t("stock.toastAddError", "Failed to add product"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishPurchaseInternal = async () => {
    if (pendingProducts.length === 0) {
      showToast(
        t("stock.noPendingProducts", "No products in purchase list"),
        "error",
      );
      return;
    }

    // Validate that all products have required data
    const invalidProducts = pendingProducts.filter(p => 
      !p.name.trim() || !p.categoryName.trim() || p.quantity <= 0 || p.boughtPrice <= 0
    );
    
    if (invalidProducts.length > 0) {
      showToast(
        t("stock.invalidProductsInList", "Some products in the list have invalid data"),
        "error",
      );
      return;
    }

    setFinishingPurchase(true);
    try {
      // Create new products first
      const newProducts = pendingProducts.filter((p) => p.isNewProduct);
      const existingProducts = pendingProducts.filter((p) => !p.isNewProduct);

      const purchaseItems: Array<{
        productId: string;
        quantity: number;
        price: number;
      }> = [];

      // Create new products and collect their IDs
      for (const newProduct of newProducts) {
        await window.api.database.categories.ensure(newProduct.categoryName);

        const productData = {
          name: newProduct.name,
          categoryName: newProduct.categoryName,
          quantity: newProduct.quantity, // Set initial quantity directly
          boughtPrice: safePrice(newProduct.boughtPrice),
          sellingPrice: safePrice(newProduct.sellingPrice),
          codebar: newProduct.codebar,
          photo: newProduct.photo,
        };

        const createdProduct =
          await window.api.database.products.add(productData);
        purchaseItems.push({
          productId: createdProduct.id,
          quantity: newProduct.quantity,
          price: newProduct.boughtPrice,
        });
      }

      // Add existing products to purchase items
      for (const existingProduct of existingProducts) {
        if (existingProduct.existingProductId) {
          purchaseItems.push({
            productId: existingProduct.existingProductId,
            quantity: existingProduct.quantity,
            price: existingProduct.boughtPrice,
          });
        }
      }

      // Create the multi-product purchase
      await window.api.database.purchases.createWithItems({
        sellerId: multiSellerId || undefined,
        items: purchaseItems,
      });

      // Update quantities for existing products only (new products already have correct quantity)
      for (const item of purchaseItems) {
        const isExistingProduct = existingProducts.some(p => p.existingProductId === item.productId);
        if (isExistingProduct) {
          const currentQuantity =
            products.find((p) => p.id === item.productId)?.quantity || 0;
          await window.api.database.products.update(item.productId, {
            quantity: currentQuantity + item.quantity,
          });
        }
      }

      showToast(
        t("stock.purchaseCompletedSuccess", "Purchase completed successfully!"),
        "success",
      );

      // Reset everything
      setPendingProducts([]);
      setMultiSellerId("");
      setForm(initialForm);
      refetchProducts();
      refetchCategories();
    } catch (error) {
      showToast(
        t("stock.purchaseCompletedError", "Failed to complete purchase"),
        "error",
      );
    } finally {
      setFinishingPurchase(false);
    }
  };

  const handleFormChange = (
    key: keyof typeof form,
    value: string | number | string | null,
  ) => {
    // For number fields, allow empty string
    if (["quantity", "boughtPrice", "sellingPrice"].includes(key)) {
      setForm((prev) => ({
        ...prev,
        [key]:
          value === "" ? "" : typeof value === "string" ? Number(value) : value,
      }));
    } else {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (key === "categoryName" && typeof value === "string") {
        const val = value.toLowerCase();
        setFilteredCategories(
          categories.filter((cat) => cat.toLowerCase().includes(val)),
        );
      }
    }
  };

  // Helper to check if form matches an existing product (by name only)
  const isExistingProduct = products.some(
    (p) => p.name.toLowerCase().trim() === form.name.toLowerCase().trim(),
  );

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 border-b border-border cursor-pointer"
        onClick={() => setOpenPanel(openPanel === "add" ? null : "add")}
      >
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-bold text-foreground">
            {t("stock.addTitle", "Add Stock")}
          </h2>
        </div>
        <ChevronUp
          className={`w-5 h-5 transition-transform ${
            openPanel === "add" ? "rotate-180" : ""
          }`}
        />
      </header>
      {openPanel === "add" && (
        <div className="p-6 space-y-6">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-sm">
                  {isMultiMode
                    ? t("stock.multiProductMode", "Multiple Products Mode")
                    : t("stock.singleProductMode", "Single Product Mode")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isMultiMode
                    ? t(
                        "stock.multiModeDesc",
                        "Add products to a list, then finish the purchase",
                      )
                    : t(
                        "stock.singleModeDesc",
                        "Add or update one product at a time",
                      )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {t("stock.singleMode", "Single")}
              </span>
              <Switch
                checked={isMultiMode}
                onCheckedChange={(checked: boolean) => {
                  setIsMultiMode(checked);
                  // Reset forms when switching modes
                  setForm({ ...initialForm, sellerId: "" });
                  setPendingProducts([]);
                  setMultiSellerId("");
                }}
              />
              <span className="text-sm text-muted-foreground">
                {t("stock.multiMode", "Multiple")}
              </span>
            </div>
          </div>

          {/* Main Form */}
          <form onSubmit={handleAddProduct} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label>{t("stock.product")}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t("stock.product")}
                    value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    className="w-full flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                    required
                  />
                  <Popover
                    open={showProductDropdown}
                    onOpenChange={setShowProductDropdown}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="px-3 py-2"
                        onClick={() => {
                          setFilteredProducts(products);
                          setDropdownProductSearch("");
                          setShowProductDropdown(true);
                        }}
                      >
                        {t("stock.chooseProduct", "Choose")}
                        <ChevronDown className="ml-2 w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[250px] p-0 z-50">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder={t("stock.searchProduct")}
                          value={dropdownProductSearch}
                          onValueChange={(value) => {
                            setDropdownProductSearch(value);
                            setFilteredProducts(
                              products.filter((p) =>
                                p.name
                                  .toLowerCase()
                                  .includes(value.toLowerCase()),
                              ),
                            );
                          }}
                        />
                        <CommandList
                          onScroll={(e) => {
                            const el = e.currentTarget;
                            if (
                              el.scrollTop + el.clientHeight >=
                                el.scrollHeight - 10 &&
                              hasMoreProducts &&
                              !loadingMoreProducts
                            ) {
                              handleLoadMoreProducts();
                            }
                          }}
                          style={{ maxHeight: 350, overflowY: "auto" }}
                        >
                          <CommandEmpty>
                            {t("stock.noProduct", "No product found.")}
                          </CommandEmpty>
                          <CommandGroup>
                            {paginatedProducts.map((p) => (
                              <CommandItem
                                key={p.id}
                                value={p.name}
                                onSelect={() => {
                                  // Only update fields that are empty or if user hasn't made changes
                                  setForm(prev => ({
                                    ...prev,
                                    name: p.name,
                                    categoryName: p.categoryName,
                                    // Keep user's quantity if they've entered one
                                    quantity: prev.quantity || "",
                                    // Only update prices if user hasn't entered them
                                    boughtPrice: prev.boughtPrice || (p.boughtPrice ?? ""),
                                    sellingPrice: prev.sellingPrice || (p.sellingPrice ?? ""),
                                    codebar: prev.codebar || p.codebar || "",
                                    // Keep existing seller and photo
                                    sellerId: prev.sellerId || "",
                                    photo: prev.photo || p.photo || null,
                                  }));
                                  setShowProductDropdown(false);
                                }}
                              >
                                {p.name}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    form.name === p.name
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                            {loadingMoreProducts &&
                              Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="px-4 py-2">
                                  <Skeleton className="h-5 w-full" />
                                </div>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  className={isExistingProduct ? "text-muted-foreground" : ""}
                >
                  {t("stock.type")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={t("stock.type")}
                    value={form.categoryName}
                    onChange={(e) =>
                      handleFormChange("categoryName", e.target.value)
                    }
                    className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50"
                    required
                    disabled={isExistingProduct}
                  />
                  <Popover
                    open={showCategoryDropdown}
                    onOpenChange={(open) => {
                      if (!isExistingProduct || !open) {
                        setShowCategoryDropdown(open);
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="px-3 py-2"
                        disabled={isExistingProduct}
                        onClick={() => {
                          if (!isExistingProduct) {
                            setFilteredCategories(categories);
                            setDropdownCategorySearch("");
                            setShowCategoryDropdown(true);
                          }
                        }}
                      >
                        {t("stock.chooseType", "Choose")}
                        <ChevronDown className="ml-2 w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0 z-50">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder={t("stock.searchType")}
                          value={dropdownCategorySearch}
                          onValueChange={(value) => {
                            setDropdownCategorySearch(value);
                            setFilteredCategories(
                              categories.filter((cat) =>
                                cat.toLowerCase().includes(value.toLowerCase()),
                              ),
                            );
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {t("stock.noMatch", "No type found.")}
                          </CommandEmpty>
                          <CommandGroup>
                            {filteredCategories.map((cat) => (
                              <CommandItem
                                key={cat}
                                value={cat}
                                onSelect={(value) => {
                                  handleFormChange("categoryName", value);
                                  setShowCategoryDropdown(false);
                                }}
                              >
                                {cat}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    form.categoryName === cat
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {!isMultiMode && (
                <div className="space-y-2">
                  <label>{t("stock.seller", "Seller")}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("stock.seller", "Seller")}
                      value={
                        sellers.find((s) => s.id === form.sellerId)?.name || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setDropdownSellerSearch(value);
                        setFilteredSellers(
                          sellers.filter((s) =>
                            s.name.toLowerCase().includes(value.toLowerCase()),
                          ),
                        );
                        const matchingSeller = sellers.find(
                          (s) => s.name.toLowerCase() === value.toLowerCase(),
                        );
                        handleFormChange("sellerId", matchingSeller?.id || "");
                      }}
                      className="flex-1 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                    />
                    <Popover
                      open={showSellerDropdown}
                      onOpenChange={setShowSellerDropdown}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="px-3 py-2"
                          onClick={() => {
                            setFilteredSellers(sellers);
                            setDropdownSellerSearch("");
                            setShowSellerDropdown(true);
                          }}
                        >
                          {t("stock.chooseSeller", "Choose")}
                          <ChevronDown className="ml-2 w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0 z-50">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder={t(
                              "stock.searchSeller",
                              "Search seller...",
                            )}
                            value={dropdownSellerSearch}
                            onValueChange={(value) => {
                              setDropdownSellerSearch(value);
                              setFilteredSellers(
                                sellers.filter((s) =>
                                  s.name
                                    .toLowerCase()
                                    .includes(value.toLowerCase()),
                                ),
                              );
                            }}
                          />
                          <CommandList
                            style={{ maxHeight: 200, overflowY: "auto" }}
                          >
                            <CommandEmpty>
                              {t("stock.noSeller", "No seller found.")}
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value=""
                                onSelect={() => {
                                  handleFormChange("sellerId", "");
                                  setShowSellerDropdown(false);
                                }}
                              >
                                {t("stock.noSeller", "No Seller")}
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    !form.sellerId
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                              {filteredSellers.map((seller) => (
                                <CommandItem
                                  key={seller.id}
                                  value={seller.name}
                                  onSelect={() => {
                                    handleFormChange("sellerId", seller.id);
                                    setShowSellerDropdown(false);
                                  }}
                                >
                                  <div className="flex flex-col">
                                    <span>{seller.name}</span>
                                    {seller.phone && (
                                      <span className="text-xs text-muted-foreground">
                                        {seller.phone}
                                      </span>
                                    )}
                                  </div>
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      form.sellerId === seller.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label>{t("stock.quantity")}</label>
                <StyledNumberInput
                  value={form.quantity === "" ? "" : Number(form.quantity)}
                  onChange={(val) => handleFormChange("quantity", val)}
                  placeholder={t("stock.quantity")}
                />
              </div>

              <div className="space-y-2">
                <label>
                  {t("stock.boughtPrice")}
                </label>
                <StyledNumberInput
                  value={
                    form.boughtPrice === "" ? "" : Number(form.boughtPrice)
                  }
                  onChange={(val) => handleFormChange("boughtPrice", val)}
                  placeholder={t("stock.boughtPrice")}
                />
              </div>

              <div className="space-y-2">
                <label>
                  {t("stock.sellingPrice")}
                </label>
                <StyledNumberInput
                  value={
                    form.sellingPrice === "" ? "" : Number(form.sellingPrice)
                  }
                  onChange={(val) => handleFormChange("sellingPrice", val)}
                  placeholder={t("stock.sellingPrice")}
                />
                {/* Warning when selling price is less than bought price */}
                {form.sellingPrice && form.boughtPrice && 
                 Number(form.sellingPrice) > 0 && Number(form.boughtPrice) > 0 &&
                 Number(form.sellingPrice) < Number(form.boughtPrice) && (
                  <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {t("stock.sellingPriceWarningInline", "Warning: Selling price is less than bought price. This will result in a loss.")}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label>
                  {t("stock.codebar")}
                </label>
                <input
                  type="text"
                  placeholder={t("stock.codebar")}
                  value={form.codebar}
                  onChange={(e) => handleFormChange("codebar", e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label>{t("stock.photo", "Product Photo")}</label>
                <ImageUpload
                  value={form.photo}
                  onChange={(value) => handleFormChange("photo", value)}
                  placeholder={t("stock.uploadPhoto")}
                  maxWidth={200}
                  maxHeight={200}
                  quality={0.8}
                />
              </div>
            </div>

            {/* Note for existing product */}
            {isExistingProduct && (
              <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {(() => {
                  const existing = products.find(
                    (p) =>
                      p.name.toLowerCase().trim() ===
                      form.name.toLowerCase().trim(),
                  );
                  return existing
                    ? t("stock.existingProductNote", {
                        quantity: existing.quantity,
                      }) + " - " + t("stock.newPurchaseNote", "New purchase will be recorded with current prices")
                    : null;
                })()}
              </div>
            )}

            <hr />

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    {t("stock.adding", "Adding...")}
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    {isMultiMode
                      ? t("stock.addToList", "Add to List")
                      : t("stock.addButton", "Add Product")}
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(initialForm);
                  if (isMultiMode) {
                    setPendingProducts([]);
                    setMultiSellerId("");
                  }
                }}
                className="text-muted-foreground"
              >
                {t("stock.reset", "Reset")}
              </Button>
            </div>
          </form>

          {/* Pending Products List (Multi Mode) */}
          {isMultiMode && pendingProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  {t("stock.pendingProducts", "Products in Purchase")} (
                  {pendingProducts.length})
                </h3>
                <div className="text-sm text-muted-foreground">
                  {t("stock.totalValue", "Total Value")}:{" "}
                  {pendingProducts
                      .reduce((sum, p) => sum + safeMultiply(p.quantity, p.boughtPrice), 0)
                    .toLocaleString()}{" "}
                  {t("cashier.currency")}
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg">
                {pendingProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-muted/20 border-b border-border last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        {product.isNewProduct && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                            {t("stock.new", "New")}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {product.categoryName} • {product.quantity} units @{" "}
                        {product.boughtPrice} ={" "}
                        {safeMultiply(product.quantity, product.boughtPrice).toLocaleString()}{" "}
                        {t("cashier.currency")}
                        {product.sellingPrice > 0 && product.sellingPrice < product.boughtPrice && (
                          <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                            ⚠️ {t("stock.lossWarning", "Loss")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePendingProduct(product.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Multi-mode Seller Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("stock.seller", "Seller")} (
                    {t("stock.forAllProducts", "for all products")})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("stock.seller", "Seller")}
                      value={
                        sellers.find((s) => s.id === multiSellerId)?.name || ""
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        const matchingSeller = sellers.find(
                          (s) => s.name.toLowerCase() === value.toLowerCase(),
                        );
                        setMultiSellerId(matchingSeller?.id || "");
                      }}
                      className="flex-1 px-3 py-2 rounded border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          {t("stock.choose", "Choose")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0">
                        <Command>
                          <CommandInput
                            placeholder={t(
                              "stock.searchSeller",
                              "Search seller...",
                            )}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {t("stock.noSeller", "No seller found.")}
                            </CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => setMultiSellerId("")}
                              >
                                {t("stock.noSeller", "No Seller")}
                              </CommandItem>
                              {sellers.map((seller) => (
                                <CommandItem
                                  key={seller.id}
                                  onSelect={() => setMultiSellerId(seller.id)}
                                >
                                  {seller.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleFinishPurchase}
                    disabled={finishingPurchase}
                    className="bg-green-600 hover:bg-green-700 text-white w-full"
                  >
                    {finishingPurchase ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {t("stock.completing", "Completing...")}
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {t("stock.finishPurchase", "Finish Purchase")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Price Confirmation Dialog */}
      <PriceConfirmationDialog
        open={showPriceConfirmation}
        onOpenChange={setShowPriceConfirmation}
        newPrice={priceConfirmationData?.newPrice || 0}
        previousPrice={priceConfirmationData?.previousPrice || 0}
        newSellingPrice={priceConfirmationData?.newSellingPrice || 0}
        previousSellingPrice={priceConfirmationData?.previousSellingPrice || 0}
        sellerName={priceConfirmationData?.sellerName || null}
          purchaseHistory={priceConfirmationData?.purchaseHistory || []}
        onCalculateWeightedAverage={handleCalculateWeightedAverage}
        onKeepNewPrice={handleKeepNewPrice}
      />

        {/* Selling Price Warning Dialog */}
        <SellingPriceWarningDialog
          open={showSellingPriceWarning}
          onOpenChange={setShowSellingPriceWarning}
          sellingPrice={sellingPriceWarningData?.sellingPrice || 0}
          boughtPrice={sellingPriceWarningData?.boughtPrice || 0}
          onConfirm={handleSellingPriceWarningConfirm}
          onCancel={handleSellingPriceWarningCancel}
          isMultiMode={sellingPriceWarningData?.isMultiMode || false}
          productCount={sellingPriceWarningData?.productCount}
        />
    </section>
  );
}
