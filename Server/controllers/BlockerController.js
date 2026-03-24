import BlockerSettings from '../models/BlockerSettings.js';

/**
 * BlockerController.js
 *
 * Handles GET and POST for the /api/blocker route.
 * Uses findOneAndUpdate with upsert:true so the first POST creates
 * the document and subsequent POSTs update it — no duplicate key errors.
 */

/**
 * GET /api/blocker/:userId
 * Returns the stored blocker settings for the given user.
 * If no document exists yet, returns the schema defaults.
 */
export const fetchSettings = async (req, res) => {
  try {
    const { userId } = req.params;

    const doc = await BlockerSettings.findOne({ userId });

    if (!doc) {
      // Return defaults so the frontend can initialise without a 404
      return res.status(200).json({
        instagram: {
          masterEnabled: false,
          blockStories:  false,
          blockReels:    false,
          blockExplore:  false,
        },
        youtube: {
          masterEnabled:    false,
          blockShorts:      false,
          blockVideoSearch: false,
          blockPiP:         false,
          blockComments:    false,
        },
      });
    }

    return res.status(200).json({
      instagram: doc.instagram,
      youtube:   doc.youtube,
    });
  } catch (error) {
    console.error('fetchSettings error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/blocker
 * Body: { userId, instagram: {...}, youtube: {...} }
 * Creates or updates the settings document for this user.
 */
export const saveSettings = async (req, res) => {
  try {
    const { userId, instagram, youtube } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const doc = await BlockerSettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(instagram && { instagram }),
          ...(youtube   && { youtube }),
        },
      },
      {
        new:    true,   // Return updated document
        upsert: true,   // Create if it doesn't exist
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      message: 'Settings saved',
      data: {
        instagram: doc.instagram,
        youtube:   doc.youtube,
      },
    });
  } catch (error) {
    console.error('saveSettings error:', error);
    res.status(500).json({ message: error.message });
  }
};
