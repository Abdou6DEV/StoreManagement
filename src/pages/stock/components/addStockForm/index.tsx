import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useStock } from "../../../../lib/contexts/stockContext";
import { Product } from "@prisma/client";
import StyledNumberInput from "../../../../lib/components/inputNumber";
import { Button } from "../../../../lib/components/button";
import { AlertTriangle, Loader2, Package, ChevronUp } from "lucide-react";
import { ImageUpload } from "../../../../lib/components/imageUpload";
import type { AddStockFormState } from "../../../../types";
import { useToast } from "../../../../lib/contexts/toastContext";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import { PriceConfirmationDialog } from "../priceConfirmationDialog";
import { SellingPriceWarningDialog } from "../sellingPriceWarningDialog";

// Import the new components
import ModeToggle from "./ModeToggle";
import ProductSelection from "./ProductSelection";
import CategorySelection from "./CategorySelection";
import SellerSelection from "./SellerSelection";
import PendingProductsList from "./PendingProductsList";

// Helper function for safe price calculations with 2 decimal precision
const safePrice = (value: number | string | undefined): number => {
  const num = Number(value || 0);
  return parseFloat(num.toFixed(2));
};

// Helper function for safe price comparison with tolerance
const isPriceDifferent = (price1: number, price2: number): boolean => {
  return Math.abs(price1 - price2) > 0.01;
};

