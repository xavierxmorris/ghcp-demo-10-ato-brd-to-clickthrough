export function checkPackAgainstHarness(pack, implementedIds) {
  const problems = [];
  if (!pack || !Array.isArray(pack.versions) || !pack.versions.length ||
      !Array.isArray(pack.cases) || !pack.cases.length || !Array.isArray(pack.references)) {
    return ['The pack must declare nonempty versions and cases, plus references'];
  }
  const versions = new Set();
  for (const version of pack.versions) {
    if (!version || typeof version.id !== 'string' || !version.id ||
        typeof version.target !== 'string' || !version.target) {
      problems.push('Every version needs an ID and target');
      continue;
    }
    if (versions.has(version.id)) problems.push(`Duplicate version ${version.id}`);
    versions.add(version.id);
  }
  const references = new Map();
  for (const reference of pack.references) {
    if (!reference || typeof reference.ref !== 'string' || !reference.ref ||
        !versions.has(reference.since)) {
      problems.push('Every reference needs an ID and a known introduction version');
      continue;
    }
    if (references.has(reference.ref)) problems.push(`Duplicate reference ${reference.ref}`);
    references.set(reference.ref, reference.since);
  }
  const implemented = new Set(implementedIds);
  if (!implemented.size) problems.push('The harness implements no cases');
  const declared = new Set();
  for (const item of pack.cases) {
    if (!item || typeof item.id !== 'string' || !item.id) {
      problems.push('Every case needs an ID');
      continue;
    }
    if (declared.has(item.id)) problems.push(`Duplicate case ${item.id}`);
    declared.add(item.id);
    if (typeof item.auto !== 'boolean') problems.push(`${item.id}: auto must be boolean`);
    if (item.auto && !implemented.has(item.id)) problems.push(`${item.id}: missing implementation`);
    if (!item.auto && implemented.has(item.id)) problems.push(`${item.id}: implemented case was disabled`);
    if (!Array.isArray(item.refs) || !item.refs.length ||
        item.refs.some(ref => !references.has(ref))) {
      problems.push(`${item.id}: missing or unknown document reference`);
    }
    if (!Array.isArray(item.applies) || !item.applies.length ||
        new Set(item.applies).size !== item.applies.length ||
        item.applies.some(version => !versions.has(version))) {
      problems.push(`${item.id}: missing, duplicate or unknown version applicability`);
    }
    if (Array.isArray(item.refs) && Array.isArray(item.applies)) {
      const order = [...versions];
      for (const version of item.applies) {
        for (const ref of item.refs) {
          if (references.has(ref) && order.indexOf(references.get(ref)) > order.indexOf(version)) {
            problems.push(`${item.id}: ${ref} does not exist in ${version}`);
          }
        }
      }
    }
  }
  for (const id of implemented) {
    if (!declared.has(id)) problems.push(`${id}: implemented but missing from the pack`);
  }
  for (const version of versions) {
    if (!pack.cases.some(item => item?.auto && Array.isArray(item.applies) && item.applies.includes(version))) {
      problems.push(`${version}: no automated cases selected`);
    }
    const order = [...versions];
    for (const [reference, introduced] of references) {
      if (order.indexOf(introduced) > order.indexOf(version)) continue;
      const covered = pack.cases.some(item =>
        Array.isArray(item?.applies) && item.applies.includes(version) &&
        Array.isArray(item.refs) && item.refs.includes(reference));
      if (!covered) problems.push(`${version}: ${reference} has no applicable case`);
    }
  }
  return problems;
}
