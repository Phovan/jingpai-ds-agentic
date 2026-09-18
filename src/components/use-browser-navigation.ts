import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  canonicalNavigation,
  defaultNavigation,
  navigationHash,
  parseNavigation,
  type NavigationState,
} from "../domain/navigation";
import type { Role } from "../domain/model";

export function useBrowserNavigation(
  role: Role,
  defaultKind: string,
  ids: string[],
  threads: string[],
) {
  const scope = useRef({ ids, threads, defaultKind });
  scope.current = { ids, threads, defaultKind };
  const read = () =>
    window.history.state?.jingpaiRole &&
    window.history.state.jingpaiRole !== role
      ? defaultNavigation(role, scope.current.defaultKind)
      : parseNavigation(
          window.location.hash,
          role,
          scope.current.defaultKind,
          scope.current.ids,
          scope.current.threads,
        );
  const [nav, setNav] = useState(read);
  const [restoreTick, setRestoreTick] = useState(0);
  const initial = useRef(true);
  const restored = useRef(false);
  const lastHash = useRef("");
  const scroll = useRef<{ main: number; chat: number } | null>(null);
  const hash = navigationHash(nav);
  useLayoutEffect(() => {
    const state = {
      ...window.history.state,
      jingpaiRole: role,
      jingpaiNav: canonicalNavigation(nav),
    };
    if (initial.current || restored.current) {
      window.history.replaceState(state, "", hash);
      initial.current = false;
      restored.current = false;
    } else if (hash !== lastHash.current) {
      window.history.pushState(
        { jingpaiRole: role, jingpaiNav: canonicalNavigation(nav) },
        "",
        hash,
      );
    }
    lastHash.current = hash;
  }, [hash, role, restoreTick]);
  useEffect(() => {
    function pop() {
      restored.current = true;
      scroll.current = window.history.state?.jingpaiScroll || {
        main: 0,
        chat: 0,
      };
      setNav(read());
      setRestoreTick((x) => x + 1);
    }
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [role]);
  useLayoutEffect(() => {
    if (!scroll.current) return;
    const pos = scroll.current;
    scroll.current = null;
    const frame = requestAnimationFrame(() => {
      document.getElementById("main-content")?.scrollTo({ top: pos.main });
      document
        .querySelector(".conversation-stream")
        ?.scrollTo({ top: pos.chat });
    });
    return () => cancelAnimationFrame(frame);
  }, [restoreTick]);
  const captureScroll = () =>
    window.history.replaceState(
      {
        ...window.history.state,
        jingpaiScroll: {
          main: document.getElementById("main-content")?.scrollTop || 0,
          chat: document.querySelector(".conversation-stream")?.scrollTop || 0,
        },
      },
      "",
    );
  function setField<K extends keyof NavigationState>(
    key: K,
    value: NavigationState[K],
  ) {
    captureScroll();
    setNav((n) => ({ ...n, [key]: value }));
  }
  return { nav, setField, restoreTick };
}
