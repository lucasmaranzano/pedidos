import { create } from "zustand";
import { supabase } from "../supabaseClient";

export const useAuthStore = create((set) => ({
  user: null,
  session: null,
  loading: true,

  initAuth: async () => {
    // Obtener sesión actual
    const { data, error } = await supabase.auth.getSession();
    if (!error) {
      set({ session: data.session, user: data.session?.user ?? null });
    }

    // Suscribirse a cambios de sesión
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
    });

    set({ loading: false });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    set({ session: data.session, user: data.user });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },
}));
