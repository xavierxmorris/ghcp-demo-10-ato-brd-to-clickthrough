import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkPackAgainstHarness } from './pack-contract.mjs';

function fixture() {
  return {
    versions: [{ id: 'v1.0', target: 'prototype' }],
    references: [{ ref: 'REQ-001', since: 'v1.0' }],
    cases: [{ id: 'TC-001', auto: true, refs: ['REQ-001'], applies: ['v1.0'] }],
  };
}

test('a complete pack is accepted', () => {
  assert.deepEqual(checkPackAgainstHarness(fixture(), ['TC-001']), []);
});

const mutations = {
  'empty versions': pack => { pack.versions = []; },
  'empty cases': pack => { pack.cases = []; },
  'duplicate case': pack => { pack.cases.push({ ...pack.cases[0] }); },
  'disabled implementation': pack => { pack.cases[0].auto = false; },
  'invalid auto flag': pack => { pack.cases[0].auto = 'yes'; },
  'unknown reference': pack => { pack.cases[0].refs = ['REQ-999']; },
  'unknown version': pack => { pack.cases[0].applies = ['v9.9']; },
  'duplicate applicability': pack => { pack.cases[0].applies.push('v1.0'); },
  'zero cases for a version': pack => { pack.versions.push({ id: 'v1.1', target: 'prototype-v2' }); },
  'duplicate version': pack => { pack.versions.push({ ...pack.versions[0] }); },
  'duplicate reference': pack => { pack.references.push({ ...pack.references[0] }); },
  'reference before its introduction': pack => {
    pack.versions.push({ id: 'v1.1', target: 'prototype-v2' });
    pack.references[0].since = 'v1.1';
    pack.cases[0].applies.push('v1.1');
  },
  'missing implementation': pack => { pack.cases[0].id = 'TC-999'; },
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`rejects ${name}`, () => {
    const pack = fixture();
    mutate(pack);
    assert.ok(checkPackAgainstHarness(pack, ['TC-001']).length > 0);
  });
}

test('an empty harness is rejected', () => {
  assert.ok(checkPackAgainstHarness(fixture(), []).length > 0);
});

test('an unreferenced requirement is rejected even when case counts stay unchanged', () => {
  const pack = fixture();
  pack.references.push({ ref: 'REQ-002', since: 'v1.0' });
  assert.ok(checkPackAgainstHarness(pack, ['TC-001']).some(problem => problem.includes('REQ-002')));
});

test('coverage is required in every applicable version', () => {
  const pack = fixture();
  pack.versions.push({ id: 'v1.1', target: 'prototype-v2' });
  pack.references.push({ ref: 'REQ-002', since: 'v1.1' });
  pack.cases.push({ id: 'TC-002', auto: true, refs: ['REQ-002'], applies: ['v1.1'] });
  assert.ok(checkPackAgainstHarness(pack, ['TC-001', 'TC-002'])
    .some(problem => problem === 'v1.1: REQ-001 has no applicable case'));
});

test('an explicitly manual case can provide reference coverage', () => {
  const pack = fixture();
  pack.references.push({ ref: 'REQ-002', since: 'v1.0' });
  pack.cases.push({ id: 'TC-MANUAL', auto: false, refs: ['REQ-002'], applies: ['v1.0'] });
  assert.deepEqual(checkPackAgainstHarness(pack, ['TC-001']), []);
});
