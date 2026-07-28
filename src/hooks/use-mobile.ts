import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

// Created lazily so importing this module never touches `window` (it is
// imported into modules that also render on the server).
let mediaQuery: MediaQueryList | null = null
function getMediaQuery() {
  return (mediaQuery ??= window.matchMedia(MOBILE_QUERY))
}

function subscribe(onStoreChange: () => void) {
  const mql = getMediaQuery()
  mql.addEventListener("change", onStoreChange)
  return () => mql.removeEventListener("change", onStoreChange)
}

/**
 * True when the viewport is narrower than the mobile breakpoint.
 *
 * Reads the media query during render via useSyncExternalStore rather than
 * copying it into state from an effect. Besides satisfying
 * react-hooks/set-state-in-effect, this removes a real one-frame flash: the
 * old version started as `undefined` (falsy → desktop) and only corrected
 * itself after mount, so mobile users briefly got the desktop layout.
 *
 * The server snapshot is `false`, matching what the old initial state
 * resolved to, so server and client markup still agree.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => getMediaQuery().matches,
    () => false
  )
}
