import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const RELOAD_VERSION_PARAM = 'reloadVersion';

function refreshWithCacheBust() {
  const url = new URL(window.location.href);
  url.searchParams.set(RELOAD_VERSION_PARAM, Date.now().toString());
  window.location.replace(url.toString());
}

export function UpdateBanner() {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener('app:version-mismatch', handler);
    return () => window.removeEventListener('app:version-mismatch', handler);
  }, []);

  useEffect(() => {
    if (!visible) return;

    const updateBannerHeight = () => {
      const bannerHeight = bannerRef.current?.getBoundingClientRect().height ?? 0;
      document.documentElement.style.setProperty('--update-banner-height', `${bannerHeight}px`);
    };

    updateBannerHeight();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateBannerHeight);

      return () => {
        window.removeEventListener('resize', updateBannerHeight);
        document.documentElement.style.removeProperty('--update-banner-height');
      };
    }

    const resizeObserver = new ResizeObserver(updateBannerHeight);
    if (bannerRef.current) {
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty('--update-banner-height');
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      ref={bannerRef}
      className="sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-2.5 bg-yellow-400 text-yellow-900"
    >
      <span className="text-sm font-medium">
        A new version is available. Refresh to get the latest update.
      </span>
      <button
        onClick={refreshWithCacheBust}
        className="flex items-center gap-1.5 shrink-0 text-sm font-semibold px-3 py-1 rounded bg-yellow-900 text-yellow-50 hover:bg-yellow-800 transition-colors"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
    </div>
  );
}
