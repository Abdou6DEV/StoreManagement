import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Printer, X, Settings } from 'lucide-react';
import { Modal } from '../../../lib/components/modal';
import { Button } from '../../../lib/components/button';
import StyledNumberInput from '../../../lib/components/inputNumber';
import { Tooltip } from '../../../lib/components/tooltip';
import { useAuth } from '../../../lib/contexts/authContext';
import type { ServiceLabelData } from '../utils/serviceLabelPrintUtils';
import '@fontsource/instrument-serif';

interface ServiceLabelPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ServiceLabelData;
  onPrint: (quantity: number) => void | Promise<void>;
}

export const ServiceLabelPreviewModal: React.FC<ServiceLabelPreviewModalProps> = ({
  open,
  onOpenChange,
  data,
  onPrint,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { canAccessPage } = useAuth();
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [labelPrinterName, setLabelPrinterName] = useState<string | null>(null);
  const [showNoPrinterDialog, setShowNoPrinterDialog] = useState(true);

  useEffect(() => {
    if (!open) return;
    setShowNoPrinterDialog(true);
    void window.api?.database?.options?.get?.('labelPrinterName').then((name: string | undefined) => {
      setLabelPrinterName(name ?? '');
    });
  }, [open]);

  const hasLabelPrinter = labelPrinterName != null && labelPrinterName.trim() !== '';
  const canAccessAdmin = canAccessPage('administrator');

  const handleSetupPrinter = () => {
    if (!canAccessAdmin) return;
    onOpenChange(false);
    navigate('/administrator?tab=receipt&subTab=configurePrinters');
  };

  const formatPrice = (p: number | string): string => {
    if (p === '' || p == null) return '\u200E—';
    const num = Number(p);
    const lrm = '\u200E'; // Left-to-Right Mark - prevents digit reversal in RTL
    if (num % 1 === 0) return `${lrm}${Math.round(num).toLocaleString('en-US')} DA`;
    return `${lrm}${Number(p).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} DA`;
  };

  const { serviceName, clientName, deviceName, price } = data;
  const hasServiceName = serviceName != null && serviceName.trim() !== '';

  if (!hasServiceName) {
    return (
      <Modal open={open} onOpenChange={onOpenChange} title={t('services.serviceLabelPreview', 'Service Label Preview')} size="lg">
        <div className="space-y-6">
          <p className="text-center text-red-600">
            {t('services.serviceNameRequiredForLabel', 'Service name is required for the label.')}
          </p>
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
    <Modal open={open} onOpenChange={onOpenChange} title={t('services.serviceLabelPreview', 'Service Label Preview')} size="lg">
      <div className="space-y-4">
        {labelPrinterName !== null && !hasLabelPrinter && showNoPrinterDialog && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-600" />
              {t('stock.labelPrinterNotSetTitle', 'Label printer not set')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('stock.labelPrinterNotSetMessage', 'You need to set up the label printer in the Admin page to print labels.')}
            </p>
            <div className="flex gap-2 justify-end">
              {canAccessAdmin ? (
                <Button size="sm" onClick={handleSetupPrinter} className="bg-amber-600 hover:bg-amber-700 text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  {t('stock.setupPrinter', 'Setup Printer')}
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">{t('stock.noAccessToAdminTooltip', 'You do not have access to the Admin page.')}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-center">
          <div
            className="bg-white border-2 border-gray-300 rounded-lg shadow-lg flex flex-col items-center justify-center gap-0.5 p-2"
            style={{
              width: '310px',
              height: '160px',
              fontFamily: "'Instrument Serif', Georgia, serif",
            }}
          >
            <div className="text-center font-bold text-black text-base overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
              {t('services.serviceLabelService', 'Service:')} {serviceName.trim()}
            </div>
            <div className="text-center font-bold text-black text-sm overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
              {t('services.serviceLabelClient', 'Client:')} {clientName.trim() || '—'}
            </div>
            <div className="text-center font-bold text-black text-sm overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
              {t('services.serviceLabelDevice', 'Device:')} {deviceName.trim() || '—'}
            </div>
            <div className="text-center font-bold text-black text-lg mt-0.5" dir="ltr">
              {t('services.serviceLabelPrice', 'Price:')} {formatPrice(price)}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t('stock.quantity', 'Quantity')}</label>
          <StyledNumberInput
            value={quantity}
            onChange={(v: number | '') => setQuantity(v)}
            min={1}
            max={100}
            placeholder={t('stock.quantity', 'Quantity')}
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            {t('common.cancel', 'Cancel')}
          </Button>
          <Tooltip
            content={!hasLabelPrinter ? t('stock.labelPrinterNotSetTitle', 'Label printer not set') : t('services.printServiceLabelTooltip', 'Print service label(s)')}
            position="top"
          >
            <span className="inline-block">
              <Button
                onClick={() => {
                  if (!hasLabelPrinter) return;
                  const qty = quantity || 1;
                  void Promise.resolve(onPrint(qty));
                }}
                disabled={!hasLabelPrinter}
                className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:pointer-events-none"
              >
                <Printer className="w-4 h-4 mr-2" />
                {t('services.printServiceLabel', 'Print')} {(quantity || 1) > 1 ? `(${quantity || 1})` : ''}
              </Button>
            </span>
          </Tooltip>
        </div>
      </div>
    </Modal>
  );
};
