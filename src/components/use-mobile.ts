import { useEffect, useState } from "react";

export function useMobile(breakpoint = 900) {
  const [mobile, setMobile] = useState(
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);
  return mobile;
}
