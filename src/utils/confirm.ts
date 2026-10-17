// In-app confirmation dialogs, drawn by <ConfirmHost /> (mounted once in the root layout) in the app's
// theme instead of the system alert. Callers just await a boolean.

export type ConfirmRequest = {
  title: string;
  message: string;
  actionLabel: string;
  /** 'danger' for destructive actions (red button), 'primary' for everything else. */
  tone: 'danger' | 'primary';
};

type State = { open: boolean; request: ConfirmRequest | null };

// The last request stays in state after closing so the dialog keeps its text while it fades out.
let state: State = { open: false, request: null };
let resolve: ((ok: boolean) => void) | null = null;
const listeners = new Set<() => void>();

const setState = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};

export const confirmStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get: () => state,
  /** Closes the dialog with the user's answer. */
  settle(ok: boolean) {
    const done = resolve;
    resolve = null;
    setState({ ...state, open: false });
    done?.(ok);
  },
};

function ask(request: ConfirmRequest): Promise<boolean> {
  resolve?.(false); // a new question cancels one still on screen
  return new Promise((res) => {
    resolve = res;
    setState({ open: true, request });
  });
}

/** Asks before a destructive action (archive, disable, sign out…). Resolves true if confirmed. */
export const confirmDestructive = (title: string, message: string, actionLabel: string) =>
  ask({ title, message, actionLabel, tone: 'danger' });

/** Asks before a normal but important action (e.g. saving changes parents will see). */
export const confirmAction = (title: string, message: string, actionLabel: string) =>
  ask({ title, message, actionLabel, tone: 'primary' });
