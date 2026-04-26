import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  clearSession,
  firebaseSignOutSafe,
  getSession,
  setSession,
  type Session,
} from "@/lib/session";
import { firebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface SessionContextValue {
  session: Session | null;
  signIn: (s: Session) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() =>
    getSession(),
  );

  // Cross-tab session sync via the storage event.
  useEffect(() => {
    const onStorage = () => setSessionState(getSession());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // If Firebase Auth signs the user out (e.g. token expiry, manual revocation),
  // mirror that into the local session so the UI doesn't show a stale user.
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onAuthStateChanged(firebaseAuth(), (user) => {
        if (!user) {
          const cur = getSession();
          // Keep guest sessions intact — guests don't go through Firebase Auth.
          if (cur && cur.role !== "guest") {
            clearSession();
            setSessionState(null);
          }
        }
      });
    } catch {
      /* firebase not configured — skip */
    }
    return () => unsub();
  }, []);

  const signIn = useCallback((s: Session) => {
    setSession(s);
    setSessionState(s);
  }, []);

  const signOut = useCallback(() => {
    void firebaseSignOutSafe();
    clearSession();
    setSessionState(null);
  }, []);

  return (
    <SessionContext.Provider value={{ session, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
