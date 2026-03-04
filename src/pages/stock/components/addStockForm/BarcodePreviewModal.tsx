import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, X } from 'lucide-react';
import { Modal } from '../../../../lib/components/modal';
import { Button } from '../../../../lib/components/button';
import StyledNumberInput from '../../../../lib/components/inputNumber';
import { Checkbox } from '../../../../lib/components/checkbox';
import { generateRealBarcode, getRecommendedFormat } from '../../../../lib/utils/barcodeVisual';
import { Tooltip } from '../../../../lib/components/tooltip';

interface BarcodePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  price: number | string;
  barcode: string;
  onPrint: (quantity?: number, showBarcode?: boolean, showStoreName?: boolean) => void;
}

const SHOW_BARCODE_CACHE_KEY = 'barcodePreview_showBarcode';
const SHOW_STORE_NAME_CACHE_KEY = 'barcodePreview_showStoreName';

export const BarcodePreviewModal: React.FC<BarcodePreviewModalProps> = ({
  open,
  onOpenChange,
  productName,
  price,
  barcode,
  onPrint,
}) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState<number | "">(1);
  const [showBarcode, setShowBarcode] = useState<boolean>(() => {
    const cached = localStorage.getItem(SHOW_BARCODE_CACHE_KEY);
    return cached !== null ? cached === 'true' : true;
  });
  const [showStoreName, setShowStoreName] = useState<boolean>(() => {
    const cached = localStorage.getItem(SHOW_STORE_NAME_CACHE_KEY);
    return cached !== null ? cached === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(SHOW_BARCODE_CACHE_KEY, showBarcode.toString());
  }, [showBarcode]);
  useEffect(() => {
    localStorage.setItem(SHOW_STORE_NAME_CACHE_KEY, showStoreName.toString());
  }, [showStoreName]);

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

  // Handle empty or invalid barcode
  if (!barcode || barcode.trim() === '') {
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={t('stock.barcodePreview', 'Barcode Label Preview')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center text-red-600">
            <p>{t('stock.barcodePreviewError', 'Product name and barcode are required for preview')}</p>
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

  const barcodeFormat = getRecommendedFormat(barcode);
  let barcodeImage: string;
  
  try {
    barcodeImage = generateRealBarcode(barcode, {
      format: barcodeFormat,
      width: 4,
      height: 80,
      displayValue: false, // Don't show barcode number in the barcode itself
      fontSize: 14,
      margin: 5,
    });
  } catch (error) {
    console.error('Failed to generate barcode image:', error);
    return (
      <Modal
        open={open}
        onOpenChange={onOpenChange}
        title={t('stock.barcodePreview', 'Barcode Label Preview')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center text-red-600">
            <p>{t('stock.barcodeGenerationError', 'Failed to generate barcode')}</p>
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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('stock.barcodePreview', 'Barcode Label Preview')}
      size="lg"
    >
      <div className="space-y-2">
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
              gap: showBarcode ? '0' : '12px'
            }}
          >
            {/* Product Name */}
            <div 
              style={{
                fontSize: showBarcode ? '18px' : '27px', // 12px/18px scaled 1.5x
                fontWeight: 600,
                color: '#000000',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                marginTop: 30,
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
            
            {/* Price */}
            <div 
              style={{
                fontSize: showBarcode ? '22.5px' : '33px', // 15px/22px scaled 1.5x
                fontWeight: 600,
                color: '#000000',
                padding: 0,
                margin: 0,
                marginTop: showBarcode ? '-6px' : '0', // -4px scaled 1.5x
              }}
            >
              {formatPrice(price)}
            </div>
            
            {/* Barcode */}
            {showBarcode && (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0px',
                  marginTop: '-4px', // -6px scaled 1.5x
                  marginBottom: 0,
                  paddingBottom: 0
                }}
              >
                <img 
                  src={barcodeImage} 
                  alt={`Barcode: ${barcode}`}
                  style={{
                    width: '100%',
                    height: '48px', // 32px scaled 1.5x
                    border: 'none',
                    padding: 0,
                    background: 'white'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Barcode Info */}
        {showBarcode && (
          <div className="text-center text-sm text-gray-600">
            <p>
              {t('stock.barcodeFormat', 'Format')}: {barcodeFormat} | 
              {t('stock.barcodeLength', 'Length')}: {barcode.length}
            </p>
          </div>
        )}

        {/* Show Barcode & Show Store Name Checkboxes */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <Checkbox
            checked={showBarcode}
            onChange={setShowBarcode}
            label={t('stock.showBarcode', 'Show Barcode')}
            color="green"
          />
          <Checkbox
            checked={showStoreName}
            onChange={setShowStoreName}
            label={t('stock.showStoreNameOnLabel', 'Show store name on label')}
            color="green"
          />
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
            content={t('stock.printBarcodeTooltip', 'Print barcode label(s)')}
            position="top"
          >
            <Button
              onClick={() => {
                const qty = quantity || 1;
                const shouldShowBarcode = showBarcode === true;
                const shouldShowStoreName = showStoreName === true;
                onPrint(qty, shouldShowBarcode, shouldShowStoreName);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              {t('stock.printBarcode', 'Print')} {(quantity || 1) > 1 ? `(${quantity || 1})` : ''}
            </Button>
          </Tooltip>
        </div>
      </div>
    </Modal>
  );
};
