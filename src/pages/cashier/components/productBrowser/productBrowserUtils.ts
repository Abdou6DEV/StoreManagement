import type { ProductWithSales } from "../../../../types";

export const scrollTabs = (
  direction: "left" | "right",
  container: HTMLDivElement | null,
) => {
  if (!container) return;

  // Get the first 3 visible buttons and sum their widths
  const btns = Array.from(container.querySelectorAll("button"));
  let scrollAmount = 0;
  for (let i = 0; i < 3 && i < btns.length; i++) {
    scrollAmount += (btns[i] as HTMLElement).offsetWidth;
  }
  if (scrollAmount === 0) scrollAmount = 120; // fallback

  if (direction === "left") {
    container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
  } else {
    container.scrollBy({ left: scrollAmount, behavior: "smooth" });
  }
};

export const filterProducts = (
  allProducts: ProductWithSales[],
  productFilter: string,
  selectedCategory: string,
): ProductWithSales[] => {
  let products = allProducts;

  if (productFilter) {
    products = products.filter((product) =>
      product.name.toLowerCase().includes(productFilter.toLowerCase()),
    );
  }

  if (selectedCategory !== "All") {
    products = products.filter(
      (product) => product.categoryName === selectedCategory,
    );
  }

  return products.sort((a, b) => {
    const aHasBarcode = a.codebar && a.codebar.trim() !== "";
    const bHasBarcode = b.codebar && b.codebar.trim() !== "";

    if (aHasBarcode && !bHasBarcode) return 1;
    if (!aHasBarcode && bHasBarcode) return -1;
    return 0;
  });
};

export const loadMoreProducts = (
  visibleCount: number,
  filteredProductsLength: number,
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>,
  setLoadingMore: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  if (visibleCount >= filteredProductsLength) return;

  setLoadingMore(true);
  setTimeout(() => {
    setVisibleCount((prev: number) => prev + 50);
    setLoadingMore(false);
  }, 500);
};
