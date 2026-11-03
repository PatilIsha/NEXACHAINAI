const mongoose = require('mongoose');

const { Schema } = mongoose;

const JOB_STATUS = ['running', 'completed', 'failed'];

/**
 * One document per (jobName, runKey). Acts as a distributed lock + completion
 * marker for scheduled jobs, e.g. jobName='daily-roi', runKey='2026-11-03'.
 */
const jobRunSchema = new Schema(
  {
    jobName: { type: String, required: true },
    runKey: { type: String, required: true },
    status: { type: String, enum: JOB_STATUS, default: 'running' },
    trigger: { type: String, enum: ['cron', 'manual', 'script'], default: 'cron' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    durationMs: { type: Number },
    attempts: { type: Number, default: 1 },
    stats: {
      scanned: { type: Number, default: 0 },
      credited: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      duplicates: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      totalAmount: { type: Number, default: 0 },
    },
    error: { type: String },
  },
  { timestamps: true }
);

jobRunSchema.index({ jobName: 1, runKey: 1 }, { unique: true });
jobRunSchema.index({ jobName: 1, startedAt: -1 });

const JobRun = mongoose.model('JobRun', jobRunSchema);
JobRun.JOB_STATUS = JOB_STATUS;

module.exports = JobRun;
