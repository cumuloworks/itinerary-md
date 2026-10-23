// Sentry v11 collects user info, cookies and HTTP bodies by default; keep the v10 baseline.
const deny = { deny: ['forwarded', '-ip', 'remote-', 'via', '-user'] };

export const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: deny, response: deny },
  httpBodies: [],
  urlQueryParams: deny,
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
};
