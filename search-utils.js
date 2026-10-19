(function attachSearchUtils(root, factory) {
  const searchUtils = factory();
  if (typeof module === 'object' && module.exports) module.exports = searchUtils;
  if (root) root.TripCompanionSearch = searchUtils;
})(typeof globalThis === 'undefined' ? this : globalThis, function createSearchUtils() {
  function normalizeSearchText(value = '') {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }

  function searchTokenMatches(queryToken, textTokens) {
    if (queryToken.length < 4) return textTokens.some(token => token.includes(queryToken));
    const maxDistance = queryToken.length >= 8 ? 2 : 1;
    for (const token of textTokens) {
      if (token.includes(queryToken)) return true;
      if (Math.abs(token.length - queryToken.length) > maxDistance) continue;
      let previous = Array.from({ length: token.length + 1 }, (_, index) => index);
      let previousPrevious = null;
      let exceeded = false;
      for (let i = 1; i <= queryToken.length; i++) {
        const current = [i];
        let rowMin = i;
        for (let j = 1; j <= token.length; j++) {
          const substitution = previous[j - 1] + (queryToken[i - 1] === token[j - 1] ? 0 : 1);
          let distance = Math.min(previous[j] + 1, current[j - 1] + 1, substitution);
          if (previousPrevious && i > 1 && j > 1 && queryToken[i - 1] === token[j - 2] && queryToken[i - 2] === token[j - 1]) {
            distance = Math.min(distance, previousPrevious[j - 2] + 1);
          }
          current[j] = distance;
          rowMin = Math.min(rowMin, distance);
        }
        if (rowMin > maxDistance) { exceeded = true; break; }
        previousPrevious = previous;
        previous = current;
      }
      if (!exceeded && previous[token.length] <= maxDistance) return true;
    }
    return false;
  }

  function searchTextMatch(query, ...values) {
    const queryTokens = normalizeSearchText(query).split(/\s+/).filter(Boolean);
    if (!queryTokens.length) return true;
    const text = normalizeSearchText(values.filter(value => value != null).join(' '));
    const textTokens = text.split(/\s+/).filter(Boolean);
    return queryTokens.every(token => text.includes(token) || searchTokenMatches(token, textTokens));
  }

  return { normalizeSearchText, searchTextMatch };
});
