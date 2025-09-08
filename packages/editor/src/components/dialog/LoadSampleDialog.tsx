import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';
import { useI18n } from '../../i18n';

interface LoadSampleDialogProps {
    open: boolean;
    onCancel: () => void;
    onLoad: () => void;
}

export const LoadSampleDialog: React.FC<LoadSampleDialogProps> = ({ open, onCancel, onLoad }) => {
    const { t } = useI18n();
    return (
        <Dialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
                <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg max-w-lg w-[90vw] p-6 z-50">
                    <Dialog.Title className="text-lg font-semibold mb-3">{t('dialog.loadSample.title')}</Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-600 mb-4">{t('dialog.loadSample.desc')}</Dialog.Description>
                    <div className="flex justify-end gap-2">
                        <Dialog.Close asChild>
                            <button type="button" className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
                                {t('dialog.loadSample.cancel')}
                            </button>
                        </Dialog.Close>
                        <button type="button" className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700" onClick={onLoad}>
                            {t('dialog.loadSample.load')}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default LoadSampleDialog;
