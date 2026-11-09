import test from 'node:test';
import assert from 'node:assert/strict';
import { planCart, classifyIntent } from '../lib/planner.mjs';
import { CATALOG } from '../lib/catalog.mjs';

const heldOut = [
  ['cooking', 'I am moving out and need cookware to make meals'],
  ['study', 'I have evening exams and need a desk for revision notes'],
  ['repairs', 'My bookshelf has loose screws and I need household tools'],
  ['lighting', 'The electricity may fail in a storm so I want portable lighting'],
];
test('held-out example sentences select the four supported intents', () => {
  for (const [expected, query] of heldOut) assert.equal(classifyIntent(query).label, expected, query);
});
test('unsupported requests and weak evidence abstain', () => {
  for (const need of ['Find me a holiday in Spain', 'Please buy dog food', 'pot', 'cook cook cook cook', ' ', 'xxxxxxxx']) {
    assert.equal(classifyIntent(need).label, 'unknown', need);
  }
  const result = planCart({need:'Find me a holiday in Spain',budgetCents:10000});
  assert.deepEqual(result.items, []);
  assert.equal(result.remainingCents, 10000);
});
test('negated shopping requests do not buy the excluded kit', () => {
  for (const need of [
    'I do not need cookware or kitchen tools for meals',
    'I don’t want kitchen tools for cooking',
    'No desk lamp or notebook supplies please',
    'A study desk without a lamp',
    'Avoid battery lights and portable lighting',
  ]) {
    const result = planCart({need, budgetCents:10000});
    assert.equal(result.intent.label, 'unknown', need);
    assert.deepEqual(result.items, []);
    assert.match(result.explanation, /cannot reliably interpret exclusions/);
  }
});
test('rejects invalid budget, description, and inventory inputs', () => {
  for (const budgetCents of [-1, 1000001, 1.2, NaN, Infinity, '5000', null]) assert.throws(() => planCart({need:'a cooking kitchen',budgetCents}), RangeError);
  for (const need of ['', ' ', null, 42, 'a'.repeat(2001)]) assert.throws(() => planCart({need,budgetCents:1000}), TypeError);
  assert.throws(() => planCart({need:'a cooking kitchen',budgetCents:1000,ownedIds:['made-up']}), TypeError);
});
test('every generated cart respects exact cents, catalog identity, and category uniqueness', () => {
  for (const [, need] of heldOut) for (const budgetCents of [0, 398, 399, 500, 1000, 2000, 5000, 9999, 1000000]) {
    const result = planCart({need,budgetCents});
    assert.ok(result.totalCents <= budgetCents);
    assert.equal(result.totalCents, result.items.reduce((sum,item)=>sum+item.priceCents*item.quantity,0));
    assert.equal(result.remainingCents, budgetCents-result.totalCents);
    assert.equal(new Set(result.items.map(item=>item.needGroup)).size,result.items.length);
    for (const item of result.items) {
      assert.equal(item.priceCents,CATALOG.find(product=>product.id===item.id).priceCents);
      assert.equal(item.quantity,1);
      assert.equal(item.category,result.intent.label);
    }
  }
});
test('owning an item covers its entire need group and prevents redundant alternatives', () => {
  const result = planCart({need:'starter cooking kitchen for meals',budgetCents:10000,ownedIds:['cook-pot']});
  assert.ok(result.items.length > 0);
  assert.ok(result.items.every(item => item.needGroup !== 'cookware'));
  assert.ok(!result.missingNeeds.includes('a vessel for cooking'));
});
test('empty budget produces a truthful incomplete plan', () => {
  const result=planCart({need:heldOut[0][1],budgetCents:0});
  assert.equal(result.totalCents,0);
  assert.equal(result.items.length,0);
  assert.ok(result.missingNeeds.length>0);
});
test('exact search can choose a cheaper combination with more total need coverage', () => {
  const result=planCart({need:'Set up a study desk for classes and homework',budgetCents:1698});
  assert.deepEqual(result.items.map(item=>item.id),['study-cards','study-lamp-mini']);
  assert.equal(result.totalCents,1698);
});
test('results are deterministic and do not mutate caller-owned arrays', () => {
  const ownedIds=['study-lamp'];
  const input={need:heldOut[1][1],budgetCents:5000,ownedIds};
  assert.deepEqual(planCart(input),planCart(input));
  assert.deepEqual(ownedIds,['study-lamp']);
});
