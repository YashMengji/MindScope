import mongoose from 'mongoose';

const BlockerSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    instagram: {
      masterEnabled: { type: Boolean, default: false },
      blockStories:  { type: Boolean, default: false },
      blockReels:    { type: Boolean, default: false },
      blockExplore:  { type: Boolean, default: false },
    },
    youtube: {
      masterEnabled:    { type: Boolean, default: false },
      blockShorts:      { type: Boolean, default: false },
      blockVideoSearch: { type: Boolean, default: false },
      blockPiP:         { type: Boolean, default: false },
      blockComments:    { type: Boolean, default: false },
    },
    whatsapp: {
      masterEnabled: { type: Boolean, default: false },
      blockStatus:   { type: Boolean, default: false },
      blockChannels: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const BlockerSettings = mongoose.model('BlockerSettings', BlockerSettingsSchema);
export default BlockerSettings;
