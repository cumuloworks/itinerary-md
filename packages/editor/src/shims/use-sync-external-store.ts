// `use-sync-external-store/shim` only exists for React < 18. React 19 ships the
// hook natively, so the shim is resolved to the built-in one instead of
// bundling its CommonJS build, which would `require('react')` at runtime even
// though React is an external of this library.
export { useSyncExternalStore } from 'react';
