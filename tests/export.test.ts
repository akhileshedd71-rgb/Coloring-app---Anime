import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const native = vi.hoisted(() => ({
  isNativePlatform: vi.fn(), writeFile: vi.fn(), deleteFile: vi.fn(), readdir: vi.fn(), share: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: native.isNativePlatform } }));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Filesystem: { writeFile: native.writeFile, deleteFile: native.deleteFile, readdir: native.readdir },
}));
vi.mock('@capacitor/share', () => ({ Share: { share: native.share } }));

import { shareArtwork } from '../src/lib/export';

let link: { href: string; download: string; style: { display: string }; click: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
let browserShare: ReturnType<typeof vi.fn>;
let createURL: ReturnType<typeof vi.spyOn>;
let revokeURL: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  native.isNativePlatform.mockReturnValue(false);
  native.writeFile.mockResolvedValue({ uri: 'file:///private/cache/art.png' });
  native.deleteFile.mockResolvedValue(undefined);
  native.readdir.mockRejectedValue(new Error('Directory does not exist'));
  native.share.mockResolvedValue({ activityType: 'test' });
  link = { href: '', download: '', style: { display: '' }, click: vi.fn(), remove: vi.fn() };
  browserShare = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share: browserShare, canShare: vi.fn().mockReturnValue(false) });
  vi.stubGlobal('document', { createElement: vi.fn().mockReturnValue(link), body: { appendChild: vi.fn() } });
  vi.stubGlobal('window', { setTimeout });
  createURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test-art');
  revokeURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.stubGlobal('FileReader', class {
    result: string | null = null;
    onload?: () => void;
    readAsDataURL(blob: Blob) {
      void blob.arrayBuffer().then(bytes => {
        this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`;
        this.onload?.();
      });
    }
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('finished artwork sharing', () => {
  it('downloads the supplied final bytes with a safe filename and revokes its URL', async () => {
    const blob = new Blob(['finished canvas pixels'], { type: 'image/jpeg' });
    await expect(shareArtwork(blob, '../Moon Garden.png')).resolves.toBe('downloaded');
    expect(createURL).toHaveBeenCalledWith(blob);
    expect(link.download).toBe('..Moon Garden.jpg');
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(revokeURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30_000);
    expect(revokeURL).toHaveBeenCalledWith('blob:test-art');
  });

  it('passes a real image file to the browser share sheet', async () => {
    vi.mocked(navigator.canShare).mockReturnValue(true);
    const blob = new Blob(['final pixels'], { type: 'image/png' });
    await expect(shareArtwork(blob, 'Moon Garden')).resolves.toBe('shared');
    const shared = browserShare.mock.calls[0][0].files[0] as File;
    expect(shared.name).toBe('Moon Garden.png');
    expect(shared.type).toBe('image/png');
    expect(await shared.text()).toBe('final pixels');
    expect(createURL).not.toHaveBeenCalled();
  });

  it('treats browser cancellation as handled without downloading or leaking an object URL', async () => {
    vi.mocked(navigator.canShare).mockReturnValue(true);
    browserShare.mockRejectedValue(new DOMException('The user canceled', 'AbortError'));
    await expect(shareArtwork(new Blob(['pixels']), 'Moon')).resolves.toBe('shared');
    expect(createURL).not.toHaveBeenCalled();
    expect(link.click).not.toHaveBeenCalled();
  });

  it('falls back to a download if browser sharing is blocked', async () => {
    vi.mocked(navigator.canShare).mockReturnValue(true);
    browserShare.mockRejectedValue(new DOMException('Restricted document', 'NotAllowedError'));
    await expect(shareArtwork(new Blob(['pixels']), 'Moon')).resolves.toBe('downloaded');
    expect(link.click).toHaveBeenCalledOnce();
  });

  it('writes image bytes to Android private cache and shares its URI', async () => {
    native.isNativePlatform.mockReturnValue(true);
    await expect(shareArtwork(new Blob(['pixels'], { type: 'image/png' }), 'Moon')).resolves.toBe('shared');
    expect(native.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      directory: 'CACHE', data: 'cGl4ZWxz', recursive: true,
      path: expect.stringMatching(/^hoshii-exports\/\d+-[\da-f-]+-Moon.png$/),
    }));
    expect(native.share).toHaveBeenCalledWith(expect.objectContaining({ files: ['file:///private/cache/art.png'] }));
    expect(createURL).not.toHaveBeenCalled();
    expect(native.deleteFile).not.toHaveBeenCalled();
  });

  it('removes canceled Android exports and reports genuine native failures', async () => {
    native.isNativePlatform.mockReturnValue(true);
    native.share.mockRejectedValueOnce({ message: 'Share canceled' });
    await expect(shareArtwork(new Blob(['pixels']), 'Moon')).resolves.toBe('shared');
    expect(native.deleteFile).toHaveBeenCalledOnce();
    const failure = new Error('No Android share activity available');
    native.share.mockRejectedValueOnce(failure);
    await expect(shareArtwork(new Blob(['pixels']), 'Moon')).rejects.toBe(failure);
    expect(native.deleteFile).toHaveBeenCalledTimes(2);
  });

  it('cleans expired private cache exports but leaves recent images readable by receivers', async () => {
    native.isNativePlatform.mockReturnValue(true);
    native.readdir.mockResolvedValue({ files: [
      { type: 'file', name: 'old.png', mtime: Date.now() - 25 * 60 * 60 * 1000 },
      { type: 'file', name: 'recent.png', mtime: Date.now() - 60 * 60 * 1000 },
    ] });
    await shareArtwork(new Blob(['pixels']), 'Moon');
    expect(native.deleteFile).toHaveBeenCalledExactlyOnceWith({ directory: 'CACHE', path: 'hoshii-exports/old.png' });
  });

  it('rejects empty images before opening a share sheet', async () => {
    await expect(shareArtwork(new Blob([]), 'Moon')).rejects.toThrow('empty');
    expect(browserShare).not.toHaveBeenCalled();
    expect(native.writeFile).not.toHaveBeenCalled();
  });
});
