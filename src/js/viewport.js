const root = document.documentElement;
let frame = 0;
let previousWidth = 0;
let previousHeight = 0;

export const viewportWidth = () =>
  Math.round(window.visualViewport?.width || window.innerWidth || root.clientWidth);

export const viewportHeight = () =>
  Math.round(window.visualViewport?.height || window.innerHeight || root.clientHeight);

function syncViewport() {
  frame = 0;
  const width = viewportWidth();
  const height = viewportHeight();
  if (width === previousWidth && height === previousHeight) return;

  previousWidth = width;
  previousHeight = height;
  root.style.setProperty('--app-width', `${width}px`);
  root.style.setProperty('--app-height', `${height}px`);
  window.dispatchEvent(new CustomEvent('galene:viewportresize', {
    detail: { width, height },
  }));
}

function requestSync() {
  if (frame) return;
  frame = requestAnimationFrame(syncViewport);
}

syncViewport();
window.addEventListener('resize', requestSync, { passive: true });
window.addEventListener('orientationchange', requestSync, { passive: true });
window.visualViewport?.addEventListener('resize', requestSync, { passive: true });
