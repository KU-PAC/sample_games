import test from 'node:test';
import assert from 'node:assert/strict';
import { winningLine, chooseMove, candidates } from './ai.js';
const empty=()=>Array(225).fill(0);
test('horizontal, vertical and both diagonal wins; edges do not wrap',()=>{
  for(const step of [1,15,16,14]){const b=empty(),start=step===14?14:0;for(let i=0;i<5;i++)b[start+i*step]=1;assert.equal(winningLine(b,start).length,5);}
  const b=empty();[13,14,15,16,17].forEach(i=>b[i]=1);assert.equal(winningLine(b,15),null);
});
test('six in a row is a win in freestyle rules',()=>{const b=empty();for(let i=0;i<6;i++)b[75+i]=2;assert.equal(winningLine(b,78).length,6);});
for(const mode of ['easy','normal','hard']){
  test(`${mode} takes an immediate win and blocks immediate loss`,()=>{
    for(const player of [1,2]){const b=empty();b[105]=3-player;for(let i=1;i<5;i++)b[105+i]=player;const before=[...b];assert.equal(chooseMove(b,mode).index,110);assert.deepEqual(b,before);}
  });
}
test('Hard produces legal bounded iterative search without mutating the board',()=>{
  const b=empty();b[112]=1;b[113]=2;b[128]=1;b[97]=2;
  const original=[...b],progress=[];const r=chooseMove(b,'hard',{budget:100,onProgress:p=>progress.push(p)});
  assert.equal(b[r.index],0);assert.ok(r.depth<=3);assert.ok(r.nodes>0);assert.ok(r.elapsed<400);assert.ok(progress.length);assert.deepEqual(b,original);
});
test('full board returns no legal move and empty board opens in the center',()=>{assert.equal(chooseMove(Array(225).fill(1),'hard').index,-1);assert.equal(candidates(empty())[0].index,112);});
