import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "authToken";

// Save JWT
export const saveToken = async (token) => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    console.log("token saved in secure store !");
  } catch (error) {
    console.error("Error saving token:", error);
  }
};

// Get JWT
export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Error getting token:", error);
    return null;
  }
};

// Delete JWT (on logout)
export const removeToken = async () => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error("Error removing token:", error);
  }
};
