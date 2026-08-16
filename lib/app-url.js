/**
 * Where this app lives, for the links in emails.
 *
 * Built in rather than read from the environment, because production is
 * deployed from an image nobody can add variables to. `FRONTEND_URL` still
 * wins when it is set, so a second deployment or a staging host can point
 * somewhere else without a code change.
 *
 * Getting this wrong fails silently — every email ships with links that go
 * nowhere — so it is a constant rather than something inferred from request
 * headers, which a caller could forge.
 */
const PRODUCTION_URL = 'https://finance.urbinaryhub.rw';

const CONFIGURED = process.env.FRONTEND_URL?.trim().replace(/\/$/, '') || '';

export const appUrl = () => CONFIGURED || PRODUCTION_URL;
