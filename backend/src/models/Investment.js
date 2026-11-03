const mongoose = require('mongoose');

const { Schema } = mongoose;

const INVESTMENT_STATUS = ['Active', 'Completed', 'Cancelled'];

// Snapshot of the plan at purchase time (plan table may change later).
const planSnapshotSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    minAmount: { type: Number },
    maxAmount: { type: Number },
    dailyRoiPercent: { type: Number, required: true },
    durationDays: { type: Number, required: true },
  },
  { _id: false }
);

const investmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    plan: { type: planSnapshotSchema, required: true },

    // Duplicated from plan for cheap filtering / aggregation.
    dailyRoiPercent: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },

    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date, required: true },
    status: { type: String, enum: INVESTMENT_STATUS, default: 'Active' },

    // ROI progress (maintained by roi.service.js)
    totalRoiPaid: { type: Number, default: 0, min: 0 },
    roiDaysPaid: { type: Number, default: 0, min: 0 },
    lastRoiDate: { type: Date },
    completedAt: { type: Date },

    // Set once level income for this investment has been distributed.
    levelIncomeDistributed: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

investmentSchema.virtual('dailyRoiAmount').get(function dailyRoiAmount() {
  return Math.round(((this.amount * this.dailyRoiPercent) / 100) * 100) / 100;
});

// Per-user history (newest first).
investmentSchema.index({ user: 1, createdAt: -1 });
investmentSchema.index({ user: 1, status: 1 });
// Daily ROI job scans: active investments that have started.
investmentSchema.index({ status: 1, startDate: 1 });

const Investment = mongoose.model('Investment', investmentSchema);
Investment.INVESTMENT_STATUS = INVESTMENT_STATUS;

module.exports = Investment;
