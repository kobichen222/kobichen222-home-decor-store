"use client";
import * as React from "react";

// Submits a form to a Server Action and keeps what the user typed.
// After a Server Action triggered from a submit event, React calls
// form.reset(), which would wipe every uncontrolled input whenever the
// server answers with a validation error. Before submitting we make the
// current values the form's defaults, so that reset changes nothing.
function keepCurrentValues(form: HTMLFormElement) {
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox" || el.type === "radio") el.defaultChecked = el.checked;
      else if (el.type !== "file" && el.type !== "hidden") el.defaultValue = el.value;
    } else if (el instanceof HTMLTextAreaElement) {
      el.defaultValue = el.value;
    } else if (el instanceof HTMLSelectElement) {
      for (const option of Array.from(el.options)) option.defaultSelected = option.selected;
    }
  }
}

export function useFormAction<S>(serverAction: (prev: S | null, formData: FormData) => Promise<S | null>) {
  const [state, setState] = React.useState<S | null>(null);
  const [pending, startTransition] = React.useTransition();
  const onSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      keepCurrentValues(event.currentTarget);
      startTransition(async () => {
        // A redirect() inside the action navigates and never resolves here.
        const next = await serverAction(null, formData);
        setState(next);
      });
    },
    [serverAction],
  );
  return { state, pending, onSubmit };
}
