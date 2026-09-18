/** Production document protections. Authentication remains at the Sites gateway. */
export function securityHeaders(nonce, secure = true) {
  const policy = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'", // React/Three UI positioning uses inline styles.
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "frame-ancestors 'self'",
    ...(secure ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  return new Headers({
    'Content-Security-Policy': policy,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Resource-Policy': 'same-origin',
    ...(secure ? {'Strict-Transport-Security': 'max-age=31536000'} : {}),
  });
}

export function createSecureHandler(render) {
  return async function fetch(request, env, ctx) {
    // 192 fresh random bits per response; never accept a client-chosen nonce.
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
    const url = new URL(request.url);
    const protection = securityHeaders(nonce, url.protocol === 'https:');
    const finish = (response) => {
      const headers = new Headers(response.headers);
      protection.forEach((value, name) => headers.set(name, value));
      headers.set('Cache-Control', 'private, no-store');
      headers.delete('X-Powered-By');
      return new Response(request.method === 'HEAD' ? null : response.body, {
        status: response.status, statusText: response.statusText, headers,
      });
    };
    // The portfolio has no forms, mutations, uploads or server actions. Reject
    // bodies before the framework's action/RSC decoder sees untrusted input.
    if (!['GET', 'HEAD'].includes(request.method)) {
      return finish(new Response('Method not allowed', {status:405, headers:{Allow:'GET, HEAD'}}));
    }
    if (request.url.length > 4096) return finish(new Response('URI too long', {status:414}));
    let path;
    try { path=decodeURIComponent(url.pathname).replaceAll('\\','/'); }
    catch { return finish(new Response('Bad request', {status:400})); }
    if (path.split('/').some(part=>part.startsWith('.')) || /\.(?:map|env|sql|toml)$/i.test(path) || /^\/(?:package(?:-lock)?\.json|vite\.config\.|next\.config\.|app\/|lib\/|build\/|scripts\/)/i.test(path)) {
      return finish(new Response('Not found', {status:404}));
    }
    const headers = new Headers(request.headers);
    headers.set('Content-Security-Policy', protection.get('Content-Security-Policy'));
    headers.delete('Content-Security-Policy-Report-Only');
    headers.delete('x-nonce');
    try {
      return finish(await render(new Request(request, {headers}), env, ctx));
    } catch {
      // Never send stack traces, request headers or environment values to visitors.
      console.error('Portfolio request failed');
      return finish(new Response('The portfolio is temporarily unavailable.', {status:503}));
    }
  };
}
