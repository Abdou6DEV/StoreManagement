import React, { useState } from 'react';
import { Trash2Icon, AlertTriangleIcon } from 'lucide-react';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { useToast } from '../contexts/toastContext';
import { useTranslation } from 'react-i18next';

interface CleanupButtonProps {
  onCleanup?: () => void;
  className?: string;
}

export function CleanupButton({ onCleanup, className }: CleanupButtonProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unusedProducts, setUnusedProducts] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handlePreview = async () => {
    setIsLoadingPreview(true);
    try {
      const products = await window.api.database.products.getUnused();
      setUnusedProducts(products);
    } catch (error) {
      console.error('Error fetching unused products:', error);
      showToast('Error fetching unused products', 'error');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await window.api.database.products.cleanupUnused();
      
      if (result.deletedCount > 0) {
        showToast(
          `Successfully cleaned up ${result.deletedCount} unused products`,
          'success'
        );
        onCleanup?.();
      } else {
        showToast('No unused products found to clean up', 'info');
      }
    } catch (error) {
      console.error('Error cleaning up products:', error);
      showToast('Error cleaning up products', 'error');
    } finally {
      setIsLoading(false);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          handlePreview();
          setIsDialogOpen(true);
        }}
        className={className}
      >
        <Trash2Icon className="h-4 w-4 mr-2" />
        {t('stock.cleanupUnused')}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-orange-500" />
              {t('stock.cleanupUnusedProducts')}
            </DialogTitle>
            <DialogDescription>
              {t('stock.cleanupUnusedDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isLoadingPreview ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">
                  {t('stock.loadingUnusedProducts')}
                </p>
              </div>
            ) : unusedProducts.length > 0 ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  {t('stock.foundUnusedProducts', { count: unusedProducts.length })}
                </p>
                <div className="max-h-60 overflow-y-auto border rounded-md">
                  <div className="divide-y">
                    {unusedProducts.map((product) => (
                      <div key={product.id} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">
                            {product.categoryName} • {t('stock.quantity')}: {product.quantity}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(product.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-green-600 font-medium">
                  {t('stock.noUnusedProducts')}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {t('stock.noUnusedProductsDescription')}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={isLoading || unusedProducts.length === 0}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('stock.cleaningUp')}
                </>
              ) : (
                <>
                  <Trash2Icon className="h-4 w-4 mr-2" />
                  {t('stock.cleanupNow')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
