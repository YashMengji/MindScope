import axiosInstance from '../api/axiosConfig';

/**
 * BlockerSettingsService.js
 *
 * Axios API calls for the Section Blocker feature.
 * Uses the same axiosInstance (with Bearer token) as VoiceRecordingService.
 * The user is resolved on the backend from the JWT, so no userId is sent.
 *
 * Backend base: /api/blocker
 */

/**
 * Fetch the saved blocker settings for the authenticated user.
 * @returns {Promise<object>}  { instagram: {...}, youtube: {...}, whatsapp: {...} }
 */
export const fetchBlockerSettings = async () => {
  try {
    const response = await axiosInstance.get('/blocker');
    return response.data;
  } catch (error) {
    console.error('fetchBlockerSettings error:', error?.response?.data || error.message);
    throw error;
  }
};

/**
 * Save (create or update) blocker settings for the authenticated user.
 * @param {object} settings   Full settings object { instagram: {...}, youtube: {...}, whatsapp: {...} }
 * @returns {Promise<object>} Saved document from MongoDB
 */
export const saveBlockerSettings = async (settings) => {
  try {
    const response = await axiosInstance.post('/blocker', {
      ...settings,
    });
    return response.data;
  } catch (error) {
    console.error('saveBlockerSettings error:', error?.response?.data || error.message);
    throw error;
  }
};
