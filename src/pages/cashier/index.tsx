import { useState, useEffect, useRef } from "react";
import type { ProductWithSales, CartItem } from "../../types";
import { useTranslation } from "react-i18next";
import ProductBrowser from "./components/productBrowser";
import AddManualProductModal from "./components/addManualProductModal";
import AddServiceModal from "./components/addServiceModal";
import ReceiptModal from "./components/receiptModal";
import CashierLayout from "./components/cashierLayout";
import SessionManager from "./components/sessionManager";
import { ConfirmDialog } from "../../lib/components/confirmDialog";
import rendererLogger from "../../lib/logger/rendererLogger";
import { Product } from "@prisma/client";
import { useCompletedServices } from "../../lib/contexts/completedServicesContext";

const MAX_SESSIONS = 5;

// Cart utility functions
function addProductToCart(
  cart: CartItem[],
  product: ProductWithSales,
  allProducts: ProductWithSales[],
  onOutOfStock: (product: ProductWithSales, currentQty: number) => void,
  outOfStockConfirmed = false
): CartItem[] | null {
  // Check if product is out of stock before adding
  const currentQty = cart.find((item) => item.id === product.id)?.qty || 0;
  const newQty = currentQty + 1;
  
  // Only check stock for products that actually have stock (quantity > 0)
  if (product.quantity > 0 && newQty > product.quantity && !outOfStockConfirmed) {
    // Product is out of stock, show modal
    onOutOfStock(product, currentQty);
    return null; // Don't add to cart
  }

  const updated = [...cart];
  const exists = updated.find((item) => item.id === product.id);

  if (exists) {
    exists.qty += 1;
  } else {
    updated.push({
      id: product.id,
      name: product.name,
      price: product.sellingPrice,
      qty: 1,
      // Store the bought price for accurate cost tracking
      boughtPrice: product.boughtPrice,
    });
  }

  return updated;
}

function addManualProductToCart(
  cart: CartItem[],
  product: CartItem
): CartItem[] {
  return [...cart, product];
}

