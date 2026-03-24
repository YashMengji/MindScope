import mongoose from 'mongoose';

/**
 * BlockerSettings.js
 *
 * Mongoose schema for storing per-user Section Blocker toggle preferences.
 * Uses upsert on userId so only one settings document exists per user.
 */

const BlockerSettingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,           // One settings doc per user
    },

    instagram: {
      masterEnabled:  { type: Boolean, default: false },
      blockStories:   { type: Boolean, default: false },
      blockReels:     { type: Boolean, default: false },
      blockExplore:   { type: Boolean, default: false },
    },

    youtube: {
      masterEnabled:    { type: Boolean, default: false },
      blockShorts:      { type: Boolean, default: false },
      blockVideoSearch: { type: Boolean, default: false },
      blockPiP:         { type: Boolean, default: false },
      blockComments:    { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,   // createdAt + updatedAt
  }
);

const BlockerSettings = mongoose.model('BlockerSettings', BlockerSettingsSchema);

export default BlockerSettings;
