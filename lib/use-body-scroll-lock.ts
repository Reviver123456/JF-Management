"use client";

import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    document.documentElement.classList.add("scroll-locked");
    document.body.classList.add("scroll-locked");
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
  }

  lockCount += 1;
}

function unlockBodyScroll() {
  if (lockCount <= 0) {
    return;
  }

  lockCount -= 1;

  if (lockCount === 0) {
    document.documentElement.classList.remove("scroll-locked");
    document.body.classList.remove("scroll-locked");
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(0, savedScrollY);
  }
}

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [enabled]);
}
