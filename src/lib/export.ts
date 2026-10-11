import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type ShareResult = 'shared' | 'downloaded';
const EXPORT_DIRECTORY = 'hoshii-exports';
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

function safeFilename(filename: string, type: string): string {
  const extension = type === 'image/jpeg' ? 'jpg' : 'png';
  const name = filename.replace(/\.(png|jpe?g)$/i, '').replace(/[^a-zA-Z0-9 _.-]/g, '').trim().slice(0, 72);
  return `${name || 'Hoshii artwork'}.${extension}`;
}

function isCancellation(error: unknown): boolean {
  if (!(error instanceof Error) && (typeof error !== 'object' || error === null)) return false;
  const value = error as { name?: string; message?: string; code?: string };
  return value.name === 'AbortError' || value.code === 'CANCELED' || /cancelled|canceled|share canceled/i.test(value.message ?? '');
}

async function toBase64(blob: Blob): Promise<string> {
  // FileReader avoids huge intermediate spread arrays for high-resolution exports.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('The finished image could not be read for sharing.'));
    reader.readAsDataURL(blob);
  });
}

async function removeExpiredExports(): Promise<void> {
  try {
    const files = await Filesystem.readdir({ path: EXPORT_DIRECTORY, directory: Directory.Cache });
    const cutoff = Date.now() - CACHE_MAX_AGE;
    await Promise.all(files.files.filter(file => file.type === 'file' && (file.mtime ?? Date.now()) < cutoff)
      .map(file => Filesystem.deleteFile({ path: `${EXPORT_DIRECTORY}/${file.name}`, directory: Directory.Cache })));
  } catch { /* A new installation has no export directory yet. Cache cleanup is best effort. */ }
}

/**
 * Exports only the supplied final render. Native files stay in private cache for 24h so recipients
 * can finish reading them. Android may reclaim cache sooner; stale files are removed at next share.
 * "shared" means the share sheet was handled (including cancellation), not that a recipient saved it.
 */
export async function shareArtwork(blob: Blob, filename: string): Promise<ShareResult> {
  if (!blob.size) throw new Error('The exported image is empty. Please try exporting again.');
  const name = safeFilename(filename, blob.type);
  if (Capacitor.isNativePlatform()) {
    await removeExpiredExports();
    const path = `${EXPORT_DIRECTORY}/${Date.now()}-${crypto.randomUUID()}-${name}`;
    const file = await Filesystem.writeFile({ path, directory: Directory.Cache, data: await toBase64(blob), recursive: true });
    try {
      await Share.share({ title: 'Made in Hoshii', files: [file.uri], dialogTitle: 'Share your artwork' });
      return 'shared';
    } catch (error) {
      // A canceled chooser has no receiver that needs the image, so remove this temporary copy.
      if (isCancellation(error)) {
        await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
        return 'shared';
      }
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => undefined);
      throw error;
    }
  }

  const file = new File([blob], name, { type: blob.type || 'image/png' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title: 'Made in Hoshii', files: [file] });
      return 'shared';
    } catch (error) {
      if (isCancellation(error)) return 'shared';
      // Browser share may be unavailable in an embedded frame; download remains usable.
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  // Revoke after the browser has consumed the click; immediate revocation breaks some WebViews.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}
