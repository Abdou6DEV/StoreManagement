import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Printer, X, Settings } from 'lucide-react';
import { Modal } from '../../../lib/components/modal';
import { Button } from '../../../lib/components/button';
import StyledNumberInput from '../../../lib/components/inputNumber';
import { Checkbox } from '../../../lib/components/checkbox';
import { Tooltip } from '../../../lib/components/tooltip';
import { useAuth } from '../../../lib/contexts/authContext';
import type { ServiceLabelData, ServiceLabelLabels, ServiceLabelSize } from '../utils/serviceLabelPrintUtils';

const VALID_LABEL_SIZES: ServiceLabelSize[] = ['20x40', '35x45', '25x50'];
const LABEL_SIZE_CACHE_KEY = 'serviceLabelPreview_labelSize';

/** Preview scale: 6px per mm so 40×20mm = 240×120px (larger preview) */
const PREVIEW_PX_PER_MM = 6;

const SIZE_MM: Record<ServiceLabelSize, { width: number; height: number }> = {
  '20x40': { width: 40, height: 20 },
  '35x45': { width: 45, height: 35 },
  '25x50': { width: 50, height: 25 },
};

function getPreviewScale(size: ServiceLabelSize): number {
  const { width, height } = SIZE_MM[size];
  return Math.min(width / 40, height / 20);
}

function formatPricePreview(p: number | string): string {
  if (p === '' || p == null) return '—';
  const numPrice = Number(p);
  const spaceThousands = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (numPrice % 1 === 0) {
    return `${spaceThousands(String(Math.round(numPrice)))} DA`;
  }
  const [intPart, decPart] = numPrice.toFixed(2).split('.');
  return `${spaceThousands(intPart)}.${decPart} DA`;
}

export interface ServiceLabelPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ServiceLabelData;
  labels: ServiceLabelLabels;
  onPrint: (labelSize: ServiceLabelSize, quantity: number) => void;
}

