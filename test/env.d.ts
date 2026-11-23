import type { Env as AppBindings } from '../src/types';

declare global {
  namespace Cloudflare {
    interface Env extends AppBindings {}
  }
}
