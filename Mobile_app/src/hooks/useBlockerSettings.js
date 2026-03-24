import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchBlockerSettings, saveBlockerSettings } from '../services/BlockerSettingsService';

const DEFAULT_SETTINGS = {
  instagram: {
    masterEnabled: false,
    blockStories: false,
    blockReels: false,
    blockExplore: false,
  },
  youtube: {
    masterEnabled: false,
    blockShorts: false,
    blockVideoSearch: false,
    blockPiP: false,
    blockComments: false,
  },
};

// ─── TEMPORARY: hardcoded userId while auth flow is bypassed ─────────────────
// Replace with user?._id once login flow is active
const HARDCODED_USER_ID = '6903301b93ef8bdb5a368a28';
const STORAGE_KEY = '@mindscope_blocker_v2'; // v2 key so stale cache doesn't interfere

/**
 * useBlockerSettings
 *
 * Persistence chain:
 *   1. AsyncStorage — loads instantly on every app open (no network needed)
 *   2. MongoDB via Express — reconciled on mount, always wins if available
 *   3. React state — instant UI updates
 *
 * Hardcoded userId used as fallback so saves never silently skip.
 */
export const useBlockerSettings = (userIdFromContext) => {
  // Always use hardcoded ID if context hasn't resolved yet
  const userId = userIdFromContext || HARDCODED_USER_ID;

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const saveTimerRef = useRef(null);
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    console.log('[Blocker] loadSettings for userId:', userId);
    setLoading(true);
    try {
      // 1. AsyncStorage first — instant, no network
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log('[Blocker] Loaded from AsyncStorage:', JSON.stringify(parsed));
        setSettings(parsed);
      } else {
        console.log('[Blocker] No AsyncStorage cache found');
      }

      // 2. Backend reconciliation
      const remote = await fetchBlockerSettings(userId);
      console.log('[Blocker] Backend response:', JSON.stringify(remote));
      if (remote && (remote.instagram || remote.youtube)) {
        const merged = {
          instagram: { ...DEFAULT_SETTINGS.instagram, ...(remote.instagram || {}) },
          youtube:   { ...DEFAULT_SETTINGS.youtube,   ...(remote.youtube   || {}) },
        };
        console.log('[Blocker] Merged from backend:', JSON.stringify(merged));
        setSettings(merged);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    } catch (error) {
      console.warn('[Blocker] Load error, using local data:', error?.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ── Persist ───────────────────────────────────────────────────────────────
  const persistSettings = useCallback((newSettings) => {
    const uid = userIdRef.current;
    console.log('[Blocker] persistSettings called, uid:', uid);
    console.log('[Blocker] Saving:', JSON.stringify(newSettings));

    // AsyncStorage — immediate, synchronous-ish
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
      .then(() => console.log('[Blocker] AsyncStorage write SUCCESS'))
      .catch((e) => console.warn('[Blocker] AsyncStorage write FAILED:', e));

    // Backend — debounced
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const result = await saveBlockerSettings(uid, newSettings);
        console.log('[Blocker] Backend save SUCCESS:', JSON.stringify(result));
      } catch (e) {
        console.warn('[Blocker] Backend save FAILED (local preserved):', e?.message);
      } finally {
        setSaving(false);
      }
    }, 800);
  }, []);

  // ── Toggles ───────────────────────────────────────────────────────────────

  const updateInstagramToggle = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, instagram: { ...prev.instagram, [key]: value } };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const updateYoutubeToggle = useCallback((key, value) => {
    setSettings((prev) => {
      const next = { ...prev, youtube: { ...prev.youtube, [key]: value } };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const toggleInstagramMaster = useCallback((value) => {
    setSettings((prev) => {
      const next = { ...prev, instagram: { ...prev.instagram, masterEnabled: value } };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  const toggleYoutubeMaster = useCallback((value) => {
    setSettings((prev) => {
      const next = { ...prev, youtube: { ...prev.youtube, masterEnabled: value } };
      persistSettings(next);
      return next;
    });
  }, [persistSettings]);

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  return {
    settings,
    loading,
    saving,
    updateInstagramToggle,
    updateYoutubeToggle,
    toggleInstagramMaster,
    toggleYoutubeMaster,
  };
};
