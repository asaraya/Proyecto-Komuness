import { useEffect, useRef } from "react";

export const useLockBodyScroll = (locked) => {
  const scrollYRef = useRef(0);
  const originalStylesRef = useRef(null);

  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    const html = document.documentElement;

    scrollYRef.current = window.scrollY || 0;

    originalStylesRef.current = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      const original = originalStylesRef.current;
      if (original) {
        body.style.position = original.bodyPosition;
        body.style.top = original.bodyTop;
        body.style.left = original.bodyLeft;
        body.style.right = original.bodyRight;
        body.style.width = original.bodyWidth;
        body.style.overflow = original.bodyOverflow;
        html.style.overflow = original.htmlOverflow;
      } else {
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.overflow = "";
        html.style.overflow = "";
      }

      window.scrollTo(0, scrollYRef.current);
    };
  }, [locked]);
};

