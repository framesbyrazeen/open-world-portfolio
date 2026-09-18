import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Run against the production Worker preview, never the Vite development server.
const base=process.argv[2]??'http://127.0.0.1:8787';
const first=await fetch(base),html=await first.text();
assert.equal(first.status,200,html.slice(0,200));
const policy=first.headers.get('content-security-policy');
assert.ok(policy,'Production Worker must actually attach CSP');
const nonce=policy.match(/'nonce-([^']+)'/)?.[1];assert.ok(nonce);
const scripts=[...html.matchAll(/<script\b([^>]*)>/g)];assert.ok(scripts.length>0,'Check a real rendered document');
for(const [,attributes] of scripts){
  if(/type="application\/(?:ld\+)?json"/.test(attributes))continue;
  assert.ok(attributes.includes(`nonce="${nonce}"`),'Every executable bootstrap script must match the response nonce');
}
assert.equal(first.headers.get('cache-control'),'private, no-store');
assert.equal(first.headers.get('x-content-type-options'),'nosniff');
assert.equal(first.headers.get('x-frame-options'),'SAMEORIGIN');
const second=await fetch(base,{headers:{'Content-Security-Policy':"script-src 'nonce-attacker'"}});
assert.notEqual(second.headers.get('content-security-policy'),policy);
assert.ok(!second.headers.get('content-security-policy').includes('attacker'));await second.arrayBuffer();
for(const [path,method,status] of [['/','POST',405],['/','DELETE',405],['/.env','GET',404],['/.git/config','GET',404],['/package.json','GET',404],['/?q='+'x'.repeat(4096),'GET',414]]){
  const response=await fetch(base+path,{method});await response.arrayBuffer();assert.equal(response.status,status,`${method} ${path.slice(0,40)}`);
}
const asset=html.match(/src="([^" ]+\/_next\/static\/[^" ]+\.js)"/)?.[1]??html.match(/src="(\/_next\/static\/[^" ]+\.js)"/)?.[1];
assert.ok(asset,'Production script URL must exist');
const javascript=await fetch(new URL(asset,base));assert.equal(javascript.status,200);assert.equal(javascript.headers.get('x-content-type-options'),'nosniff');await javascript.arrayBuffer();
const pdf=await fetch(base+'/Mohammed-Razeen-P-Resume.pdf');assert.equal(pdf.status,200);assert.match(pdf.headers.get('content-disposition'),/attachment/);await pdf.arrayBuffer();
const publicFiles=await fs.readdir('dist/client',{recursive:true});
assert.ok(!publicFiles.some(p=>/\.(?:map|env|pem|key)$/.test(p)||/(?:^|[\\/])\.git(?:[\\/]|$)/.test(p)),'No source maps, environment files or private keys may ship as public assets');
console.log(JSON.stringify({productionHeaders:'passed',noncedScripts:scripts.length,nonceRotation:'passed',methodAndPathGuards:'passed',scriptAndResumeAssets:'passed',publicArtifactCheck:'passed'}));
