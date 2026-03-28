import axiosInstance from '../api/axiosConfig';

/**
 * BlockerSettingsService.js
 *
 * Axios API calls for the Section Blocker feature.
 * Uses the same axiosInstance (with Bearer token) as VoiceRecordingService.
 *
 * Backend base: /api/blocker
 */

/**
 * Fetch the saved blocker settings for a user.
 * @param {string} userId
 * @returns {Promise<object>}  { instagram: {...}, youtube: {...} }
 */
export const fetchBlockerSettings = async (userId) => {
  try {
    const response = await axiosInstance.get(`/blocker/${userId}`);
    return response.data;
  } catch (error) {
    console.error('fetchBlockerSettings error:', error?.response?.data || error.message);
    throw error;
  }
};

/**
 * Save (create or update) blocker settings for a user.
 * @param {string} userId
 * @param {object} settings   Full settings object { instagram: {...}, youtube: {...} }
 * @returns {Promise<object>} Saved document from MongoDB
 */
export const saveBlockerSettings = async (userId, settings) => {
  try {
    const response = await axiosInstance.post('/blocker', {
      userId,
      ...settings,
    });
    return response.data;
  } catch (error) {
    console.error('saveBlockerSettings error:', error?.response?.data || error.message);
    throw error;
  }
};
