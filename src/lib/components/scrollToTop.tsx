import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { FC } from "react";
import { scrollAppTo } from "../utils/appContentRoot";

const ScrollToTop: FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollAppTo(0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
