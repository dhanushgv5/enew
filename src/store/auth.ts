'use client';

import { create } from 'zustand';
import api, { setAccessToken } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  hasHydrated: boolean;

  login: (
    email: string,
    password: string,
  ) => Promise<void>;

  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;

  logout: () => Promise<void>;

  setUser: (user: User | null) => void;

  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  (set) => ({
    user: null,
    accessToken: null,
    isLoading: false,
    hasHydrated: false,

    // =========================
    // LOGIN
    // =========================

    login: async (email, password) => {
      set({ isLoading: true });

      try {
        const { data } = await api.post(
          '/auth/login',
          {
            email,
            password,
          },
        );

        setAccessToken(data.accessToken);

        set({
          user: data.user,
          accessToken: data.accessToken,
          isLoading: false,
        });
      } catch (e) {
        set({
          isLoading: false,
        });

        throw e;
      }
    },

    // =========================
    // REGISTER
    // =========================

    register: async (payload) => {
      set({ isLoading: true });

      try {
        const { data } = await api.post(
          '/auth/register',
          payload,
        );

        setAccessToken(data.accessToken);

        set({
          user: data.user,
          accessToken: data.accessToken,
          isLoading: false,
        });
      } catch (e) {
        set({
          isLoading: false,
        });

        throw e;
      }
    },

    // =========================
    // LOGOUT
    // =========================

    logout: async () => {
      try {
        await api.post('/auth/logout');
      } catch {}

      setAccessToken(null);
      disconnectSocket();

      set({
        user: null,
        accessToken: null,
      });
    },

    // =========================
    // SET USER
    // =========================

    setUser: (user) => {
      set({ user });
    },

    // =========================
    // RESTORE LOGIN SESSION
    // =========================

    hydrate: async () => {
      try {
        /*
         * We don't trust localStorage anymore.
         *
         * The backend refresh cookie is the source
         * of truth for whether the user is logged in.
         */

        const { data } = await api.post(
          '/auth/refresh',
        );

        setAccessToken(data.accessToken);

        const { data: user } =
          await api.get('/users/me');

        set({
          user,
          accessToken: data.accessToken,
          hasHydrated: true,
        });
      } catch {
        setAccessToken(null);

        set({
          user: null,
          accessToken: null,
          hasHydrated: true,
        });
      }
    },
  }),
);