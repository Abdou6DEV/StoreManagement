import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { FC } from "react";

const ScrollToTop: FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