const initialForm: AddStockFormState = {
  name: "",
  categoryName: "",
  quantity: "",
  boughtPrice: "",
  sellingPrice: "",
  codebar: "",
  sellerId: "",
  sellerName: "",
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
  priceStrategy?: 'weighted' | 'new'; // Track the chosen price strategy
  originalBoughtPrice?: number; // Store the original price for weighted calculation
  actualPurchasePrice?: number; // Store the actual price paid for this purchase
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
  const [multiSellerName, setMultiSellerName] = useState("");

  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [dropdownProductSearch, setDropdownProductSearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [filteredCategories, setFilteredCategories] =
    useState<string[]>([]);
  const [dropdownCategorySearch, setDropdownCategorySearch] = useState("");
  const [showSellerDropdown, setShowSellerDropdown] = useState(false);
  const [sellers, setSellers] = useState<
    {
      id: string;
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    }[]
  >([]);
  const [filteredSellers, setFilteredSellers] = useState<
    {
      id: string;
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    }[]
  >([]);
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

  // Initialize filtered categories when categories are loaded
  React.useEffect(() => {
    if (categories.length > 0) {
      setFilteredCategories(categories);
    }
  }, [categories]);

  // Close dropdowns when clicking outside or on other form elements
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is on a dropdown item (don't close if clicking on dropdown items)
      if (target.closest('[data-product-dropdown]') || 
          target.closest('[data-category-dropdown]') || 
          target.closest('[data-seller-dropdown]')) {
        return;
      }
      
      // Close all dropdowns if clicking anywhere else
      setShowProductDropdown(false);
      setShowCategoryDropdown(false);
      setShowSellerDropdown(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Enter key handler to focus on product name when no input is focused
  React.useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle Enter key
      if (event.key !== 'Enter') return;
      
      // Check if any input/textarea/button is currently focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'BUTTON' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      // If no input is focused, focus on product name field
      if (!isInputFocused) {
        event.preventDefault();
        const productNameInput = document.querySelector('[data-field="product-name"]') as HTMLInputElement;
        if (productNameInput) {
          productNameInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

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
      showToast(
        t(
          "stock.quantityRequired",
          "Quantity is required and must be greater than 0"
        ),
        "error"
      );
      return;
    }

    if (!form.name.trim()) {
      showToast(t("stock.nameRequired", "Product name is required"), "error");
      return;
    }

    if (!form.categoryName.trim()) {
      showToast(
        t("stock.categoryRequired", "Product category is required"),
        "error"
      );
      return;
    }

    if (!form.boughtPrice || Number(form.boughtPrice) <= 0) {
      showToast(
        t(
          "stock.boughtPriceRequired",
          "Bought price is required and must be greater than 0"
        ),
        "error"
      );
      return;
    }

    // Check if seller name was entered but doesn't exist, and create it if needed
    let sellerIdToUse = form.sellerId;
    if (form.sellerId === "" && form.sellerName) {
      const sellerName = form.sellerName.trim();
      if (
        sellerName &&
        !sellers.find((s) => s.name.toLowerCase() === sellerName.toLowerCase())
      ) {
        try {
          const newSeller = await window.api.database.sellers.create({
            name: sellerName,
          });

          // Add to local sellers list
          setSellers((prev) => [...prev, newSeller]);
          setFilteredSellers((prev) => [...prev, newSeller]);

          // Use the new seller ID directly and update form state
          sellerIdToUse = newSeller.id;
          form.sellerId = newSeller.id; // Force update the form object directly

          console.log("DEBUG: Created seller with ID:", newSeller.id);
          console.log("DEBUG: Will use sellerId:", sellerIdToUse);
          console.log("DEBUG: form.sellerId is now:", form.sellerId);

          showToast(
            t("stock.sellerCreated", "New seller created successfully"),
            "success"
          );
        } catch (error) {
          rendererLogger.error(
            "Failed to create seller",
            "AddStockForm",
            error
          );
          showToast(
            t("stock.sellerCreateError", "Failed to create seller"),
            "error"
          );
          return;
        }
      }
    }

    // Check if selling price is less than bought price
    if (
      form.sellingPrice &&
      Number(form.sellingPrice) > 0 &&
      Number(form.sellingPrice) < Number(form.boughtPrice)
    ) {
      setSellingPriceWarningData({
        sellingPrice: Number(form.sellingPrice),
        boughtPrice: Number(form.boughtPrice),
        isMultiMode: false,
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
              form.categoryName.toLowerCase().trim()
        );

        // Check if existing product has different bought price (like in single mode)
        if (existingProduct && isPriceDifferent(safePrice(form.boughtPrice), existingProduct.boughtPrice)) {
          // Check for remembered choice first
          const rememberedChoice = localStorage.getItem("priceConfirmationChoice");

          if (rememberedChoice) {
            // Automatically apply the remembered choice
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
              isNewProduct: false,
              existingProductId: existingProduct.id,
            };

            setPendingProducts((prev) => [...prev, pendingProduct]);
            setForm(initialForm);

            showToast(
              t("stock.productAddedToPending", "Product added to purchase list"),
              "success"
            );
            return;
          }

          // No remembered choice, show the price confirmation dialog
          try {
            // Fetch product with purchase history for the dialog
            const productWithHistory = await window.api.database.products.getWithPurchaseHistory(existingProduct.id);

            // Show price confirmation dialog
            setPriceConfirmationData({
              productId: existingProduct.id,
              newPrice: safePrice(form.boughtPrice),
              previousPrice: existingProduct.boughtPrice,
              newSellingPrice: safePrice(form.sellingPrice),
              previousSellingPrice: existingProduct.sellingPrice,
              sellerName: sellers.find((s) => s.id === form.sellerId)?.name || null,
              quantity: Number(form.quantity || 0),
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
              newPrice: safePrice(form.boughtPrice),
              previousPrice: existingProduct.boughtPrice,
              newSellingPrice: safePrice(form.sellingPrice),
              previousSellingPrice: existingProduct.sellingPrice,
              sellerName: sellers.find((s) => s.id === form.sellerId)?.name || null,
              quantity: Number(form.quantity || 0),
              sellerId: form.sellerId,
              purchaseHistory: [],
            });
            setShowPriceConfirmation(true);
            return;
          }
        }

        // Same price or new product, proceed normally
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
          "success"
        );
      } else {
        // Single product mode - process immediately as before
        await window.api.database.categories.ensure(form.categoryName);

        const existingProduct = products.find(
          (p) =>
            p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
            p.categoryName.toLowerCase() ===
              form.categoryName.toLowerCase().trim()
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
            const rememberedChoice = localStorage.getItem(
              "priceConfirmationChoice"
            );

            if (rememberedChoice) {
              // Automatically apply the remembered choice
              try {
                const purchaseData = {
                  sellerId: form.sellerId || undefined,
                  quantity: quantity,
                  price: boughtPrice,
                };

                if (rememberedChoice === "weighted") {
                  // Apply weighted average
                  await window.api.database.products.updateWithPurchase({
                    productId: existingProduct.id,
                    additionalQuantity: quantity,
                    purchaseData: purchaseData,
                    updateBoughtPrice: true,
                    newSellingPrice: safePrice(form.sellingPrice),
                  });
                  showToast(
                    t(
                      "stock.toastUpdateSuccess",
                      "Product updated successfully with weighted average price!"
                    ),
                    "success"
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
                    t(
                      "stock.toastUpdateSuccess",
                      "Product updated successfully!"
                    ),
                    "success"
                  );
                }

                setForm(initialForm);
                refetchProducts();
                refetchCategories();
                return;
              } catch (err) {
                showToast(
                  t("stock.toastAddError", "Failed to add product"),
                  "error"
                );
                return;
              }
            }

            // No remembered choice, show the dialog
            try {
              // Fetch product with purchase history for the dialog
              const productWithHistory =
                await window.api.database.products.getWithPurchaseHistory(
                  existingProduct.id
                );

              // Show price confirmation dialog
              setPriceConfirmationData({
                productId: existingProduct.id,
                newPrice: boughtPrice,
                previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
                previousSellingPrice: existingProduct.sellingPrice,
                sellerName:
                  sellers.find((s) => s.id === form.sellerId)?.name || null,
                quantity: quantity,
                sellerId: form.sellerId,
                purchaseHistory: productWithHistory?.PurchaseItems || [],
              });
              setShowPriceConfirmation(true);
              return; // Don't proceed yet, wait for user decision
            } catch (error) {
              rendererLogger.error(
                "Failed to fetch product history",
                "AddStockForm",
                error
              );
              // Fallback to basic confirmation without history
              setPriceConfirmationData({
                productId: existingProduct.id,
                newPrice: boughtPrice,
                previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
                previousSellingPrice: existingProduct.sellingPrice,
                sellerName:
                  sellers.find((s) => s.id === form.sellerId)?.name || null,
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
            "success"
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
            "success"
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
        "error"
      );
      return;
    }

    // Validate seller selection
    if (!multiSellerId && !multiSellerName) {
      showToast(
        t("stock.sellerRequired", "Please select a seller for the purchase"),
        "error"
      );
      return;
    }

    // Check if seller name was entered but doesn't exist, and create it if needed
    if (multiSellerId === "" && multiSellerName) {
      const sellerName = multiSellerName.trim();
      if (
        sellerName &&
        !sellers.find((s) => s.name.toLowerCase() === sellerName.toLowerCase())
      ) {
        try {
          const newSeller = await window.api.database.sellers.create({
            name: sellerName,
          });

          // Add to local sellers list
          setSellers((prev) => [...prev, newSeller]);
          setFilteredSellers((prev) => [...prev, newSeller]);

          // Update multiSellerId so purchase uses it
          setMultiSellerId(newSeller.id);

          showToast(
            t("stock.sellerCreated", "New seller created successfully"),
            "success"
          );
        } catch (error) {
          rendererLogger.error(
            "Failed to create seller",
            "AddStockForm",
            error
          );
          showToast(
            t("stock.sellerCreateError", "Failed to create seller"),
            "error"
          );
          return;
        }
      }
    }

    // Validate that all products have required data
    const invalidProducts = pendingProducts.filter(
      (p) =>
        !p.name.trim() ||
        !p.categoryName.trim() ||
        p.quantity <= 0 ||
        p.boughtPrice <= 0
    );

    // Check for products with selling price less than bought price
    const lossProducts = pendingProducts.filter(
      (p) =>
        p.sellingPrice > 0 &&
        p.boughtPrice > 0 &&
        p.sellingPrice < p.boughtPrice
    );

    if (lossProducts.length > 0) {
      setSellingPriceWarningData({
        sellingPrice: 0, // Not relevant for multi-mode
        boughtPrice: 0, // Not relevant for multi-mode
        isMultiMode: true,
        productCount: lossProducts.length,
      });
      setShowSellingPriceWarning(true);
      return; // Wait for user decision
    }

    if (invalidProducts.length > 0) {
      showToast(
        t(
          "stock.invalidProductsInList",
          "Some products in the list have invalid data"
        ),
        "error"
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

      // Process existing products with their chosen price strategies
      for (const existingProduct of existingProducts) {
        if (existingProduct.existingProductId) {
          try {
            // Get current product data
            const currentProduct = products.find(p => p.id === existingProduct.existingProductId);
            const currentQuantity = currentProduct?.quantity || 0;
            
            // Update the product with new quantity and price
            await window.api.database.products.update(existingProduct.existingProductId, {
              quantity: currentQuantity + existingProduct.quantity,
              boughtPrice: existingProduct.boughtPrice, // Use the calculated price from pending list
              sellingPrice: safePrice(existingProduct.sellingPrice),
            });

            // Create the purchase record separately
            const purchaseData = {
              sellerId: multiSellerId || undefined,
              quantity: existingProduct.quantity,
              price: existingProduct.actualPurchasePrice || existingProduct.boughtPrice, // Use the actual price paid
            };

            // Add to purchase items for record keeping
            purchaseItems.push({
              productId: existingProduct.existingProductId,
              quantity: existingProduct.quantity,
              price: purchaseData.price,
            });
          } catch (productError) {
            rendererLogger.error(
              `Failed to update product ${existingProduct.name}`,
              "AddStockForm",
              productError
            );
            showToast(
              t("stock.productUpdateError", `Failed to update product: ${existingProduct.name}`),
              "error"
            );
            throw productError; // Re-throw to stop the entire process
          }
        }
      }

      // Create the multi-product purchase
      if (purchaseItems.length > 0) {
        try {
          await window.api.database.purchases.createWithItems({
            sellerId: multiSellerId || undefined,
            items: purchaseItems,
          });
          
          showToast(
            t("stock.purchaseCompletedSuccess", "Purchase completed successfully!"),
            "success"
          );
        } catch (purchaseError) {
          rendererLogger.error(
            "Failed to create purchase record",
            "AddStockForm",
            purchaseError
          );
          showToast(
            t("stock.purchaseRecordError", "Products updated but purchase record failed"),
            "error"
          );
        }
      } else {
        showToast(
          t("stock.noPurchaseItems", "No purchase items to record"),
          "error"
        );
      }

      // Reset everything
      setPendingProducts([]);
      setMultiSellerId("");
      setForm(initialForm);
      refetchProducts();
      refetchCategories();
    } catch (error) {
      showToast(
        t("stock.purchaseCompletedError", "Failed to complete purchase"),
        "error"
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

      if (isMultiMode) {
        // Multi-mode: Add to pending list with weighted average preference
        // For weighted average, we need to calculate the actual weighted price
        const existingProduct = products.find(p => p.id === priceConfirmationData.productId);
        const currentQuantity = existingProduct?.quantity || 0;
        const currentPrice = existingProduct?.boughtPrice || 0;
        const newQuantity = priceConfirmationData.quantity;
        const newPrice = priceConfirmationData.newPrice;
        
        // Calculate weighted average price
        const totalValue = (currentQuantity * currentPrice) + (newQuantity * newPrice);
        const totalQuantity = currentQuantity + newQuantity;
        const weightedPrice = totalQuantity > 0 ? totalValue / totalQuantity : newPrice;
        
        const pendingProduct: PendingProduct = {
          id: Date.now().toString(),
          name: form.name,
          categoryName: form.categoryName,
          quantity: priceConfirmationData.quantity,
          boughtPrice: weightedPrice, // Use calculated weighted price
          sellingPrice: safePrice(form.sellingPrice),
          codebar: form.codebar,
          sellerId: priceConfirmationData.sellerId,
          photo: form.photo,
          isNewProduct: false,
          existingProductId: priceConfirmationData.productId,
          priceStrategy: 'weighted',
          originalBoughtPrice: currentPrice,
          actualPurchasePrice: newPrice, // Store the actual price paid
        };

        setPendingProducts((prev) => [...prev, pendingProduct]);
        setForm(initialForm);

        showToast(
          t("stock.productAddedToPending", "Product added to purchase list"),
          "success"
        );
      } else {
        // Single mode: Update directly in database
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
          t(
            "stock.toastUpdateSuccess",
            "Product updated successfully with weighted average price!"
          ),
          "success"
        );

        // Refresh data
        refetchProducts();
        refetchCategories();
      }

      // Reset form and close dialog
      setForm(initialForm);
      setShowPriceConfirmation(false);
      setPriceConfirmationData(null);
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

      if (isMultiMode) {
        // Multi-mode: Add to pending list with new price preference
        const existingProduct = products.find(p => p.id === priceConfirmationData.productId);
        
        const pendingProduct: PendingProduct = {
          id: Date.now().toString(),
          name: form.name,
          categoryName: form.categoryName,
          quantity: priceConfirmationData.quantity,
          boughtPrice: priceConfirmationData.newPrice, // Use new price directly
          sellingPrice: safePrice(form.sellingPrice),
          codebar: form.codebar,
          sellerId: priceConfirmationData.sellerId,
          photo: form.photo,
          isNewProduct: false,
          existingProductId: priceConfirmationData.productId,
          priceStrategy: 'new',
          originalBoughtPrice: existingProduct?.boughtPrice || 0,
          actualPurchasePrice: priceConfirmationData.newPrice, // Store the actual price paid
        };

        setPendingProducts((prev) => [...prev, pendingProduct]);
        setForm(initialForm);

        showToast(
          t("stock.productAddedToPending", "Product added to purchase list"),
          "success"
        );
      } else {
        // Single mode: Update directly in database
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
          "success"
        );

        // Refresh data
        refetchProducts();
        refetchCategories();
      }

      // Reset form and close dialog
      setForm(initialForm);
      setShowPriceConfirmation(false);
      setPriceConfirmationData(null);
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
              form.categoryName.toLowerCase().trim()
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
          "success"
        );
      } else {
        // Single product mode - process immediately as before
        await window.api.database.categories.ensure(form.categoryName);

        const existingProduct = products.find(
          (p) =>
            p.name.toLowerCase().trim() === form.name.toLowerCase().trim() &&
            p.categoryName.toLowerCase() ===
              form.categoryName.toLowerCase().trim()
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
            const rememberedChoice = localStorage.getItem(
              "priceConfirmationChoice"
            );

            if (rememberedChoice) {
              // Automatically apply the remembered choice
              try {
                const purchaseData = {
                  sellerId: form.sellerId || undefined,
                  quantity: quantity,
                  price: boughtPrice,
                };

                if (rememberedChoice === "weighted") {
                  // Apply weighted average
                  await window.api.database.products.updateWithPurchase({
                    productId: existingProduct.id,
                    additionalQuantity: quantity,
                    purchaseData: purchaseData,
                    updateBoughtPrice: true,
                    newSellingPrice: safePrice(form.sellingPrice),
                  });
                  showToast(
                    t(
                      "stock.toastUpdateSuccess",
                      "Product updated successfully with weighted average price!"
                    ),
                    "success"
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
                    t(
                      "stock.toastUpdateSuccess",
                      "Product updated successfully!"
                    ),
                    "success"
                  );
                }

                setForm(initialForm);
                refetchProducts();
                refetchCategories();
                return;
              } catch (err) {
                showToast(
                  t("stock.toastAddError", "Failed to add product"),
                  "error"
                );
                return;
              }
            }

            // No remembered choice, show the dialog
            try {
              // Fetch product with purchase history for the dialog
              const productWithHistory =
                await window.api.database.products.getWithPurchaseHistory(
                  existingProduct.id
                );

              // Show price confirmation dialog
              setPriceConfirmationData({
                productId: existingProduct.id,
                newPrice: boughtPrice,
                previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
                previousSellingPrice: existingProduct.sellingPrice,
                sellerName:
                  sellers.find((s) => s.id === form.sellerId)?.name || null,
                quantity: quantity,
                sellerId: form.sellerId,
                purchaseHistory: productWithHistory?.PurchaseItems || [],
              });
              setShowPriceConfirmation(true);
              return; // Don't proceed yet, wait for user decision
            } catch (error) {
              rendererLogger.error(
                "Failed to fetch product history",
                "AddStockForm",
                error
              );
              // Fallback to basic confirmation without history
              setPriceConfirmationData({
                productId: existingProduct.id,
                newPrice: boughtPrice,
                previousPrice: existingProduct.boughtPrice,
                newSellingPrice: safePrice(form.sellingPrice),
                previousSellingPrice: existingProduct.sellingPrice,
                sellerName:
                  sellers.find((s) => s.id === form.sellerId)?.name || null,
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
            "success"
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
            "success"
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
        "error"
      );
      return;
    }

    // Validate that all products have required data
    const invalidProducts = pendingProducts.filter(
      (p) =>
        !p.name.trim() ||
        !p.categoryName.trim() ||
        p.quantity <= 0 ||
        p.boughtPrice <= 0
    );

    if (invalidProducts.length > 0) {
      showToast(
        t(
          "stock.invalidProductsInList",
          "Some products in the list have invalid data"
        ),
        "error"
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

      // Process existing products with their chosen price strategies
      for (const existingProduct of existingProducts) {
        if (existingProduct.existingProductId) {
          try {
            // Get current product data
            const currentProduct = products.find(p => p.id === existingProduct.existingProductId);
            const currentQuantity = currentProduct?.quantity || 0;
            
            // Update the product with new quantity and price
            await window.api.database.products.update(existingProduct.existingProductId, {
              quantity: currentQuantity + existingProduct.quantity,
              boughtPrice: existingProduct.boughtPrice, // Use the calculated price from pending list
              sellingPrice: safePrice(existingProduct.sellingPrice),
            });

            // Create the purchase record separately
            const purchaseData = {
              sellerId: multiSellerId || undefined,
              quantity: existingProduct.quantity,
              price: existingProduct.actualPurchasePrice || existingProduct.boughtPrice, // Use the actual price paid
            };

            // Add to purchase items for record keeping
            purchaseItems.push({
              productId: existingProduct.existingProductId,
              quantity: existingProduct.quantity,
              price: purchaseData.price,
            });
          } catch (productError) {
            rendererLogger.error(
              `Failed to update product ${existingProduct.name}`,
              "AddStockForm",
              productError
            );
            showToast(
              t("stock.productUpdateError", `Failed to update product: ${existingProduct.name}`),
              "error"
            );
            throw productError; // Re-throw to stop the entire process
          }
        }
      }

      // Create the multi-product purchase
      if (purchaseItems.length > 0) {
        try {
          await window.api.database.purchases.createWithItems({
            sellerId: multiSellerId || undefined,
            items: purchaseItems,
          });
          
          showToast(
            t("stock.purchaseCompletedSuccess", "Purchase completed successfully!"),
            "success"
          );
        } catch (purchaseError) {
          rendererLogger.error(
            "Failed to create purchase record",
            "AddStockForm",
            purchaseError
          );
          showToast(
            t("stock.purchaseRecordError", "Products updated but purchase record failed"),
            "error"
          );
        }
      } else {
        showToast(
          t("stock.noPurchaseItems", "No purchase items to record"),
          "error"
        );
      }

      // Reset everything
      setPendingProducts([]);
      setMultiSellerId("");
      setForm(initialForm);
      refetchProducts();
      refetchCategories();
    } catch (error) {
      showToast(
        t("stock.purchaseCompletedError", "Failed to complete purchase"),
        "error"
      );
    } finally {
      setFinishingPurchase(false);
    }
  };

  const handleFormChange = (
    key: keyof typeof form,
    value: string | number | string | null
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
          categories.filter((cat) => cat.toLowerCase().includes(val))
        );
      }
    }
  };

  // Helper to check if form matches an existing product (by name only)
  const isExistingProduct = products.some(
    (p) => p.name.toLowerCase().trim() === form.name.toLowerCase().trim()
  );

  // Handler for product selection
  const handleProductSelect = (product: Product) => {
    setForm((prev) => ({
      ...prev,
      name: product.name,
      categoryName: product.categoryName,
      // Reset quantity to empty for new selection
      quantity: "",
      // Update prices with product's current prices
      boughtPrice: product.boughtPrice ?? "",
      sellingPrice: product.sellingPrice ?? "",
      // Update codebar if available
      codebar: product.codebar || "",
      // Keep existing seller and photo (user preference)
      sellerId: prev.sellerId || "",
      photo: prev.photo || product.photo || null,
    }));
    setShowProductDropdown(false);
    
    // Auto-focus on next appropriate field after product selection
    setTimeout(() => {
      if (isMultiMode) {
        // In multi-mode, focus on quantity field (skip seller)
        const quantityInput = document.querySelector('[data-field="quantity"]') as HTMLInputElement;
        if (quantityInput) {
          quantityInput.focus();
        }
      } else {
        // In single mode, focus on seller field
        const sellerInput = document.querySelector('[data-field="seller-name"]') as HTMLInputElement;
        if (sellerInput) {
          sellerInput.focus();
        }
      }
    }, 100);
  };

  // Handler to close other dropdowns when focusing on a field
  const handleFieldFocus = (fieldType: 'product' | 'category' | 'seller' | 'quantity' | 'bought-price' | 'selling-price' | 'codebar') => {
    if (fieldType !== 'product') setShowProductDropdown(false);
    if (fieldType !== 'category') setShowCategoryDropdown(false);
    if (fieldType !== 'seller') setShowSellerDropdown(false);
  };

  // Handler for category selection
  const handleCategorySelect = (category: string) => {
    handleFormChange("categoryName", category);
  };

  // Handler for seller selection
  const handleSellerSelect = (sellerId: string) => {
    handleFormChange("sellerId", sellerId);
  };

  // Handler for mode change
  const handleModeChange = () => {
    // Reset forms when switching modes
    setForm({ ...initialForm, sellerId: "" });
    setPendingProducts([]);
    setMultiSellerId("");
    setMultiSellerName("");
    
    // Focus on product name field after mode change
    setTimeout(() => {
      const productNameInput = document.querySelector('[data-field="product-name"]') as HTMLInputElement;
      if (productNameInput) {
        productNameInput.focus();
      }
    }, 100); // Small delay to ensure the form is fully rendered
  };

  // Smart tab system functions
  const focusNextField = (currentField: string) => {
    // Dynamic field order based on mode
    const fieldOrder = isMultiMode 
      ? [
          'product-name',
          'category-name', 
          'quantity',
          'bought-price',
          'selling-price',
          'codebar',
          'add-button'
        ]
      : [
          'product-name',
          'category-name', 
          'seller-name',
          'quantity',
          'bought-price',
          'selling-price',
          'codebar',
          'add-button'
        ];
    
    const currentIndex = fieldOrder.indexOf(currentField);
    if (currentIndex === -1 || currentIndex === fieldOrder.length - 1) {
      return;
    }
    
    const nextField = fieldOrder[currentIndex + 1];
    
    if (nextField === 'add-button') {
      const addButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (addButton) {
        addButton.focus();
      }
    } else {
      const nextInput = document.querySelector(`[data-field="${nextField}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  const focusPreviousField = (currentField: string) => {
    // Dynamic field order based on mode (same as focusNextField)
    const fieldOrder = isMultiMode 
      ? [
          'product-name',
          'category-name', 
          'quantity',
          'bought-price',
          'selling-price',
          'codebar',
          'add-button'
        ]
      : [
          'product-name',
          'category-name', 
          'seller-name',
          'quantity',
          'bought-price',
          'selling-price',
          'codebar',
          'add-button'
        ];
    
    const currentIndex = fieldOrder.indexOf(currentField);
    if (currentIndex <= 0) return;
    
    const prevField = fieldOrder[currentIndex - 1];
    const prevInput = document.querySelector(`[data-field="${prevField}"]`) as HTMLInputElement;
    if (prevInput) {
      prevInput.focus();
    }
  };

  // Handler for opening the add stock panel and focusing on product name
  const handleOpenPanel = () => {
    const newPanelState = openPanel === "add" ? null : "add";
    setOpenPanel(newPanelState);
    
    // If opening the panel, focus on product name field after a short delay
    if (newPanelState === "add") {
      setTimeout(() => {
        const productNameInput = document.querySelector('[data-field="product-name"]') as HTMLInputElement;
        if (productNameInput) {
          productNameInput.focus();
        }
      }, 100); // Small delay to ensure the panel is fully rendered
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 border-b border-border cursor-pointer"
        onClick={handleOpenPanel}
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
          <ModeToggle
            isMultiMode={isMultiMode}
            setIsMultiMode={setIsMultiMode}
            onModeChange={handleModeChange}
          />

          {/* Main Form */}
                     <form 
             onSubmit={handleAddProduct}
             className="space-y-6"
           >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                             <ProductSelection
                 form={form}
                 showProductDropdown={showProductDropdown}
                 setShowProductDropdown={setShowProductDropdown}
                 filteredProducts={filteredProducts}
                 setFilteredProducts={setFilteredProducts}
                 dropdownProductSearch={dropdownProductSearch}
                 setDropdownProductSearch={setDropdownProductSearch}
                 products={products}
                 paginatedProducts={paginatedProducts}
                 loadingMoreProducts={loadingMoreProducts}
                 hasMoreProducts={hasMoreProducts}
                 handleLoadMoreProducts={handleLoadMoreProducts}
                 onProductSelect={handleProductSelect}
                 onFormChange={handleFormChange}
                 onNextField={() => focusNextField('product-name')}
                 onFieldFocus={() => handleFieldFocus('product')}
               />

                             <CategorySelection
                 form={form}
                 isExistingProduct={isExistingProduct}
                 showCategoryDropdown={showCategoryDropdown}
                 setShowCategoryDropdown={setShowCategoryDropdown}
                 filteredCategories={filteredCategories}
                 setFilteredCategories={setFilteredCategories}
                 categories={categories}
                 onCategorySelect={handleCategorySelect}
                 onFormChange={handleFormChange}
                 onNextField={() => focusNextField('category-name')}
                 onFieldFocus={() => handleFieldFocus('category')}
               />

              {!isMultiMode && (
                                 <SellerSelection
                   form={form}
                   showSellerDropdown={showSellerDropdown}
                   setShowSellerDropdown={setShowSellerDropdown}
                   sellers={sellers}
                   filteredSellers={filteredSellers}
                   setFilteredSellers={setFilteredSellers}
                   dropdownSellerSearch={dropdownSellerSearch}
                   setDropdownSellerSearch={setDropdownSellerSearch}
                   onSellerSelect={handleSellerSelect}
                   onFormChange={handleFormChange}
                                     onNextField={() => focusNextField('seller-name')}
                   onFieldFocus={() => handleFieldFocus('seller')}
                 />
              )}

                             <div className="space-y-2">
                 <label>{t("stock.quantity")}</label>
                 <StyledNumberInput
                   data-field="quantity"
                   value={form.quantity === "" ? "" : Number(form.quantity)}
                   onChange={(val) => handleFormChange("quantity", val)}
                   placeholder={t("stock.quantity")}
                   onKeyDown={(e: React.KeyboardEvent) => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       focusNextField('quantity');
                     }
                   }}
                   onFocus={() => handleFieldFocus('quantity')}
                 />
               </div>

                             <div className="space-y-2">
                 <label>{t("stock.boughtPrice")}</label>
                 <StyledNumberInput
                   data-field="bought-price"
                   value={
                     form.boughtPrice === "" ? "" : Number(form.boughtPrice)
                   }
                   onChange={(val) => handleFormChange("boughtPrice", val)}
                   placeholder={t("stock.boughtPrice")}
                   onKeyDown={(e: React.KeyboardEvent) => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       focusNextField('bought-price');
                     }
                   }}
                   onFocus={() => handleFieldFocus('bought-price')}
                 />
               </div>

                             <div className="space-y-2">
                 <label>{t("stock.sellingPrice")}</label>
                 <StyledNumberInput
                   data-field="selling-price"
                   value={
                     form.sellingPrice === "" ? "" : Number(form.sellingPrice)
                   }
                   onChange={(val) => handleFormChange("sellingPrice", val)}
                   placeholder={t("stock.sellingPrice")}
                   onKeyDown={(e: React.KeyboardEvent) => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       focusNextField('selling-price');
                     }
                   }}
                   onFocus={() => handleFieldFocus('selling-price')}
                 />
                {/* Warning when selling price is less than bought price */}
                {form.sellingPrice &&
                  form.boughtPrice &&
                  Number(form.sellingPrice) > 0 &&
                  Number(form.boughtPrice) > 0 &&
                  Number(form.sellingPrice) < Number(form.boughtPrice) && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        {t(
                          "stock.sellingPriceWarningInline",
                          "Warning: Selling price is less than bought price. This will result in a loss."
                        )}
                      </span>
                    </div>
                  )}
              </div>

                             <div className="space-y-2">
                 <label>{t("stock.codebar")}</label>
                 <input
                   data-field="codebar"
                   type="text"
                   placeholder={t("stock.codebar")}
                   value={form.codebar}
                   onChange={(e) => handleFormChange("codebar", e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") {
                       e.preventDefault();
                       focusNextField('codebar');
                     }
                   }}
                   onFocus={() => handleFieldFocus('codebar')}
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
                      form.name.toLowerCase().trim()
                  );
                  return existing
                    ? t("stock.existingProductNote", {
                        quantity: existing.quantity,
                      }) +
                        " - " +
                        t(
                          "stock.newPurchaseNote",
                          "New purchase will be recorded with current prices"
                        )
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
            <PendingProductsList
              pendingProducts={pendingProducts}
              removePendingProduct={removePendingProduct}
              multiSellerId={multiSellerId}
              setMultiSellerId={setMultiSellerId}
              multiSellerName={multiSellerName}
              setMultiSellerName={setMultiSellerName}
              sellers={sellers}
              finishingPurchase={finishingPurchase}
              onFinishPurchase={handleFinishPurchase}
            />
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
