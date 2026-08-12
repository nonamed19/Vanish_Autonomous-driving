import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";

export function useDeviceByAspectRatio() {
  const isWideScreen = useMediaQuery({ query: "(min-aspect-ratio: 16/10)" });
  const [ratio, setRatio] = useState(() => window.innerWidth / window.innerHeight);

  useEffect(() => {
    const updateRatio = () => setRatio(window.innerWidth / window.innerHeight);
    window.addEventListener("resize", updateRatio, { passive: true });
    return () => window.removeEventListener("resize", updateRatio);
  }, []);

  return {
    isTablet: isWideScreen || (ratio >= 1.4 && ratio <= 1.8),
    ratio,
  };
}