export const ServiceLabelPrintModal: React.FC<ServiceLabelPrintModalProps> = ({
  open,
  onOpenChange,
  data,
  labels,
  onPrint,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAccessPage } = useAuth();
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [labelSize, setLabelSize] = useState<ServiceLabelSize>(() => {
    const cached = typeof localStorage !== 'undefined' ? localStorage.getItem(LABEL_SIZE_CACHE_KEY) : null;
    return cached && VALID_LABEL_SIZES.includes(cached as ServiceLabelSize) ? (cached as ServiceLabelSize) : '20x40';
  });
  const [labelPrinters, setLabelPrinters] = useState<Record<ServiceLabelSize, string> | null>(null);
  const [showNoPrinterDialog, setShowNoPrinterDialog] = useState(true);

  useEffect(() => {
    if (!open) return;
    setShowNoPrinterDialog(true);
    void Promise.all([
      window.api?.database?.options?.get?.('labelPrinterName_20x40'),
      window.api?.database?.options?.get?.('labelPrinterName_35x45'),
      window.api?.database?.options?.get?.('labelPrinterName_25x50'),
      window.api?.database?.options?.get?.('labelPrinterName'),
    ]).then(([p20, p35, p25, legacy]) => {
      const fallback = legacy ?? '';
      setLabelPrinters({
        '20x40': p20 ?? fallback,
        '35x45': p35 ?? fallback,
        '25x50': p25 ?? fallback,
      });
    });
  }, [open]);

  const printerForSize = labelPrinters?.[labelSize] ?? '';
  const hasLabelPrinter = labelPrinters != null && printerForSize.trim() !== '';
  const canAccessAdmin = canAccessPage('administrator');

  const handleSetupPrinter = () => {
    if (!canAccessAdmin) return;
    onOpenChange(false);
    navigate('/administrator?tab=receipt&subTab=configurePrinters');
  };

  const isFullLabel = labelSize === '25x50' || labelSize === '35x45';
  const is35x45 = labelSize === '35x45';
  const {
    serviceName,
    clientName,
    deviceName,
    price,
    isPaid = false,
    dueDate,
    problems,
  } = data;
  const paymentSuffix = ` (${isPaid ? labels.payed : labels.notPayed})`;
  const ensureColon = (s: string) => (s.trim().endsWith(':') ? s.trim() : s.trim() + ':');
  const dueDateLabel = ensureColon(labels.dueDate ?? 'Due date');
  const problemsLabel = ensureColon(labels.problems ?? 'Problems');
  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : '';
  const problemsStr = problems?.trim() ?? '';

  const outerWidthPx = SIZE_MM[labelSize].width * PREVIEW_PX_PER_MM;
  const outerHeightPx = SIZE_MM[labelSize].height * PREVIEW_PX_PER_MM;
  const scale = getPreviewScale(labelSize);
  const innerSizePx = 40 * PREVIEW_PX_PER_MM; // 160px
  const innerHeightPx = 20 * PREVIEW_PX_PER_MM; // 80px

  if (!serviceName?.trim()) {
    return (
      <Modal open={open} onOpenChange={onOpenChange} title={t('services.serviceLabelPreview', 'Service Label Preview')} size="lg">
        <div className="space-y-6">
          <div className="text-center text-red-600">
            <p>{t('services.serviceNameRequiredForLabel', 'Service name is required for label preview')}</p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
      title={t('services.serviceLabelPreview', 'Service Label Preview')}
      size="lg"
    >
      <div className="space-y-4">
        {/* No label printer set */}
        {labelPrinters !== null && !hasLabelPrinter && showNoPrinterDialog && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-600" />
              {t('stock.labelPrinterNotSetTitle', 'Label printer not set')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('stock.labelPrinterNotSetMessage', 'You need to set up the label printer in the Admin page to print service labels. Go to Admin → Configure Printing → Configure Printers and choose your label printer.')}
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

        {/* Preview */}
        <div className="flex justify-center">
          <div
            className="bg-white border-2 border-gray-300 rounded-lg shadow-lg overflow-hidden"
            style={{
              width: outerWidthPx,
              height: outerHeightPx,
              minWidth: outerWidthPx,
              minHeight: outerHeightPx,
            }}
          >
            <div
              style={{
                width: innerSizePx,
                height: innerHeightPx,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: is35x45 ? 'flex-start' : 'center',
                padding: is35x45 ? 6 : 4,
                paddingTop: is35x45 ? 6 : 4,
                boxSizing: 'border-box',
                fontFamily: "Georgia, serif",
                fontWeight: 700,
                color: '#000',
                fontSize: 15,
                lineHeight: is35x45 ? 1.05 : 1.1,
              }}
            >
              <div style={{ textAlign: 'center', maxWidth: '96%', ...(is35x45 ? { marginBottom: 3, whiteSpace: 'normal', wordBreak: 'break-word' } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
                {labels.service} {serviceName.trim() || '—'}
              </div>
              <div style={{ textAlign: 'center', maxWidth: '96%', ...(is35x45 ? { marginBottom: 3, whiteSpace: 'normal', wordBreak: 'break-word' } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
                {labels.client} {clientName?.trim() || '—'}
              </div>
              <div style={{ textAlign: 'center', maxWidth: '96%', ...(is35x45 ? { marginBottom: 3, whiteSpace: 'normal', wordBreak: 'break-word' } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
                {labels.device} {deviceName?.trim() || '—'}
              </div>
              {isFullLabel && dueDateStr && (
                <div style={{ textAlign: 'center', maxWidth: '96%', fontSize: 13, ...(is35x45 ? { marginBottom: 3, whiteSpace: 'normal', wordBreak: 'break-word' } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
                  {dueDateLabel} {dueDateStr}
                </div>
              )}
              {isFullLabel && problemsStr && (
                <div style={{ textAlign: 'center', maxWidth: '96%', fontSize: 13, ...(is35x45 ? { marginBottom: 3, whiteSpace: 'normal', wordBreak: 'break-word' } : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
                  {problemsLabel} {problemsStr}
                </div>
              )}
              <div style={{ textAlign: 'center', direction: 'ltr', unicodeBidi: 'embed', ...(is35x45 ? { whiteSpace: 'normal', wordBreak: 'break-word' } : {}) }}>
                {labels.price} {formatPricePreview(price)}{paymentSuffix}
              </div>
            </div>
          </div>
        </div>

        {/* Label size */}
        <div className="space-y-2 flex flex-col items-center">
          <span className="text-sm font-medium text-foreground block">
            {t('stock.labelSize', 'Label size')}
          </span>
          <div className="flex flex-wrap gap-3 justify-center">
            {VALID_LABEL_SIZES.map((size) => (
              <Checkbox
                key={size}
                checked={labelSize === size}
                onChange={(checked) => {
                  if (checked) {
                    setLabelSize(size);
                    try {
                      localStorage.setItem(LABEL_SIZE_CACHE_KEY, size);
                    } catch {
                      // ignore
                    }
                  }
                }}
                label={`${size.replace('x', '×')} mm`}
                color="cyan"
              />
            ))}
          </div>
          {isFullLabel && (
            <p className="text-xs text-muted-foreground">
              {t('services.serviceLabelFullSizeHint', 'Larger sizes show due date and problems.')}
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2 px-2">
          <label className="text-sm font-medium text-foreground">
            {t('stock.quantity', 'Quantity')}
          </label>
          <StyledNumberInput
            value={quantity}
            onChange={(value: number | '') => setQuantity(value)}
            min={1}
            max={100}
            placeholder={t('stock.quantity', 'Quantity')}
            className="w-full px-4 py-3.5 pr-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
          <Tooltip
            content={!hasLabelPrinter ? t('stock.labelPrinterNotSetTitle', 'Label printer not set') : t('stock.printBarcodeTooltip', 'Print label(s)')}
            position="top"
          >
            <span className="inline-block">
              <Button
                onClick={() => {
                  if (!hasLabelPrinter) return;
                  onPrint(labelSize, typeof quantity === 'number' && quantity >= 1 ? quantity : 1);
                }}
                disabled={!hasLabelPrinter}
                className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer className="w-4 h-4 mr-2" />
                {t('stock.printBarcode', 'Print')} {(typeof quantity === 'number' ? quantity : 1) > 1 ? `(${typeof quantity === 'number' ? quantity : 1})` : ''}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </Modal>
  );
};
