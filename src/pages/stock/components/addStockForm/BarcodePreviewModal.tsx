import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, X } from 'lucide-react';
import { Modal } from '../../../../lib/components/modal';
import { Button } from '../../../../lib/components/button';
import StyledNumberInput from '../../../../lib/components/inputNumber';
import { generateRealBarcode, getRecommendedFormat } from '../../../../lib/utils/barcodeVisual';
import { Tooltip } from '../../../../lib/components/tooltip';

interface BarcodePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  price: number | string;
  barcode: string;
  onPrint: (quantity?: number) => void;
}

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
      width: 2,
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
      <div className="space-y-6">
        {/* Preview Label */}
        <div className="flex justify-center">
          <div 
            className="bg-white border-2 border-gray-300 rounded-lg p-6 shadow-lg"
            style={{ 
              width: '320px', 
              height: '240px',
              minHeight: '240px'
            }}
          >
            <div className="flex flex-col items-center justify-center h-full text-center">
              {/* Product Name */}
              <div className="text-2xl font-black mb-1 text-black max-w-full">
                <div className="break-words">
                  {productName}
                </div>
              </div>
              
              {/* Price */}
              <div className="text-2xl font-bold text-black mb-1">
                {formatPrice(price)}
              </div>
              
              {/* Barcode */}
              <div className="mb-0">
                <img 
                  src={barcodeImage} 
                  alt={`Barcode: ${barcode}`}
                  className="max-w-full h-auto"
                  style={{ maxWidth: '280px', height: '80px' }}
                />
                {/* Barcode Number - directly below barcode */}
                <div className="text-lg font-mono text-black tracking-wider font-bold mt-0">
                  {barcode}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Barcode Info */}
        <div className="text-center text-sm text-gray-600">
          <p>
            {t('stock.barcodeFormat', 'Format')}: {barcodeFormat} | 
            {t('stock.barcodeLength', 'Length')}: {barcode.length}
          </p>
        </div>

        {/* Quantity Input */}
        <div className="flex items-center justify-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            {t('stock.quantity', 'Quantity')}:
          </label>
          <StyledNumberInput
            value={quantity}
            onChange={(value) => setQuantity(value)}
            min={1}
            max={100}
            className="w-20"
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
              onClick={() => onPrint(quantity || 1)}
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
