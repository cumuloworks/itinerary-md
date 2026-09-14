import { Dialog } from 'radix-ui';
import type React from 'react';

import { useI18n } from '../../i18n';

interface LoadSampleDialogProps {
  open: boolean;
  onCancel: () => void;
  onLoad: () => void;
}

export const LoadSampleDialog: React.FC<LoadSampleDialogProps> = ({
  open,
  onCancel,
  onLoad,
}) => {
  const { t } = useI18n();
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6">
          <Dialog.Title className="mb-3 text-lg font-semibold">
            {t('dialog.loadSample.title')}
          </Dialog.Title>
          <Dialog.Description className="mb-4 text-sm text-gray-600">
            {t('dialog.loadSample.desc')}
          </Dialog.Description>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('dialog.loadSample.cancel')}
              </button>
            </Dialog.Close>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              onClick={onLoad}
            >
              {t('dialog.loadSample.load')}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default LoadSampleDialog;
