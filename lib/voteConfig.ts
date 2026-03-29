/**
 * Production: set to `true` so each device submits at most one ballot pair.
 * Testing: keep `false` to allow repeated submissions (each submit adds new tally docs).
 */
export const VOTE_ENFORCE_SINGLE_BALLOT_PER_DEVICE = false;
