const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Referral / level income ledger. One document per (investment, receiver, level).
 */
const levelIncomeSchema = new Schema(
  {
    // User who receives the income (upline)
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // User whose investment generated the income (downline)
    fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    investment: { type: Schema.Types.ObjectId, ref: 'Investment', required: true },
    level: { type: Number, required: true, min: 1 },
    percentage: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['credited'], default: 'credited' },
  },
  { timestamps: true }
);

// History listing & aggregation per receiver.
levelIncomeSchema.index({ user: 1, date: -1 });
levelIncomeSchema.index({ fromUser: 1, date: -1 });
// Duplicate-distribution guard: an investment can pay a given user at a given level only once.
levelIncomeSchema.index({ investment: 1, user: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('LevelIncome', levelIncomeSchema);
