import type { Env as HonoEnv, Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { errorPage, notFoundPage } from './notfound';

// Branded 404 and 500 pages (each with the independence footer) for a Hono app, instead of
// Hono's plain-text "404 Not Found" / "Internal Server Error". The 500 page never shows the
// error's message or stack; the error is logged instead.
export function installErrorPages<E extends HonoEnv>(app: Hono<E>): void {
  app.notFound((c) => c.html(notFoundPage(c.req.path), 404));
  app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse();
    console.error(`[error] ${c.req.method} ${c.req.path}: ${err.message}`, err.stack ?? '');
    return c.html(errorPage(), 500);
  });
}
