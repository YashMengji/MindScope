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
          // fetch user from backend
          const profile = await getProfile();
          setUser(profile);
        }
      } catch (err) {
        console.error("Error loading user:", err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const loginContext = async (profile) => {
    setUser(profile); // set after login/signup
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginContext, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
