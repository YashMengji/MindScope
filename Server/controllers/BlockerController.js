import BlockerSettings from '../models/BlockerSettings.js';

export const fetchSettings = async (req, res) => {
  try {
    const { userId } = req.params;
    const doc = await BlockerSettings.findOne({ userId });

    if (!doc) {
      return res.status(200).json({
        instagram: { masterEnabled: false, blockStories: false, blockReels: false, blockExplore: false },
        youtube:   { masterEnabled: false, blockShorts: false, blockVideoSearch: false, blockPiP: false, blockComments: false },
        whatsapp:  { masterEnabled: false, blockStatus: false, blockChannels: false },
      });
    }

    return res.status(200).json({
      instagram: doc.instagram,
      youtube:   doc.youtube,
      whatsapp:  doc.whatsapp,
    });
  } catch (error) {
    console.error('fetchSettings error:', error);
    res.status(500).json({ message: error.message });
  }
};

export const saveSettings = async (req, res) => {
  try {
    const { userId, instagram, youtube, whatsapp } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const doc = await BlockerSettings.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(instagram && { instagram }),
          ...(youtube   && { youtube }),
          ...(whatsapp  && { whatsapp }),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json({
      message: 'Settings saved',
      data: {
        instagram: doc.instagram,
        youtube:   doc.youtube,
        whatsapp:  doc.whatsapp,
      },
    });
  } catch (error) {
    console.error('saveSettings error:', error);
    res.status(500).json({ message: error.message });
  }
};