export default function CashierPage() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { refreshCompletedServicesCount } = useCompletedServices();
  const [productRefreshKey, setProductRefreshKey] = useState(0);
  const [salesRefreshKey, setSalesRefreshKey] = useState(0);
  const [showProductBrowser, setShowProductBrowser] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductWithSales[]>([]);
  const productBrowserRef = useRef<{ handleClose: () => void }>(null);
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [showProductOutOfStockModal, setShowProductOutOfStockModal] = useState(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<ProductWithSales | null>(null);
  const [outOfStockCurrentQty, setOutOfStockCurrentQty] = useState(0);
  const [showManualProductModal, setShowManualProductModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | undefined>(undefined);
  const [receiptData, setReceiptData] = useState<{
    cart: CartItem[];
    clientName: string;
    discount: number;
    paymentAmount: number;
    paymentType: "none" | "credit" | "versement";
    paymentDate?: Date;
  } | null>(null);
  const [outOfStockConfirmed, setOutOfStockConfirmed] = useState(false);

  // Fetch all products - optimized without sales counts
  useEffect(() => {
    let isMounted = true;
    
    const fetchProducts = async () => {
      try {
        const products = await window.api.database.products.getAll();

        if (!isMounted) return;

        // Set products with totalSold as 0 (we'll fetch sales counts only when needed in product browser)
        setAllProducts(
          products.map((p: Product) => ({
            ...p,
            totalSold: 0,
          })) as ProductWithSales[]
        );
      } catch (error) {
        if (!isMounted) return;
        
        rendererLogger.error(
          "Error fetching products",
          "CashierPage",
          error
        );
      }
    };

    fetchProducts();
    
    return () => {
      isMounted = false;
    };
  }, [productRefreshKey]);

  // Control scrolling behavior for cashier page
  useEffect(() => {
    // Disable scrolling when component mounts
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Reset out of stock confirmation when entering cashier page
    setOutOfStockConfirmed(false);

    // Re-enable scrolling when component unmounts
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, []);

  const handleOutOfStock = () => {
    setShowStockWarning(true);
  };

  const handleProductOutOfStock = (product: ProductWithSales, currentQty: number) => {
    // Only show modal if user hasn't been warned yet in this session
    if (!outOfStockConfirmed) {
      setOutOfStockProduct(product);
      setOutOfStockCurrentQty(currentQty);
      setShowProductOutOfStockModal(true);
    }
    // If user already confirmed, the product will be added directly in the component logic
  };

  const handleReceiptData = (data: {
    cart: CartItem[];
    clientName: string;
    discount: number;
    paymentAmount: number;
    paymentType: "none" | "credit" | "versement";
    paymentDate?: Date;
  }) => {
    setReceiptData(data);
  };

  // Function to update product quantities locally after a sale
  const updateProductQuantitiesLocally = (soldItems: CartItem[]) => {
    console.log('Updating product quantities locally for items:', soldItems);
    setAllProducts(prevProducts => 
      prevProducts.map(product => {
        const soldItem = soldItems.find(item => item.id === product.id && !item.isManual && !item.isService);
        if (soldItem) {
          console.log(`Updating ${product.name}: ${product.quantity} -> ${Math.max(0, product.quantity - soldItem.qty)}`);
          return {
            ...product,
            quantity: Math.max(0, product.quantity - soldItem.qty)
          };
        }
        return product;
      })
    );
  };

  const handleSaleComplete = (saleId?: string, soldItems?: CartItem[]) => {
    if (saleId) {
      setLastSaleId(saleId);
      // Don't show receipt modal - printing is handled directly in cashier session
    }

    // Update product quantities locally for immediate UI feedback
    if (soldItems) {
      updateProductQuantitiesLocally(soldItems);
    }

    // Refresh sales history when a sale is completed
    setSalesRefreshKey((prev) => prev + 1);
    
    // Refresh completed services count immediately
    refreshCompletedServicesCount();
  };

  const handleSaleCompleted = (saleId?: string, soldItems?: CartItem[]) => {
    console.log('handleSaleCompleted called with:', { saleId, soldItems });
    // Update product quantities locally for immediate UI feedback
    if (soldItems) {
      updateProductQuantitiesLocally(soldItems);
    }

    setSalesRefreshKey((prev) => prev + 1);
    
    // Refresh completed services count immediately
    refreshCompletedServicesCount();
  };

  // Proceed with sale despite out of stock warning
  const proceedWithOutOfStockSale = async () => {
    // Set the flag to allow the sale to proceed
    setOutOfStockConfirmed(true);
    setShowStockWarning(false);

    // Automatically proceed with the sale after a brief delay
    setTimeout(() => {
      // Reset the flag after the sale completes
      setOutOfStockConfirmed(false);
    }, 1000);
  };

  const cancelOutOfStockProduct = () => {
    setShowProductOutOfStockModal(false);
    setOutOfStockProduct(null);
    setOutOfStockCurrentQty(0);
  };



  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F1") {
        e.preventDefault(); // Prevent browser help
        if (showProductBrowser) {
          productBrowserRef.current?.handleClose();
        } else {
          setShowProductBrowser(true);
        }
      } else if (e.key === "F2") {
        e.preventDefault(); // Prevent browser help
        setShowManualProductModal((prev) => !prev);
      } else if (e.key === "F3") {
        e.preventDefault(); // Prevent browser help
        setShowServiceModal((prev) => !prev);
      } else if (e.key === "F4") {
        e.preventDefault(); // Prevent browser help
        // Trigger normal sale
        const event = new CustomEvent('cashier-finish-sale');
        window.dispatchEvent(event);
      } else if (e.key === "F5") {
        e.preventDefault(); // Prevent browser help
        // Trigger sale with receipt
        const event = new CustomEvent('cashier-finish-with-receipt');
        window.dispatchEvent(event);
      } else if (e.key === "F6") {
        e.preventDefault(); // Prevent browser help
        // Trigger clear cart
        const event = new CustomEvent('cashier-clear-cart');
        window.dispatchEvent(event);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showProductBrowser]);


  return (
    <SessionManager maxSessions={MAX_SESSIONS}>
      {(sessions, activeSession, sessionActions) => {
        // Handle product out of stock modal actions
        const proceedWithOutOfStockProduct = () => {
          if (outOfStockProduct) {
            const currentSession = sessionActions.getCurrentSession();
            const updatedCart = [...currentSession.cart];
            const exists = updatedCart.find((item) => item.id === outOfStockProduct.id);

            if (exists) {
              exists.qty += 1;
            } else {
              updatedCart.push({
                id: outOfStockProduct.id,
                name: outOfStockProduct.name,
                price: outOfStockProduct.sellingPrice,
                qty: 1,
              });
            }
            
            sessionActions.updateSessionCart(activeSession, updatedCart);
          }
          
          // Set the confirmation flag so modal won't show again in this session
          setOutOfStockConfirmed(true);
          setShowProductOutOfStockModal(false);
          setOutOfStockProduct(null);
          setOutOfStockCurrentQty(0);
        };

  return (
        <>
           <CashierLayout
             sessions={sessions}
             activeSession={activeSession}
             allProducts={allProducts}
             isRTL={isRTL}
             productRefreshKey={productRefreshKey}
             setProductRefreshKey={setProductRefreshKey}
             salesRefreshKey={salesRefreshKey}
             onShowProductBrowser={() => {
               // Refresh products when opening product browser to show updated stock
               setProductRefreshKey((k: number) => k + 1);
               setShowProductBrowser(true);
             }}
             onShowManualProductModal={() => setShowManualProductModal(true)}
             onShowServiceModal={() => setShowServiceModal(true)}
            onAddProduct={(product: ProductWithSales | CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              
              // Check if it's a service/manual product (CartItem with isService or isManual)
              if ('isService' in product || 'isManual' in product) {
                // Add directly to cart like manual products
                const updatedCart = addManualProductToCart(
                  currentSession.cart,
                  product as CartItem
                );
                sessionActions.updateSessionCart(activeSession, updatedCart);
              } else {
                // Regular product - use addProductToCart
                const updatedCart = addProductToCart(
                  currentSession.cart,
                  product as ProductWithSales,
                  allProducts,
                  handleProductOutOfStock,
                  outOfStockConfirmed
                );
                
                if (updatedCart) {
                  sessionActions.updateSessionCart(activeSession, updatedCart);
                }
              }
            }}
             onAddManualProduct={(product: CartItem) => {
               const currentSession = sessionActions.getCurrentSession();
               const updatedCart = addManualProductToCart(
                 currentSession.cart,
                 product
               );
               sessionActions.updateSessionCart(activeSession, updatedCart);
             }}
             onSessionChange={sessionActions.setActiveSession}
             onAddSession={sessionActions.addSession}
             onRemoveSession={sessionActions.removeSession}
             onUpdateSessionCart={sessionActions.updateSessionCart}
             onUpdateSessionDiscount={sessionActions.updateSessionDiscount}
             onUpdateSessionClient={sessionActions.updateSessionClient}
             onUpdateSessionPayment={sessionActions.updateSessionPayment}
             onOutOfStock={handleOutOfStock}
             onReceiptData={handleReceiptData}
             onSaleComplete={handleSaleComplete}
             onSaleCompleted={handleSaleCompleted}
             maxSessions={MAX_SESSIONS}
             addProductToCart={addProductToCart}
             onProductOutOfStock={handleProductOutOfStock}
             outOfStockConfirmed={outOfStockConfirmed}
           />

          {/* Product Browser as a modal */}
           <ProductBrowser
             ref={productBrowserRef}
             allProducts={allProducts}
             open={showProductBrowser}
             onClose={() => setShowProductBrowser(false)}
             cart={sessionActions.getCurrentSession().cart}
             setCart={(updater) => {
               const currentCart = sessionActions.getCurrentSession().cart;
               const result =
                 typeof updater === "function" ? updater(currentCart) : updater;
               sessionActions.updateSessionCart(activeSession, result);
             }}
             addProductToCart={(cart, product, allProducts, onOutOfStock) => 
               addProductToCart(cart, product, allProducts, onOutOfStock, outOfStockConfirmed)
             }
             onOutOfStock={handleProductOutOfStock}
             outOfStockConfirmed={outOfStockConfirmed}
           />

          {/* Out of Stock Warning Modal */}
          <ConfirmDialog
            open={showStockWarning}
            onOpenChange={(open) => {
              if (!open) {
                setShowStockWarning(false);
              }
            }}
            onConfirm={proceedWithOutOfStockSale}
            title={t("cashier.outOfStockTitle")}
            message={t("cashier.outOfStockMessage")}
            confirmText={t("cashier.proceedAnyway")}
            cancelText={t("common.cancel")}
            variant="danger"
          />


          {/* Product Out of Stock Modal */}
          <ConfirmDialog
            open={showProductOutOfStockModal}
            onOpenChange={(open) => {
              if (!open) {
                setShowProductOutOfStockModal(false);
                setOutOfStockProduct(null);
                setOutOfStockCurrentQty(0);
              }
            }}
            onConfirm={proceedWithOutOfStockProduct}
            onCancel={cancelOutOfStockProduct}
            title={t("cashier.productOutOfStockTitle", "Product Out of Stock")}
            message={
              outOfStockProduct
                ? t("cashier.productOutOfStockMessage", 
                    `"${outOfStockProduct.name}" is out of stock. Available quantity: ${outOfStockProduct.quantity}. Current in cart: ${outOfStockCurrentQty}. Do you want to add it anyway?`,
                    {
                      productName: outOfStockProduct.name,
                      availableQty: outOfStockProduct.quantity,
                      currentQty: outOfStockCurrentQty
                    })
                : ""
            }
            confirmText={t("cashier.addAnyway", "Add Anyway")}
            cancelText={t("common.cancel")}
            variant="warning"
          />

          <AddManualProductModal
            open={showManualProductModal}
            onClose={() => setShowManualProductModal(false)}
            onAdd={(product: CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addManualProductToCart(
                currentSession.cart,
                product
              );
              sessionActions.updateSessionCart(activeSession, updatedCart);
            }}
          />

          <AddServiceModal
            open={showServiceModal}
            onClose={() => setShowServiceModal(false)}
            cart={sessionActions.getCurrentSession().cart}
            onAdd={(service: CartItem) => {
              const currentSession = sessionActions.getCurrentSession();
              const updatedCart = addManualProductToCart(
                currentSession.cart,
                service
              );
              sessionActions.updateSessionCart(activeSession, updatedCart);
            }}
            onClientSelect={(clientId: string, clientName: string) => {
              sessionActions.updateSessionClient(activeSession, clientName, clientId);
            }}
          />

          <ReceiptModal
            open={showReceiptModal}
            onClose={() => {
              setShowReceiptModal(false);
              setReceiptData(null);
              setLastSaleId(undefined);
            }}
            cart={receiptData?.cart || []}
            clientName={receiptData?.clientName || ""}
            discount={receiptData?.discount || 0}
            paymentAmount={receiptData?.paymentAmount || 0}
            paymentType={receiptData?.paymentType || "none"}
            paymentDate={receiptData?.paymentDate}
            saleId={lastSaleId}
          />

        </>
        );
      }}
    </SessionManager>
  );
}
