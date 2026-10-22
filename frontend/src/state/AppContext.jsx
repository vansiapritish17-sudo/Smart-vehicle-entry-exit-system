import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebaseApp";
import {
  getIdToken,
  getSessionClaims,
  login as firebaseLogin,
  logout as firebaseLogout,
  subscribeToSession,
} from "../services/authService";
import {
  alertsApi,
  authApi,
  configApi,
  movementsApi,
  usersApi,
  vehiclesApi,
} from "../services/apiClient";
import { eventTime } from "../services/dashboardService";

const AppContext = createContext(null);

const EMPTY_CONFIGURATION = { maximumCapacity: 0, alertThreshold: 80, gates: [] };

/**
 * App-wide state.
 *
 * Reads are real-time Firestore listeners; every write goes through the Spring Boot
 * API, which validates it and writes with the Admin SDK. The listeners then deliver
 * the change to every open browser, so no action here edits local state by hand.
 */
export function AppProvider({ children }) {
  /* ── Auth state (owned by Firebase Authentication) ── */
  // Firebase restores the session asynchronously on load, so `authReady` tells
  // ProtectedRoute to wait rather than bounce a signed-in user to /login.
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady,   setAuthReady]   = useState(false);

  /* ── Live data from Firestore ── */
  const [vehicles,      setVehicles]      = useState([]);
  const [movements,     setMovements]     = useState([]);
  const [alerts,        setAlerts]        = useState([]);
  const [configuration, setConfiguration] = useState(EMPTY_CONFIGURATION);
  const [users,    setUsers]    = useState([]);
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [syncedAt, setSyncedAt] = useState(null);
  const [syncError, setSyncError] = useState(null);

  // Keep unsubscribe functions so we can clean up on sign-out
  const unsubs = useRef([]);
  const toastTimer = useRef(null);

  /* ── Toast helper ── */
  const notify = useCallback((message, tone = "success") => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Firebase session ──
     Fires on sign-in, sign-out and every silent token refresh. The claims in the
     token are the source of truth for the role; the API call fills in the rest of
     the profile and confirms the account is still active. */
  useEffect(() => {
    const unsubscribe = subscribeToSession(async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthReady(true);
        return;
      }

      let claims;
      try {
        claims = await getSessionClaims();
      } catch (err) {
        console.error("session:", err);
        await firebaseLogout().catch(() => {});
        setCurrentUser(null);
        setAuthReady(true);
        return;
      }

      // Firebase restores the session locally and the role is in the token, so the
      // app can show now. The profile call below can take up to a minute while a
      // free-tier server wakes, and must not hold the screen hostage.
      setCurrentUser((prev) => prev ?? claims);
      setAuthReady(true);

      try {
        const res = await authApi.me();
        if (res.ok) setCurrentUser({ ...claims, ...res.data });
      } catch (err) {
        console.error("session:", err);
        // The backend refused the token (deactivated account, missing role claim):
        // end the session. An unreachable server is not a refusal — keep the
        // session, and any write will report the outage when it is attempted.
        if (err.status === 401 || err.status === 403) {
          await firebaseLogout().catch(() => {});
          setCurrentUser(null);
          notify(err.message ?? "Your session could not be verified.", "warning");
        }
      }
    });

    return unsubscribe;
  }, [notify]);

  /* ── Real-time Firestore listeners ── */
  const startListeners = useCallback(() => {
    unsubs.current.forEach((fn) => fn());
    unsubs.current = [];

    setLoading(true);
    setSyncError(null);
    const pending = new Set(["vehicles", "movements", "alerts", "configuration"]);
    const markLoaded = (name) => {
      pending.delete(name);
      if (!pending.size) setLoading(false);
      setSyncedAt(new Date());
    };
    const onError = (name) => (err) => {
      console.error(`${name} listener:`, err);
      setSyncError(
        err.code === "permission-denied"
          ? "Live data access was denied. Check the deployed Firestore rules."
          : "Live updates are interrupted. Retrying…"
      );
      markLoaded(name);
    };

    unsubs.current.push(
      onSnapshot(collection(db, "vehicles"), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (a.regNo || "").localeCompare(b.regNo || ""));
        setVehicles(docs);
        markLoaded("vehicles");
      }, onError("vehicles"))
    );

    // Newest first by when the movement happened (an EXIT's exit time, an ENTRY's entry time).
    unsubs.current.push(
      onSnapshot(collection(db, "movements"), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => eventTime(b).localeCompare(eventTime(a)));
        setMovements(docs);
        markLoaded("movements");
      }, onError("movements"))
    );

    unsubs.current.push(
      onSnapshot(collection(db, "alerts"), (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.time || "").localeCompare(a.time || ""));
        setAlerts(docs);
        markLoaded("alerts");
      }, onError("alerts"))
    );

    unsubs.current.push(
      onSnapshot(doc(db, "configuration", "default"), (snap) => {
        if (snap.exists()) setConfiguration({ ...EMPTY_CONFIGURATION, ...snap.data() });
        markLoaded("configuration");
      }, onError("configuration"))
    );
  }, []);

  const stopListeners = useCallback(() => {
    unsubs.current.forEach((fn) => fn());
    unsubs.current = [];
  }, []);

  // Keyed on uid/role rather than the currentUser object so the hourly token
  // refresh does not tear down and rebuild every Firestore subscription.
  const sessionUid  = currentUser?.uid ?? null;
  const sessionRole = currentUser?.role ?? null;

  const refreshUsers = useCallback(async () => {
    if (sessionRole !== "Administrator") return;
    try {
      setUsers((await usersApi.list()) ?? []);
    } catch (err) {
      notify(err.message, "warning");
    }
  }, [sessionRole, notify]);

  useEffect(() => {
    if (sessionUid) {
      startListeners();
      // Users are read through the admin-only API, never a Firestore listener.
      refreshUsers();
    } else {
      stopListeners();
      setVehicles([]); setMovements([]); setAlerts([]); setUsers([]);
      setConfiguration(EMPTY_CONFIGURATION);
    }
    return stopListeners;
  }, [sessionUid, startListeners, stopListeners, refreshUsers]);

  /**
   * Run an API write, toast its outcome and hand the result back to the page.
   * Resolves to `{ ok, message, data }`; never throws.
   */
  const run = useCallback(async (call, successMessage) => {
    try {
      const res = await call();
      const message = successMessage ?? res?.message ?? "Saved.";
      notify(message);
      return { ok: true, message, data: res?.data };
    } catch (err) {
      notify(err.message, "warning");
      return { ok: false, message: err.message };
    }
  }, [notify]);

  /* ── Auth ── */
  const signIn = async (username, password) => {
    const res = await firebaseLogin(username, password);
    if (!res.ok) return res;
    // subscribeToSession picks it up from here and populates currentUser.
    return { ok: true };
  };

  const signOut = async () => {
    stopListeners();
    await firebaseLogout().catch((err) => console.error("sign-out:", err));
    setCurrentUser(null);
  };

  /* ── Vehicles ── */
  const addVehicle = (payload) => run(() => vehiclesApi.create(payload), "Vehicle registered successfully.");
  const updateVehicle = (id, payload) => run(() => vehiclesApi.update(id, payload), "Vehicle updated.");
  const toggleVehicle = (id) => run(() => vehiclesApi.toggle(id));
  const deleteVehicle = (id) => run(() => vehiclesApi.remove(id));

  /* ── Movements ──
     A refused movement still resolves (HTTP 422) with the alert the backend raised,
     so the form can show exactly why the vehicle was turned away. */
  const submitMovement = async (call) => {
    try {
      const res = await call();
      notify(res.message, res.ok ? "success" : "warning");
      return { ok: res.ok, message: res.message, ...(res.data ?? {}) };
    } catch (err) {
      notify(err.message, "warning");
      return { ok: false, message: err.message };
    }
  };
  // The operator recorded on the movement comes from the verified token.
  const submitEntry = ({ regNo, gate }) => submitMovement(() => movementsApi.entry(regNo, gate));
  const submitExit  = ({ regNo, gate }) => submitMovement(() => movementsApi.exit(regNo, gate));

  /* ── Alerts ── */
  const resolveAlert = (id) => run(() => alertsApi.resolve(id), "Alert marked as resolved.");

  /* ── History ── */
  const clearHistory = (olderThanDays) => run(() => movementsApi.clearHistory(olderThanDays));

  /* ── Configuration ── */
  const saveConfiguration = (updates) => run(() => configApi.save(updates), "System configuration updated.");

  /* ── Users (admin) ── */
  const afterUsers = async (result) => {
    if (result.ok) await refreshUsers();
    return result;
  };
  const addUser = async (payload) => afterUsers(await run(() => usersApi.create(payload)));
  const updateUser = async (id, payload) => {
    const result = await afterUsers(await run(() => usersApi.update(id, payload)));
    // Editing your own account: mint a token with the new claims. The token
    // listener then reloads the profile, so the new name shows everywhere at once.
    if (result.ok && id === currentUser?.id) await getIdToken(true).catch(() => {});
    return result;
  };
  const resetUserPassword = async (id) => afterUsers(await run(() => usersApi.resetPassword(id)));
  const toggleUser = async (id) => afterUsers(await run(() => usersApi.toggle(id)));

  /* ── Context value ── */
  const value = useMemo(
    () => ({
      users,
      vehicles,
      movements,
      alerts,
      configuration,
      currentUser,
      authReady,
      toast,
      loading,
      syncedAt,
      syncError,
      notify,
      signIn,
      signOut,
      addVehicle,
      updateVehicle,
      toggleVehicle,
      deleteVehicle,
      submitEntry,
      submitExit,
      resolveAlert,
      clearHistory,
      saveConfiguration,
      addUser,
      updateUser,
      resetUserPassword,
      toggleUser,
      refreshUsers,
    }),
    // The action functions only close over stable callbacks and the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [users, vehicles, movements, alerts, configuration, currentUser, authReady, toast, loading, syncedAt, syncError]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  return useContext(AppContext);
}
