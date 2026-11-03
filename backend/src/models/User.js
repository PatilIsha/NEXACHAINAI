const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const { Schema } = mongoose;

const USER_STATUS = ['active', 'suspended', 'blocked'];

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    // Hashed with bcrypt in the pre-save hook. Never returned by default.
    password: { type: String, required: true, minlength: 8, select: false },

    // Own code that others use to sign up under this user.
    referralCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    // Parent / sponsor in the referral tree (null for root users).
    referredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    // Denormalised balances. Updated atomically with $inc by the services so
    // the dashboard never needs to aggregate ledgers for the headline numbers.
    walletBalance: { type: Number, default: 0, min: 0 },
    totalInvested: { type: Number, default: 0, min: 0 },
    totalRoiEarned: { type: Number, default: 0, min: 0 },
    totalLevelIncomeEarned: { type: Number, default: 0, min: 0 },

    status: { type: String, enum: USER_STATUS, default: 'active' },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Direct-referral listing and $graphLookup traversal both key on referredBy.
userSchema.index({ referredBy: 1, createdAt: -1 });
userSchema.index({ status: 1 });

// Mongoose 9: async pre hooks do not receive next().
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);
User.USER_STATUS = USER_STATUS;

module.exports = User;
