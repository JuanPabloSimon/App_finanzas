export const MOBILE_MAX_WIDTH = 768;
export const DESKTOP_MIN_WIDTH = 1024;

export const BREAKPOINTS = Object.freeze({
  tablet: MOBILE_MAX_WIDTH,
  desktop: DESKTOP_MIN_WIDTH,
});

export function getViewportLayout(width = 390) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 390;
  const isMobile = safeWidth < BREAKPOINTS.tablet;
  const isTablet = safeWidth >= BREAKPOINTS.tablet && safeWidth < BREAKPOINTS.desktop;
  const isDesktop = safeWidth >= BREAKPOINTS.desktop;

  return Object.freeze({
    width: safeWidth,
    isMobile,
    isTablet,
    isDesktop,
    columns: safeWidth >= BREAKPOINTS.tablet ? 2 : 1,
    containerMaxWidth: isDesktop ? 960 : 720,
  });
}
