import test from 'node:test';
import assert from 'node:assert/strict';
import {junglePlanting,isDriveCorridor} from '../app/jungle-layout.mjs';
test('large jungle trees leave all driving corridors and landmarks clear',()=>{
 const trees=junglePlanting();
 assert.equal(trees.length,165);
 for(const tree of trees){assert.equal(isDriveCorridor(tree.x,tree.z,2),false);assert.ok(Math.hypot(tree.x,tree.z)<57)}
});
test('planting is deterministic and trunks do not overlap',()=>{
 const a=junglePlanting(),b=junglePlanting();assert.deepEqual(a,b);
 for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)assert.ok(Math.hypot(a[i].x-a[j].x,a[i].z-a[j].z)>=2.5);
});
test('starting grid, chapter arrival areas, bridge, and ramps are protected',()=>{
 for(const [x,z] of [[0,8],[-9,-1],[19,-3],[15,15],[-17,15],[-27,0],[-6,22],[8,-23]])assert.equal(isDriveCorridor(x,z),true);
});
