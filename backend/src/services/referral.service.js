/**
 * Referral service: direct referrals and the full downline tree.
 * The tree is fetched with ONE $graphLookup query (bounded by maxDepth) and
 * nested in memory, instead of recursive per-level queries.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { paginationMeta } = require('../utils/response');

const toObjectId = (id) => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id)));

const PUBLIC_FIELDS = 'fullName email mobile referralCode totalInvested status createdAt';

/** Paginated list of users directly referred by `userId`. */
async function getDirectReferrals(userId, { page = 1, limit = 10 } = {}) {
  const filter = { referredBy: toObjectId(userId) };
  const [items, total] = await Promise.all([
    User.find(filter).select(PUBLIC_FIELDS).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { items, meta: paginationMeta({ page, limit, total }) };
}

/**
 * Returns the referral hierarchy under `userId` as a nested tree.
 * @param {string} userId
 * @param {number} maxDepth - number of levels to include (1 = direct referrals only)
 */
async function getReferralTree(userId, maxDepth = 5) {
  const [root] = await User.aggregate([
    { $match: { _id: toObjectId(userId) } },
    {
      $graphLookup: {
        from: User.collection.name,
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'referredBy',
        as: 'descendants',
        maxDepth: maxDepth - 1,
        depthField: 'depth',
      },
    },
    {
      $project: {
        fullName: 1,
        email: 1,
        referralCode: 1,
        totalInvested: 1,
        status: 1,
        createdAt: 1,
        descendants: {
          _id: 1,
          fullName: 1,
          email: 1,
          referralCode: 1,
          referredBy: 1,
          totalInvested: 1,
          status: 1,
          createdAt: 1,
          depth: 1,
        },
      },
    },
  ]);

  if (!root) throw ApiError.notFound('User not found');

  const { descendants = [], ...rootFields } = root;
  const rootNode = { ...rootFields, level: 0, children: [] };
  const nodes = new Map([[String(root._id), rootNode]]);
  const levelCounts = {};

  // Create nodes (sorted by depth so parents exist before children).
  descendants
    .sort((a, b) => a.depth - b.depth || new Date(a.createdAt) - new Date(b.createdAt))
    .forEach((d) => {
      const level = d.depth + 1;
      levelCounts[level] = (levelCounts[level] || 0) + 1;
      nodes.set(String(d._id), { ...d, level, children: [] });
    });

  // Link each node under its parent.
  descendants.forEach((d) => {
    const parent = nodes.get(String(d.referredBy));
    if (parent) parent.children.push(nodes.get(String(d._id)));
  });

  return {
    tree: rootNode,
    totalMembers: descendants.length,
    levelCounts,
    maxDepth,
  };
}

module.exports = { getDirectReferrals, getReferralTree };
