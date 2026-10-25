import test from 'node:test';
import assert from 'node:assert/strict';
import {failureSignals} from './failure-diagnostics.mjs';

test('failed script identity and failed numeric test IDs are retained without outputting contents',()=>{
 const x=failureSignals('$ npm run qa:garp27:regressions\nEXIT=1\n> ai-studio-ghrab@0.21.255 qa:ecosystem\n> ai-studio-ghrab@0.21.255 build\nnot ok 9 - private student name ghp_abcdef\nError [ERR_ASSERTION]: secret 123');
 assert.equal(x.exit,1);assert.equal(x.lastScript,'build');assert.deepEqual(x.failedTestNumbers,[9]);
 assert.deepEqual(x.errorClasses,['ERR_ASSERTION']);
 assert.ok(!JSON.stringify(x).includes('private student'));
 assert.ok(!JSON.stringify(x).includes('ghp_abcdef'));
});
test('success does not generate false failure signals',()=>{
 const x=failureSignals('EXIT=0\n> ai-studio-ghrab@0.21.255 build\n# pass 10\n# fail 0');
 assert.equal(x.exit,0);assert.deepEqual(x.failedTestNumbers,[]);
});
test('missing and malformed logs are no authority',()=>{
 for(const input of [null,undefined,{},'', 'EXIT=null\nError: bad']){
  const x=failureSignals(input);
  assert.equal(x.exit,null);
 }
});
test('untrusted URLs and command arguments are never reproduced',()=>{
 const x=failureSignals('EXIT=1\nVisit https://school.example/secret?k=abc\nnpm error token ghp_secret\nnot ok 2 - https://bad.example/ghp_secret');
 assert.equal(x.exit,1);assert.deepEqual(x.failedTestNumbers,[2]);
 assert.ok(!JSON.stringify(x).includes('school.example'));
 assert.ok(!JSON.stringify(x).includes('ghp_secret'));
});
