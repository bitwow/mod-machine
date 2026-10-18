import { useEffect, useRef } from 'react';

const scrollableSelector = '.tracker-scroll, .playlist-panel ol';

export function useMobileViewportLock() {
  const touchStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isMobile = () => window.matchMedia('(max-width: 720px)').matches;

    const handleTouchStart = (event) => {
      touchStart.current = {
        x: event.touches[0]?.clientX ?? 0,
        y: event.touches[0]?.clientY ?? 0,
      };
    };

    const handleTouchMove = (event) => {
      if (!isMobile() || event.touches.length !== 1) return;

      const deltaX = (event.touches[0]?.clientX ?? 0) - touchStart.current.x;
      const deltaY = (event.touches[0]?.clientY ?? 0) - touchStart.current.y;
      const scrollable = event.target.closest?.(scrollableSelector);

      if (!scrollable) {
        if (!event.target.closest?.('input[type="range"]')) event.preventDefault();
        return;
      }

      // Mostly sideways swipe: the tracker scrolls horizontally, so a little
      // vertical jitter at its top/bottom edge must not cancel the gesture.
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (scrollable.scrollWidth <= scrollable.clientWidth) event.preventDefault();
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
