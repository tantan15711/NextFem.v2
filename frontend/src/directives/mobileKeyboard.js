const textInputTypes = new Set([
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url"
]);

const isMobileKeyboardContext = () => {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
  );
};

const canShowKeyboard = (field) => {
  if (!field || field.disabled || field.readOnly) return false;
  if (field.tagName === "TEXTAREA") return true;
  if (field.tagName !== "INPUT") return false;
  return textInputTypes.has((field.type || "text").toLowerCase());
};

const focusForMobileKeyboard = (event, root) => {
  if (!isMobileKeyboardContext()) return;

  const field = event.target.closest("input, textarea");

  if (!field || !root.contains(field) || !canShowKeyboard(field)) return;

  window.requestAnimationFrame(() => {
    if (document.activeElement !== field) {
      field.focus({ preventScroll: true });
    }
  });
};

export const mobileKeyboard = {
  mounted(root) {
    const handler = (event) => focusForMobileKeyboard(event, root);
    root.__nextFemMobileKeyboard = handler;
    root.addEventListener("click", handler, { passive: true });
  },
  unmounted(root) {
    if (!root.__nextFemMobileKeyboard) return;

    root.removeEventListener("click", root.__nextFemMobileKeyboard);
    delete root.__nextFemMobileKeyboard;
  }
};
