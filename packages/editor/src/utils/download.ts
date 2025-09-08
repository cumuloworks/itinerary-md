/**
 * Utilities for client-side file download.
 */

export interface TriggerDownloadParams {
    /** Raw data to download. Typically a string or Uint8Array */
    data: string | Blob | ArrayBufferView;
    /** Download file name, including extension */
    fileName: string;
    /** MIME type, defaults to text/plain */
    mimeType?: string;
}

/**
 * Trigger a browser download for the given data.
 */
export function triggerDownload(params: TriggerDownloadParams): void {
    const { data, fileName, mimeType = 'text/plain;charset=utf-8' } = params;

    const blob = data instanceof Blob ? data : new Blob([data as any], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}
