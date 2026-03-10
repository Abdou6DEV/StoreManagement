import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Printer, X, Settings } from 'lucide-react';
import { Modal } from '../../../../lib/components/modal';
import { Button } from '../../../../lib/components/button';
import StyledNumberInput from '../../../../lib/components/inputNumber';
import { Checkbox } from '../../../../lib/components/checkbox';
import { generateRealBarcode, getRecommendedFormat } from '../../../../lib/utils/barcodeVisual';
import { Tooltip } from '../../../../lib/components/tooltip';
import { useAuth } from '../../../../lib/contexts/authContext';
import '@fontsource/instrument-serif';

interface BarcodePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  price: number | string;
  barcode: string;
  /** When set (e.g. user changed price in edit form), can show previous price with strikethrough next to current price */
  previousPrice?: number | string;
  onPrint: (quantity?: number, showBarcode?: boolean, showStoreName?: boolean, showPreviousPrice?: boolean) => void;
}

const SHOW_BARCODE_CACHE_KEY = 'barcodePreview_showBarcode';
const SHOW_STORE_NAME_CACHE_KEY = 'barcodePreview_showStoreName';

export const BarcodePreviewModal: React.FC<BarcodePreviewModalProps> = ({
  open,
  onOpenChange,
  productName,
  price,
  barcode,
  previousPrice,
  onPrint,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAccessPage } = useAuth();
  const [quantity, setQuantity] = useState<number | "">(1);
  const [showPreviousPrice, setShowPreviousPrice] = useState<boolean>(false);
  const [showBarcode, setShowBarcode] = useState<boolean>(() => {
    const cached = localStorage.getItem(SHOW_BARCODE_CACHE_KEY);
    return cached !== null ? cached === 'true' : true;
  });
  const [showStoreName, setShowStoreName] = useState<boolean>(() => {
    const cached = localStorage.getItem(SHOW_STORE_NAME_CACHE_KEY);
    return cached !== null ? cached === 'true' : true;
  });
  const [storeName, setStoreName] = useState<string>('');
  const [storeNameFetched, setStoreNameFetched] = useState(false);
  const [labelPrinterName, setLabelPrinterName] = useState<string | null>(null);
  const [showNoPrinterDialog, setShowNoPrinterDialog] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;
    setShowNoPrinterDialog(true);
    setStoreNameFetched(false);
    void window.api?.database?.options?.get?.('storeName').then((name: string | undefined) => {
      setStoreName(name ?? '');
      setStoreNameFetched(true);
    });
    void window.api?.database?.options?.get?.('labelPrinterName').then((name: string | undefined) => {
      setLabelPrinterName(name ?? '');
    });
  }, [open]);

  const hasLabelPrinter = labelPrinterName != null && labelPrinterName.trim() !== '';
  const hasStoreName = storeName != null && storeName.trim() !== '';
  const canAccessAdmin = canAccessPage('administrator');

  // When store name is not set (and we've finished loading), force "show store name" off so we don't persist a useless preference
  useEffect(() => {
    if (storeNameFetched && !hasStoreName && showStoreName) setShowStoreName(false);
  }, [storeNameFetched, hasStoreName, showStoreName]);

  // When product has no barcode, force "show barcode" off (label will be name + price only)
  useEffect(() => {
    if (open && (!barcode || barcode.trim() === '') && showBarcode) setShowBarcode(false);
  }, [open, barcode, showBarcode]);

  const handleSetupPrinter = () => {
    if (!canAccessAdmin) return;
    onOpenChange(false);
    navigate('/administrator?tab=receipt&subTab=configurePrinters');
  };

  // Persist only when user toggles (not when we force off due to disabled state)
  const handleShowBarcodeChange = (checked: boolean) => {
    setShowBarcode(checked);
    localStorage.setItem(SHOW_BARCODE_CACHE_KEY, String(checked));
  };
  const handleShowStoreNameChange = (checked: boolean) => {
    setShowStoreName(checked);
    localStorage.setItem(SHOW_STORE_NAME_CACHE_KEY, String(checked));
  };

  const formatPrice = (price: number | string): string => {
    if (!price || price === '') return t('stock.noPrice', 'No price');
    const numPrice = Number(price);
    // Remove unnecessary decimal places and format with spaces
    if (numPrice % 1 === 0) {
      return `${Math.round(numPrice).toLocaleString('fr-FR')} DA`;
    } else {
      return `${numPrice.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DA`;
    }
  };

  // Require only product name; barcode is optional (labels can show name + price only)
  if (!productName || !productName.trim()) {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={t('stock.barcodePreview', 'Barcode Label Preview')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center text-red-600">
            <p>{t('stock.productNameRequiredForLabel', 'Product name is required for label preview')}</p>
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  const hasBarcodeValue = barcode != null && barcode.trim() !== '';
  let barcodeFormat: 'EAN13' | 'CODE128' | 'UPC' = 'EAN13';
  let barcodeImage: string = '';

  if (hasBarcodeValue) {
    barcodeFormat = getRecommendedFormat(barcode);
    try {
      barcodeImage = generateRealBarcode(barcode, {
        format: barcodeFormat,
        width: 4,
        height: 80,
        displayValue: false,
        fontSize: 14,
        margin: 5,
      });
    } catch (error) {
      console.error('Failed to generate barcode image:', error);
      barcodeImage = '';
    }
  }

  // When no barcode, force "show barcode" off and treat as label without barcode
  const canShowBarcode = hasBarcodeValue && barcodeImage.length > 0;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('stock.barcodePreview', 'Barcode Label Preview')}
      size="lg"
    >
      <div className="space-y-2">
        {/* No label printer set: show dialog and disable Print (only after load: labelPrinterName !== null) */}
        {labelPrinterName !== null && !hasLabelPrinter && showNoPrinterDialog && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-600" />
              {t('stock.labelPrinterNotSetTitle', 'Label printer not set')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('stock.labelPrinterNotSetMessage', 'You need to set up the label printer in the Admin page to print barcode labels. Go to Admin → Configure Printing → Configure Printers and choose your label printer.')}
            </p>
            <div className="flex gap-2 justify-end">
              
              {canAccessAdmin ? (
                <Button size="sm" onClick={handleSetupPrinter} className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  {t('stock.setupPrinter', 'Setup Printer')}
                </Button>
              ) : (
                <Tooltip content={t('stock.noAccessToAdminTooltip', 'You do not have access to the Admin page.')} position="top">
                  <span className="inline-block">
                    <Button size="sm" disabled className="bg-amber-600/50 text-white cursor-not-allowed">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('stock.setupPrinter', 'Setup Printer')}
                    </Button>
                  </span>
                </Tooltip>
              )}
            </div>
          </div>
        )}
        {/* Preview Label */}
        <div className="flex justify-center">
          <div 
            className={`bg-white border-2 border-gray-300 rounded-lg shadow-lg ${!showBarcode ? 'flex items-center justify-center' : ''}`}
            style={{ 
              width: '310px', 
              height: '160px',
              minHeight: '160px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '2.85px', // 0.5mm scaled 1.5x
              paddingBottom: '0',
              boxSizing: 'border-box',
              gap: showBarcode ? '0' : '10px',
              fontFamily: "'Instrument Serif', Georgia, serif",
            }}
          >
            {/* Store Name (matches printed label when "Show store name" is on) */}
            {showStoreName && storeName ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  width: 'fit-content',
                  maxWidth: '100%',
                  fontSize: showBarcode ? '14px' : '18px',
                  fontWeight: 600,
                  color: '#000000',
                  margin: '3.78px 0 1.89px 0', // ~1mm 0 0.5mm 0
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ width: '2.65px', height: '2.65px', borderRadius: '50%', background: '#333', flexShrink: 0 }} aria-hidden />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{storeName}</span>
                <span style={{ width: '2.65px', height: '2.65px', borderRadius: '50%', background: '#333', flexShrink: 0 }} aria-hidden />
              </div>
            ) : null}
            {/* Product Name */}
            <div 
              style={{
                fontSize: showBarcode ? '18px' : '27px', // 12px/18px scaled 1.5x
                fontWeight: 600,
                color: '#000000',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                marginTop: showStoreName && storeName ? 0 : 30,
                marginBottom: 0,
                paddingTop: 0,
                paddingBottom: '3px', // 2px scaled 1.5x
                overflow: 'visible',
                lineHeight: 1.1,
                maxWidth: '100%'
              }}
            >
              {productName}
            </div>
            
            {/* Price: optional previous (one diagonal line top-right to bottom-left, bigger, up) + current price */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: '6px',
                padding: 0,
                margin: 0,
                marginTop: showBarcode ? '-6px' : '0',
                flexWrap: 'wrap',
              }}
            >
              {showPreviousPrice && previousPrice != null && previousPrice !== '' ? (
                <span
                  className="barcode-preview-previous-price"
                  style={{
                    fontSize: showBarcode ? '17px' : '26px',
                    fontWeight: 600,
                    color: '#000000',
                    alignSelf: 'flex-end',
                    marginBottom: showBarcode ? '8px' : '5px',
                    marginRight: '3px',
                  }}
                >
                  {formatPrice(previousPrice)}
                </span>
              ) : null}
              <span
                style={{
                  fontSize: showBarcode ? '22.5px' : '40px',
                  fontWeight: 600,
                  color: '#000000',
                }}
              >
                {formatPrice(price)}
              </span>
            </div>
            
            {/* Barcode (only when barcode exists and "Show Barcode" is on) */}
            {canShowBarcode && showBarcode && barcodeImage && (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0px',
                  marginTop: '-4px',
                  marginBottom: 0,
                  paddingBottom: 0
                }}
              >
                <img 
                  src={barcodeImage} 
                  alt={`Barcode: ${barcode}`}
                  style={{
                    width: '100%',
                    height: '48px',
                    border: 'none',
                    padding: 0,
                    background: 'white'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Barcode Info (only when barcode is shown) */}
        {canShowBarcode && showBarcode && (
          <div className="text-center text-sm text-gray-600">
            <p>
              {t('stock.barcodeFormat', 'Format')}: {barcodeFormat} | 
              {t('stock.barcodeLength', 'Length')}: {barcode.length}
            </p>
          </div>
        )}

        {/* Show Barcode & Show Store Name Checkboxes */}
        <div className="flex flex-col items-center justify-center gap-y-3">
          {canShowBarcode ? (
            <Checkbox
              checked={showBarcode}
              onChange={setShowBarcode}
              label={t('stock.showBarcode', 'Show Barcode')}
              color="green"
            />
          ) : (
            <Tooltip
              content={t('stock.noBarcodeForLabelTooltip', 'No barcode on this product – label will show name and price only')}
              position="top"
            >
              <span className="inline-flex items-center self-center">
                <Checkbox
                  checked={false}
                  onChange={() => {}}
                  label={t('stock.showBarcode', 'Show Barcode')}
                  color="green"
                  disabled
                />
              </span>
            </Tooltip>
          )}
          {previousPrice != null && previousPrice !== '' ? (
            <Checkbox
              checked={showPreviousPrice}
              onChange={(checked) => setShowPreviousPrice(checked)}
              label={t('stock.showPreviousPrice', 'Show previous price')}
              color="green"
            />
          ) : null}
          {hasStoreName ? (
            <Checkbox
              checked={showStoreName}
              onChange={handleShowStoreNameChange}
              label={t('stock.showStoreNameOnLabel', 'Show store name on label')}
              color="green"
            />
          ) : (
            <Tooltip
              content={t('stock.storeNameRequiredForLabelTooltip', 'Enter the store name in Admin → Receipt & Service Ticket to show it on labels.')}
              position="top"
            >
              <span className="inline-flex items-center self-center">
                <Checkbox
                  checked={false}
                  onChange={() => {}}
                  label={t('stock.showStoreNameOnLabel', 'Show store name on label')}
                  color="green"
                  disabled
                />
              </span>
            </Tooltip>
          )}
        </div>

        {/* Quantity Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('stock.quantity', 'Quantity')}
          </label>
          <StyledNumberInput
            value={quantity}
            onChange={(value: number | "") => setQuantity(value)}
            min={1}
            max={100}
            placeholder={t('stock.quantity', 'Quantity')}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Tooltip
            content={t('common.cancelTooltip', 'Cancel and close preview')}
            position="top"
          >
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              {t('common.cancel', 'Cancel')}
            </Button>
          </Tooltip>
          <Tooltip
            content={!hasLabelPrinter ? t('stock.labelPrinterNotSetTitle', 'Label printer not set') : t('stock.printBarcodeTooltip', 'Print barcode label(s)')}
            position="top"
          >
            <span className="inline-block">
              <Button
                onClick={() => {
                  if (!hasLabelPrinter) return;
                  const qty = quantity || 1;
                  const shouldShowBarcode = canShowBarcode && showBarcode === true;
                  const shouldShowStoreName = hasStoreName && showStoreName === true;
                  const shouldShowPreviousPrice = showPreviousPrice && previousPrice != null && previousPrice !== '';
                  onPrint(qty, shouldShowBarcode, shouldShowStoreName, shouldShowPreviousPrice);
                }}
                disabled={!hasLabelPrinter}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer className="w-4 h-4 mr-2" />
                {t('stock.printBarcode', 'Print')} {(quantity || 1) > 1 ? `(${quantity || 1})` : ''}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </Modal>
  );
};
