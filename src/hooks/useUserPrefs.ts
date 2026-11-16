import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../config/firebase';
import type { Filters } from '../lib/filters';

export interface UserPrefs {
  favorites: string[];
  /** Used by the mobile app for proximity alerts. */
  alertRadiusKm: number;
  savedFilters?: Partial<Filters>;
}

const DEFAULT_PREFS: UserPrefs = { favorites: [], alertRadiusKm: 10 };

/** Per-user preferences in Firestore at users/{uid}. */
export function useUserPrefs(user: User | null) {
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!user) {
      setPrefs(DEFAULT_PREFS);
      return;
    }
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => setPrefs({ ...DEFAULT_PREFS, ...(snap.data() as Partial<UserPrefs> | undefined) }),
      (e) => setError(e.message),
    );
  }, [user]);

  const update = async (patch: Partial<UserPrefs>) => {
    if (!user) return;
    setPrefs((p) => ({ ...p, ...patch }));
    try {
      await setDoc(doc(db, 'users', user.uid), patch, { merge: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return { prefs, update, error };
}
