// Web: the default browser persistence (IndexedDB / localStorage) keeps you signed in.
import { getAuth } from 'firebase/auth';

export function createAuth(app) {
  return getAuth(app);
}
