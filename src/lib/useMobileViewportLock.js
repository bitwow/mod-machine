import { useEffect, useRef } from 'react';

const scrollableSelector = '.tracker-scroll, .playlist-panel ol';

export function useMobileViewportLock() {
  const touchStartY = useRef(0);

  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 720px)').matches;

    const handleTouchStart = (event) => {
      touchStartY.current = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event) => {
      if (!isMobile() || event.touches.length !== 1) return;

      const deltaY = (event.touches[0]?.clientY ?? 0) - touchStartY.current;
      const scrollable = event.target.closest?.(scrollableSelector);

      if (!scrollable) {
        if (!event.target.closest?.('input[type="range"]')) event.preventDefault();
        return;
      }

      const atTop = scrollable.scrollTop <= 0;
      const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) event.preventDefault();
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);
}
