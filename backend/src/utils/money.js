/**
 * Money helpers. Amounts are stored as JS numbers rounded to 2 decimals.
 * (For a production ledger prefer integer minor units or Decimal128.)
 */
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** amount * percent / 100, rounded to 2 decimals */
const percentOf = (amount, percent) => round2((Number(amount) * Number(percent)) / 100);

module.exports = { round2, percentOf };
