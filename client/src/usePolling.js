import { useEffect, useRef } from "react";

/** Calls fn immediately and then every `ms`, pausing while the tab is hidden (near-real-time updates). */
export function usePolling(fn, ms, deps = []) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    let stopped = false;
    const tick = () => { if (!stopped && !document.hidden) saved.current(); };
    tick();
    const id = setInterval(tick, ms);
    document.addEventListener("visibilitychange", tick);
    return () => { stopped = true; clearInterval(id); document.removeEventListener("visibilitychange", tick); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, ...deps]);
}
