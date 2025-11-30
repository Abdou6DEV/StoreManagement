import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, Package, DollarSign, TrendingUp, Info, BookOpen } from "lucide-react";
import { useToast } from "../../lib/contexts/toastContext";
import { Input } from "../../lib/components/input";
import { Card } from "../../lib/components/card";
import { Tooltip } from "../../lib/components/tooltip";
import { LoadingState } from "../../lib/components/loadingState";

export default function ZakatAlMal() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [productsValue, setProductsValue] = useState(0);
  
  // Input states - simplified
  const [nisabThreshold, setNisabThreshold] = useState<string>("");
  const [extraMoney, setExtraMoney] = useState<string>("");

  // Fetch products value
  useEffect(() => {
    const fetchProductsValue = async () => {
      try {
        setLoading(true);
        const products = await window.api.database.products.getAll();
        
        // Calculate total stock value (sellingPrice * quantity)
        const totalValue = products.reduce(
          (sum: number, product: { sellingPrice: number; quantity: number }) => 
            sum + (product.sellingPrice * product.quantity),
          0
        );
        
        setProductsValue(totalValue);
      } catch (error) {
        console.error("Error fetching products:", error);
        showToast(t("zakat.failedToLoadProducts", "Failed to load products"), "error");
      } finally {
        setLoading(false);
      }
    };

    fetchProductsValue();
  }, [showToast, t]);

  // Calculate values
  const parseNumber = (value: string): number => {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  };

  const nisab = parseNumber(nisabThreshold);
  const extraMoneyValue = parseNumber(extraMoney);

  // Total Wealth = Stock Value + Extra Money
  const totalWealth = productsValue + extraMoneyValue;

  // Only calculate Zakat if Nisab is entered (must be > 0)
  const hasNisab = nisab > 0;
  
  // Zakat Calculation (2.5% of wealth above Nisab)
  // Eligible Wealth = Total Wealth - Nisab (minimum 0)
  // If Total Wealth < Nisab, no Zakat is due (eligibleWealth = 0)
  const eligibleWealth = hasNisab ? Math.max(0, totalWealth - nisab) : 0;
  
  // Zakat = 2.5% of eligible wealth (not the full amount!)
  const zakatAmount = hasNisab ? eligibleWealth * 0.025 : 0;

  const formatCurrency = (amount: number) => {
    return `${Math.round(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${t("currency")}`;
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState 
          title={t("zakat.loading", "Loading Zakat Calculator")}
          description={t("zakat.loadingDesc", "Fetching products data...")}
          icon={Calculator}
          minHeight="min-h-[50vh]"
        />
      </div>
    );
  }

  return (
    <main className="px-6 md:px-12 flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <Calculator className="h-16 w-16 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("zakat.title", "Zakat Al Mal")}
          </h1>
          <p className="text-muted-foreground">
            {t("zakat.description", "Calculate your Zakat on wealth (2.5% of eligible assets)")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card className="p-6 space-y-6 bg-card border shadow-md">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("zakat.inputs", "Input Values")}
          </h2>

          {/* Products Value (Auto-fetched) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              {t("zakat.productsValue", "Products/Stock Value")}
              <Tooltip content={t("zakat.productsValueTooltip", "Automatically calculated from your inventory at selling price")}>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={formatCurrency(productsValue)}
                disabled
                className="w-full bg-muted"
              />
            </div>
          </div>

          {/* Extra Money */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              {t("zakat.extraMoney", "Extra Money")}
              <Tooltip content={t("zakat.extraMoneyTooltip", "Include all your cash, bank accounts, and any other money you have")}>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <Input
              type="text"
              value={extraMoney}
              onChange={(e) => setExtraMoney(e.target.value)}
              placeholder={t("zakat.extraMoneyPlaceholder", "Enter your total cash and money")}
              className="w-full"
            />
          </div>

          {/* Nisab Threshold */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              {t("zakat.nisabThreshold", "Nisab Threshold")}
              <Tooltip content={t("zakat.nisabThresholdTooltip", "Minimum wealth threshold for Zakat obligation")}>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </Tooltip>
            </label>
            <Input
              type="text"
              value={nisabThreshold}
              onChange={(e) => setNisabThreshold(e.target.value)}
              placeholder={t("zakat.nisabThresholdPlaceholder", "Enter Nisab threshold")}
              className="w-full"
            />
          </div>

          {/* Reminder Note */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-2 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-2">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  {t("zakat.reminderTitle", "Important Reminders")}
                </p>
                <ul className="list-disc list-inside space-y-1.5 ml-2 text-blue-800 dark:text-blue-200">
                  <li>{t("zakat.reminder1", "Include in 'Extra Money': cash in hand, bank accounts, and any other money you have.")}</li>
                  <li>{t("zakat.reminder2", "Include money you lent to people (if you're sure they will pay it back).")}</li>
                  <li>{t("zakat.reminder4", "Ensure all stock products are registered in the stock system.")}</li>
                  <li>{t("zakat.reminder5", "Verify the Nisab threshold value with trusted Islamic sources or scholars.")}</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Calculation Results Section */}
        <Card className="p-6 space-y-6 bg-card border shadow-md">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            {t("zakat.calculations", "Calculations")}
          </h2>

          {/* Summary */}
          <div className="space-y-4">
            {/* Total Wealth */}
            <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-border">
              <span className="text-sm font-medium text-foreground">
                {t("zakat.totalWealth", "Total Wealth")}
              </span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalWealth)}
              </span>
            </div>

            {/* Nisab Threshold */}
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg border border-border">
              <span className="text-sm font-medium text-foreground">
                {t("zakat.nisabThreshold", "Nisab Threshold")}
              </span>
              <span className="text-lg font-semibold text-foreground">
                {formatCurrency(nisab)}
              </span>
            </div>

            {/* Eligible Wealth - Only show if Nisab is entered */}
            {hasNisab && (
              <div className="flex justify-between items-center p-4 bg-card rounded-lg border border-border">
                <span className="text-sm font-medium text-foreground">
                  {t("zakat.eligibleWealth", "Eligible Wealth (Above Nisab)")}
                </span>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {formatCurrency(eligibleWealth)}
                </span>
              </div>
            )}

            {/* Zakat Amount - Only show if Nisab is entered */}
            {hasNisab ? (
              <div className="flex justify-between items-center p-6 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-600 dark:border-green-400">
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    {t("zakat.zakatAmount", "Zakat Amount (2.5%)")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("zakat.zakatFormula", "2.5% of eligible wealth")}
                  </span>
                </div>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(zakatAmount)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center p-6 bg-muted rounded-lg border border-border">
                <div>
                  <span className="text-sm font-medium text-foreground block">
                    {t("zakat.zakatAmount", "Zakat Amount (2.5%)")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("zakat.enterNisabFirst", "Please enter Nisab threshold to calculate Zakat")}
                  </span>
                </div>
                <span className="text-2xl font-bold text-muted-foreground">
                  {t("zakat.notCalculated", "—")}
                </span>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border-2 border-amber-200 dark:border-amber-800 space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1.5 text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {t("zakat.infoTitle", "Important Notes")}
                </p>
                <ul className="list-disc list-inside space-y-1.5 ml-2 text-amber-800 dark:text-amber-200">
                  <li>{t("zakat.info1", "Zakat is 2.5% of wealth above the Nisab threshold")}</li>
                  <li>{t("zakat.info2", "Zakat is due after one full lunar year (Hawl)")}</li>
                  <li>{t("zakat.info3", "Stock/inventory value is calculated at selling price")}</li>
                  <li>{t("zakat.info4", "Consult with a qualified Islamic scholar for accurate calculation")}</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Islamic Commerce Guidelines Section */}
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <BookOpen className="h-16 w-16 text-primary" />
        <div>
          <h2 className="text-3xl font-bold text-foreground">
            {t("zakat.commerceGuidelines.title", "Islamic Commerce Guidelines")}
          </h2>
          <p className="text-muted-foreground">
            {t("zakat.commerceGuidelines.description", "Essential principles from the Quran and Hadith to ensure halal and ethical business practices")}
          </p>
        </div>
      </div>

      <Card className="p-8 bg-card border shadow-md">
        <div className="space-y-10">
          {/* Principle 1: Honesty and Transparency */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              {t("zakat.commerceGuidelines.honesty.title", "1. Honesty and Transparency")}
            </h3>
            
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-bold text-primary uppercase tracking-wide text-right" dir="rtl">
                  {t("zakat.commerceGuidelines.surahAnNisa", "سورة النساء")} (4:29)
                </p>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-2xl font-bold text-foreground mb-3 text-right leading-relaxed" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {t("zakat.commerceGuidelines.honesty.quranArabic", "يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ إِلَّا أَن تَكُونَ تِجَارَةً عَن تَرَاضٍ مِّنكُمْ")}
                  </p>
                  {i18n.language !== "ar" && (
                    <p className="text-base text-muted-foreground italic leading-relaxed">
                      {t("zakat.commerceGuidelines.honesty.quranTranslation", "O you who have believed, do not consume one another's wealth unjustly but only [in lawful] business by mutual consent.")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-primary uppercase tracking-wide text-right" dir="rtl">
                  {t("zakat.commerceGuidelines.hadith", "Hadith")} - {t("zakat.commerceGuidelines.honesty.hadithSource", "عن حكيم بن حزام عن النبي صلى الله عليه وسلم")}
                </p>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-2xl font-bold text-foreground mb-3 text-right leading-relaxed" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {t("zakat.commerceGuidelines.honesty.hadithArabic", "الْبَيِّعَانِ بِالْخِيَارِ مَا لَمْ يَتَفَرَّقَا، فَإِنْ صَدَقَا وَبَيَّنَا بُورِكَ لَهُمَا فِي بَيْعِهِمَا، وَإِنْ كَذَبَا وَكَتَمَا مُحِقَتْ بَرَكَةُ بَيْعِهِمَا")}
                  </p>
                  {i18n.language !== "ar" && (
                    <p className="text-base text-muted-foreground italic leading-relaxed">
                      {t("zakat.commerceGuidelines.honesty.hadithTranslation", "The seller and the buyer have the right to keep or return goods as long as they have not parted. If both parties speak the truth and describe the defects and qualities, they will be blessed in their transaction. If they tell lies or hide something, the blessings of their transaction will be lost.")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-lg font-bold text-foreground mb-4">{t("zakat.commerceGuidelines.practicalApplication", "Practical Application")}:</p>
              <ul className="list-disc list-inside space-y-3 ml-4 text-lg text-foreground leading-relaxed">
                <li>{t("zakat.commerceGuidelines.honesty.point1", "Always disclose all product defects and issues")}</li>
                <li>{t("zakat.commerceGuidelines.honesty.point2", "Provide accurate descriptions and avoid false advertising")}</li>
                <li>{t("zakat.commerceGuidelines.honesty.point3", "Be transparent about prices, terms, and conditions")}</li>
              </ul>
            </div>
          </div>

          {/* Principle 2: Prohibition of Riba */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              {t("zakat.commerceGuidelines.riba.title", "2. Prohibition of Riba (Interest/Usury)")}
            </h3>
            
            <div className="space-y-3">
                <p className="text-sm font-bold text-primary uppercase tracking-wide text-right" dir="rtl">
                  {t("zakat.commerceGuidelines.surahAlBaqarah", "سورة البقرة")} (2:275)
                </p>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-2xl font-bold text-foreground mb-3 text-right leading-relaxed" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {t("zakat.commerceGuidelines.riba.quranArabic", "وَأَحَلَّ اللَّهُ الْبَيْعَ وَحَرَّمَ الرِّبَا")}
                </p>
                {i18n.language !== "ar" && (
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    {t("zakat.commerceGuidelines.riba.quranTranslation", "Allah has permitted trade and has forbidden interest.")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-lg font-bold text-foreground mb-4">{t("zakat.commerceGuidelines.practicalApplication", "Practical Application")}:</p>
              <ul className="list-disc list-inside space-y-3 ml-4 text-lg text-foreground leading-relaxed">
                <li>{t("zakat.commerceGuidelines.riba.point1", "Avoid interest-based loans or financing")}</li>
                <li>{t("zakat.commerceGuidelines.riba.point2", "Do not charge interest on late payments")}</li>
                <li>{t("zakat.commerceGuidelines.riba.point3", "Use profit-sharing or fixed-price sales instead")}</li>
              </ul>
            </div>
          </div>

          {/* Principle 3: Avoid Gharar */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              {t("zakat.commerceGuidelines.gharar.title", "3. Avoid Gharar (Excessive Uncertainty)")}
            </h3>
            
            <div className="space-y-3">
                <p className="text-sm font-bold text-primary uppercase tracking-wide text-right" dir="rtl">
                  {t("zakat.commerceGuidelines.hadith", "Hadith")} - {t("zakat.commerceGuidelines.gharar.hadithSource", "عن أبي هريرة عن النبي صلى الله عليه وسلم")}
                </p>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-2xl font-bold text-foreground mb-3 text-right leading-relaxed" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {t("zakat.commerceGuidelines.gharar.hadithArabic", "نَهَى رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ عَنْ بَيْعِ الْغَرَرِ")}
                  </p>
                {i18n.language !== "ar" && (
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    {t("zakat.commerceGuidelines.gharar.hadithTranslation", "The Messenger of Allah (PBUH) forbade sales involving uncertainty (gharar).")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-lg font-bold text-foreground mb-4">{t("zakat.commerceGuidelines.practicalApplication", "Practical Application")}:</p>
              <ul className="list-disc list-inside space-y-3 ml-4 text-lg text-foreground leading-relaxed">
                <li>{t("zakat.commerceGuidelines.gharar.point1", "Do not sell items you do not own or possess")}</li>
                <li>{t("zakat.commerceGuidelines.gharar.point2", "Avoid vague or uncertain terms in contracts")}</li>
                <li>{t("zakat.commerceGuidelines.gharar.point3", "Ensure clear delivery terms and product specifications")}</li>
              </ul>
            </div>
          </div>

          {/* Principle 4: Fair Pricing and Justice */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              {t("zakat.commerceGuidelines.fairness.title", "4. Fair Pricing and Justice")}
            </h3>
            
            <div className="space-y-3">
                <p className="text-sm font-bold text-primary uppercase tracking-wide text-right" dir="rtl">
                  {t("zakat.commerceGuidelines.surahArRahman", "سورة الرحمن")} (55:9)
                </p>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-2xl font-bold text-foreground mb-3 text-right leading-relaxed" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {t("zakat.commerceGuidelines.fairness.quranArabic", "وَأَقِيمُوا الْوَزْنَ بِالْقِسْطِ وَلَا تُخْسِرُوا الْمِيزَانَ")}
                </p>
                {i18n.language !== "ar" && (
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    {t("zakat.commerceGuidelines.fairness.quranTranslation", "And establish weight in justice and do not make deficient the balance.")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-lg font-bold text-foreground mb-4">{t("zakat.commerceGuidelines.practicalApplication", "Practical Application")}:</p>
              <ul className="list-disc list-inside space-y-3 ml-4 text-lg text-foreground leading-relaxed">
                <li>{t("zakat.commerceGuidelines.fairness.point1", "Use accurate weights and measures")}</li>
                <li>{t("zakat.commerceGuidelines.fairness.point2", "Avoid price manipulation or exploitation")}</li>
                <li>{t("zakat.commerceGuidelines.fairness.point3", "Charge fair prices, especially to those in need")}</li>
              </ul>
            </div>
          </div>

          {/* Principle 5: Prohibition of Deception */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              {t("zakat.commerceGuidelines.deception.title", "5. Prohibition of Deception")}
            </h3>
            
            <div className="space-y-3">
                <p className="text-sm font-bold text-primary uppercase tracking-wide text-right" dir="rtl">
                  {t("zakat.commerceGuidelines.hadith", "Hadith")} - {t("zakat.commerceGuidelines.deception.hadithSource", "عن أبي هريرة عن النبي صلى الله عليه وسلم")}
                </p>
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-2xl font-bold text-foreground mb-3 text-right leading-relaxed" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                    {t("zakat.commerceGuidelines.deception.hadithArabic", "مَنْ غَشَّنَا فَلَيْسَ مِنَّا")}
                  </p>
                {i18n.language !== "ar" && (
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    {t("zakat.commerceGuidelines.deception.hadithTranslation", "He who deceives is not of us.")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-lg font-bold text-foreground mb-4">{t("zakat.commerceGuidelines.practicalApplication", "Practical Application")}:</p>
              <ul className="list-disc list-inside space-y-3 ml-4 text-lg text-foreground leading-relaxed">
                <li>{t("zakat.commerceGuidelines.deception.point1", "Never hide defects or issues with products")}</li>
                <li>{t("zakat.commerceGuidelines.deception.point2", "Do not make false claims about products")}</li>
                <li>{t("zakat.commerceGuidelines.deception.point3", "Avoid misleading marketing or advertising")}</li>
              </ul>
            </div>
          </div>

          {/* Principle 6: Avoid Haram Goods */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              {t("zakat.commerceGuidelines.haram.title", "6. Avoid Haram Goods and Services")}
            </h3>
            
            <div className="mt-4">
              <p className="text-lg font-bold text-foreground mb-4">{t("zakat.commerceGuidelines.practicalApplication", "Practical Application")}:</p>
              <ul className="list-disc list-inside space-y-3 ml-4 text-lg text-foreground leading-relaxed">
                <li>{t("zakat.commerceGuidelines.haram.point1", "Do not trade in alcohol, pork, or other haram items")}</li>
                <li>{t("zakat.commerceGuidelines.haram.point2", "Avoid businesses related to gambling, usury, or immorality")}</li>
                <li>{t("zakat.commerceGuidelines.haram.point3", "Ensure all products are halal and permissible")}</li>
              </ul>
            </div>
          </div>

          {/* Principle 7: Prohibition of Bribery */}
          <div className="space-y-5">
            <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Info className="h-6 w-6 text-primary" />
              {t("zakat.commerceGuidelines.bribery.title", "7. Prohibition of Bribery")}
            </h3>
            
            <div className="space-y-3">
                <p className="text-sm font-bold text-primary uppercase tracking-wide text-right" dir="rtl">
                  {t("zakat.commerceGuidelines.surahAlBaqarah", "سورة البقرة")} (2:188)
                </p>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <p className="text-2xl font-bold text-foreground mb-3 text-right leading-relaxed" dir="rtl" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {t("zakat.commerceGuidelines.bribery.quranArabic", "وَلَا تَأْكُلُوا أَمْوَالَكُم بَيْنَكُم بِالْبَاطِلِ وَتُدْلُوا بِهَا إِلَى الْحُكَّامِ")}
                </p>
                {i18n.language !== "ar" && (
                  <p className="text-base text-muted-foreground italic leading-relaxed">
                    {t("zakat.commerceGuidelines.bribery.quranTranslation", "And do not consume one another's wealth unjustly or send it [in bribery] to the rulers...")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-lg font-bold text-foreground mb-4">{t("zakat.commerceGuidelines.practicalApplication", "Practical Application")}:</p>
              <ul className="list-disc list-inside space-y-3 ml-4 text-lg text-foreground leading-relaxed">
                <li>{t("zakat.commerceGuidelines.bribery.point1", "Never offer or accept bribes to secure contracts")}</li>
                <li>{t("zakat.commerceGuidelines.bribery.point2", "Maintain transparency in all business dealings")}</li>
                <li>{t("zakat.commerceGuidelines.bribery.point3", "Uphold integrity and ethical standards")}</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>
    </main>
  );
}

