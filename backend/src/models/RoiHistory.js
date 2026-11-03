const mongoose = require('mongoose');

const { Schema } = mongoose;

const ROI_STATUS = ['pending', 'credited', 'failed'];

/**
 * Daily ROI ledger. Exactly one document per (investment, roiDate).
 * The unique index below is the hard guarantee that ROI is never credited
 * twice for the same day, even if the cron job runs multiple times.
 */
const roiHistorySchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    investment: { type: Schema.Types.ObjectId, ref: 'Investment', required: true },
    amount: { type: Number, required: true, min: 0 },
    // Business calendar day the ROI belongs to (stored as UTC midnight).
    roiDate: { type: Date, required: true },
    // When the credit was actually applied.
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ROI_STATUS, default: 'pending' },
    error: { type: String },
  },
  { timestamps: true }
);

roiHistorySchema.index({ investment: 1, roiDate: 1 }, { unique: true });
roiHistorySchema.index({ user: 1, roiDate: -1 });
roiHistorySchema.index({ roiDate: 1, status: 1 });

const RoiHistory = mongoose.model('RoiHistory', roiHistorySchema);
RoiHistory.ROI_STATUS = ROI_STATUS;

module.exports = RoiHistory;
