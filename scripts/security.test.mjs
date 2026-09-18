import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecureHandler} from '../lib/security.mjs';
import {createDrivingWorld} from '../app/driving.mjs';
import {createRecovery} from '../app/recovery.mjs';

test('document CSP is unique per response and client headers cannot select the nonce', async()=>{
  const seen=[];
  const fetch=createSecureHandler(async request=>{seen.push(request.headers);return new Response('page',{headers:{'X-Powered-By':'framework','Cache-Control':'public'}})});
  const request=()=>new Request('https://portfolio.test/',{headers:{'Content-Security-Policy':"script-src 'nonce-attacker'",'x-nonce':'attacker'}});
  const a=await fetch(request()),b=await fetch(request());
  const policy=a.headers.get('Content-Security-Policy');
  assert.match(policy,/script-src 'nonce-[A-Za-z0-9+/]{32}' 'strict-dynamic'/);
  assert.notEqual(policy,b.headers.get('Content-Security-Policy'));
  assert.equal(policy,seen[0].get('Content-Security-Policy'));
  assert.equal(seen[0].get('x-nonce'),null);
  assert.ok(!policy.includes('attacker')&&!policy.includes('unsafe-eval'));
  assert.match(policy,/script-src-attr 'none'/);
  assert.match(policy,/object-src 'none'/);
  assert.equal(a.headers.get('X-Frame-Options'),'SAMEORIGIN');
  assert.equal(a.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(a.headers.get('Cache-Control'),'private, no-store');
  assert.equal(a.headers.get('X-Powered-By'),null);
});

test('unused write methods never reach the framework or action decoder',async()=>{
  let calls=0;const fetch=createSecureHandler(async()=>{calls++;return new Response('unexpected')});
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS']){
    const response=await fetch(new Request('https://portfolio.test/',{method,headers:{'Next-Action':'untrusted'},body:'untrusted payload'}));
    assert.equal(response.status,405);assert.equal(response.headers.get('Allow'),'GET, HEAD');
  }
  assert.equal(calls,0);
});

test('internal source probes and oversized requests are rejected before rendering',async()=>{
  let calls=0;const fetch=createSecureHandler(async()=>{calls++;return new Response('unexpected')});
  for(const path of ['/.env','/%2egit/config','/app/page.tsx','/package-lock.json','/source.js.map','/x%5c.env'])
    assert.equal((await fetch(new Request('https://portfolio.test'+path))).status,404,path);
  assert.equal((await fetch(new Request('https://portfolio.test/%zz'))).status,400);
  assert.equal((await fetch(new Request('https://portfolio.test/?q='+'x'.repeat(4096)))).status,414);
  assert.equal(calls,0);
});

test('failed rendering does not expose stack traces or server details',async()=>{
  const fetch=createSecureHandler(async()=>{throw new Error('private secret stack')});
  const response=await fetch(new Request('https://portfolio.test/'));
  assert.equal(response.status,503);assert.ok(!(await response.text()).includes('private secret'));
  assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});

test('HEAD and local production preview preserve safe response semantics',async()=>{
  const fetch=createSecureHandler(async()=>new Response('page'));
  const response=await fetch(new Request('http://localhost:8787/',{method:'HEAD'}));
  assert.equal(response.status,200);assert.equal(await response.text(),'');
  assert.ok(!response.headers.get('Content-Security-Policy').includes('upgrade-insecure-requests'));
});

test('untrusted saved checkpoints are size limited, validated and projected onto known fields',()=>{
  const d=createDrivingWorld(),recovery=createRecovery(d.world,d.chassis);
  for(const raw of ['x'.repeat(257),'null','[]','{"x":"0","z":8,"yaw":0}','{"x":0,"z":8,"yaw":1e300}'])assert.equal(recovery.restore(raw),null);
  assert.deepEqual(recovery.restore('{"x":0,"z":8,"yaw":0,"unexpected":"value"}'),{x:0,z:8,yaw:0});
});
