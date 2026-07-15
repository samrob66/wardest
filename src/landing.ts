import { Hono } from 'hono';
import type { Env } from './types';
import { renderLanding } from './views/landing';

// wardest.com — static marketing / entry point.
export const landing = new Hono<{ Bindings: Env }>();

landing.get('/', (c) => c.html(renderLanding()));

landing.get('/robots.txt', (c) =>
  c.text('User-agent: *\nAllow: /\n', 200, { 'content-type': 'text/plain; charset=utf-8' }),
);

landing.get('/favicon.ico', (c) => c.body(null, 204));

export default landing;
