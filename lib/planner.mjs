import { CATALOG, CATALOG_NOTICE } from './catalog.mjs';
import { TRAINING_DATA, MODEL_CARD } from './training.mjs';

const STOP_WORDS = new Set('a an and are as at be basic buy can for from get help i in into is it me my need new of on or please set simple small some supplies that the to up want with'.split(' '));
function tokenize(text) {
  return (text.toLowerCase().match(/[a-z]+/g) || [])
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
    .map(word => word.endsWith('ies') ? word.slice(0, -3) + 'y' : word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
}

function train(data) {
  const vocabulary = new Set();
  const classes = Object.entries(data).map(([label, examples]) => {
    const counts = new Map();
    let tokenCount = 0;
    for (const example of examples) for (const token of tokenize(example)) {
      vocabulary.add(token);
      counts.set(token, (counts.get(token) || 0) + 1);
      tokenCount++;
    }
    return { label, counts, tokenCount, examples: examples.length };
  });
  return { vocabulary, classes, totalExamples: classes.reduce((sum, item) => sum + item.examples, 0) };
}
const MODEL = train(TRAINING_DATA);

export function classifyIntent(need) {
  if (typeof need !== 'string') throw new TypeError('Describe your shopping need in text.');
  // This bag-of-words model cannot reliably understand exclusion or negation.
  // Decline those requests rather than recommending the things a person rejects.
  if (/\b(?:not|no|never|without|except|exclude|excluding|avoid|don['’]t|doesn['’]t|can['’]t|won['’]t)\b/i.test(need)) {
    return { label: 'unknown', confidence: 0, method: MODEL_CARD.method, modelVersion: MODEL_CARD.version, reason: 'unsupported_constraints' };
  }
  const tokens = tokenize(need);
  const known = tokens.filter(token => MODEL.vocabulary.has(token));
  const ranked = MODEL.classes.map(item => ({
    label: item.label,
    score: Math.log(item.examples / MODEL.totalExamples) + known.reduce((sum, token) => sum + Math.log(((item.counts.get(token) || 0) + 1) / (item.tokenCount + MODEL.vocabulary.size)), 0),
  })).sort((a, b) => b.score - a.score);
  const weights = ranked.map(item => Math.exp(item.score - ranked[0].score));
  const confidence = weights[0] / weights.reduce((sum, value) => sum + value, 0);
  // Unknown words never add evidence. Repeating one known token cannot satisfy the two-feature gate.
  const enoughEvidence = new Set(known).size >= 2 && known.length / Math.max(tokens.length, 1) >= 0.35 && confidence >= 0.62;
  return { label: enoughEvidence ? ranked[0].label : 'unknown', confidence: Number(confidence.toFixed(4)), method: MODEL_CARD.method, modelVersion: MODEL_CARD.version };
}

const NEEDS = {
  cooking: { title: 'Starter kitchen', groups: [['cookware', 10, 'a vessel for cooking'], ['utensils', 8, 'tools for stirring and serving'], ['prep', 6, 'a food preparation surface'], ['serveware', 5, 'a place setting'], ['cleanup', 3, 'cleanup supplies'], ['storage', 2, 'leftover storage']] },
  study: { title: 'Study desk', groups: [['notes', 10, 'paper and a pen for notes'], ['light', 9, 'task lighting'], ['stand', 5, 'a laptop stand'], ['organization', 4, 'a place for loose supplies'], ['timer', 3, 'a study timer'], ['cables', 2, 'cable organization']] },
  repairs: { title: 'Basic hand-tool kit', groups: [['driver', 10, 'a tool for common screws'], ['measure', 8, 'a measuring tool'], ['hammer', 6, 'a hammer'], ['grip', 5, 'a gripping tool'], ['level', 4, 'a level'], ['fasteners', 3, 'picture fasteners'], ['storage', 2, 'tool storage']] },
  lighting: { title: 'Portable lighting', groups: [['room', 10, 'a portable room light'], ['portable', 8, 'a handheld or wearable light'], ['charging', 6, 'a backup phone charger'], ['spares', 4, 'spare batteries'], ['cable', 3, 'a compatible charging cable'], ['storage', 1, 'supply storage']] },
};

/** Exact enumeration over bounded category choices: at most one item per need group. */
function optimize(groups, products, budgetCents) {
  let best = { score: -1, total: 0, products: [] };
  function visit(index, score, total, selected) {
    if (index === groups.length) {
      if (score > best.score || (score === best.score && total < best.total)) best = { score, total, products: selected.slice() };
      return;
    }
    const [group, priority] = groups[index];
    visit(index + 1, score, total, selected);
    for (const product of products.filter(item => item.needGroup === group).sort((a, b) => a.priceCents - b.priceCents || a.id.localeCompare(b.id))) {
      if (total + product.priceCents <= budgetCents) visit(index + 1, score + priority, total + product.priceCents, [...selected, product]);
    }
  }
  visit(0, 0, 0, []);
  return best;
}

export function planCart({ need, budgetCents, ownedIds = [] } = {}) {
  if (typeof need !== 'string' || !need.trim() || need.length > 2000) throw new TypeError('Enter a shopping need between 1 and 2,000 characters.');
  if (!Number.isSafeInteger(budgetCents) || budgetCents < 0 || budgetCents > 1_000_000) throw new RangeError('Budget must be a whole number of cents between 0 and 1,000,000.');
  if (!Array.isArray(ownedIds) || ownedIds.length > CATALOG.length || ownedIds.some(id => typeof id !== 'string' || !CATALOG.some(item => item.id === id))) throw new TypeError('Owned items must be known catalog item IDs.');
  const intent = classifyIntent(need);
  const warnings = [CATALOG_NOTICE];
  if (intent.label === 'unknown') return { items: [], totalCents: 0, budgetCents, remainingCents: budgetCents, intent, explanation: intent.reason === 'unsupported_constraints' ? 'This small model cannot reliably interpret exclusions such as “do not buy” or “without.” Describe one kit you want, and use the owned-item checklist to exclude needs you already cover.' : 'I could not confidently match this request to a supported kit. Try a starter cooking kitchen, study desk, basic hand-tool repairs, or portable lighting for a power outage.', warnings, missingNeeds: [] };
  const definition = NEEDS[intent.label];
  const owned = new Set(ownedIds);
  const ownedGroups = new Set(CATALOG.filter(item => owned.has(item.id) && item.category === intent.label).map(item => item.needGroup));
  const groups = definition.groups.filter(([group]) => !ownedGroups.has(group));
  const candidates = CATALOG.filter(item => item.category === intent.label && !owned.has(item.id));
  const selected = optimize(groups, candidates, budgetCents);
  const covered = new Set(selected.products.map(item => item.needGroup));
  const missingNeeds = groups.filter(([group]) => !covered.has(group)).map(([, , text]) => text);
  const items = selected.products.map(product => ({ id: product.id, name: product.name, category: product.category, needGroup: product.needGroup, priceCents: product.priceCents, quantity: 1, reason: `Covers ${definition.groups.find(([group]) => group === product.needGroup)[2]}. ${product.description}` }));
  warnings.push('The model selects a kit category. It does not interpret every product preference or size requirement in your description.');
  if (missingNeeds.length) warnings.push('This budget does not cover every suggested need. Review the missing items before checkout.');
  if (intent.label === 'lighting') warnings.push('This is a demonstration shopping list, not an emergency preparedness plan. Check battery and connector compatibility and charge power banks in advance.');
  if (intent.label === 'repairs') warnings.push('For simple hand-tool tasks only. This list does not assess electrical, structural, or other repair risks.');
  if (items.some(item => item.id === 'cook-board')) warnings.push('The selected cutting board does not include a knife.');
  return { items, totalCents: selected.total, budgetCents, remainingCents: budgetCents - selected.total, intent, explanation: `${definition.title}: the model selected the category; an exact budget search selected ${items.length} items to maximize predefined need coverage, breaking ties by lower cost.${ownedGroups.size ? ` ${ownedGroups.size} needs are already covered by items you own.` : ''}`, warnings, missingNeeds };
}
