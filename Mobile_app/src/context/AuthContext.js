import React, { createContext, useState, useEffect } from "react";
import { getToken, removeToken } from "../services/tokenService";
import { getProfile } from "../services/authService"; // endpoint to fetch user details

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user object (name, email, etc.)
  const [loading, setLoading] = useState(true);

  // On app start, check if token exists and load user profile
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await getToken();
        if (token) {
          // fetch user from backend using the stored JWT
          const profile = await getProfile();
          setUser(profile);
        }
      } catch (err) {
        // Token is missing/expired/invalid — clear it so we don't keep retrying.
        console.error("Error loading user:", err?.response?.data || err.message);
        await removeToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const loginContext = async (profile) => {
    setUser(profile); // set after login/signup
  };

  // Merge updated fields (e.g. after editing the profile) into the user.
  const updateUser = (updates) => {
    setUser((prev) => ({ ...(prev || {}), ...updates }));
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loginContext, updateUser, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
