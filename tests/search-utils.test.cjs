const test = require('node:test');
const assert = require('node:assert/strict');
const { searchTextMatch } = require('../search-utils.js');

test('matches case-insensitive and accent-insensitive names', () => {
  assert.equal(searchTextMatch('cafe', 'Café in Paris'), true);
  assert.equal(searchTextMatch('GOA', 'Goa, India'), true);
});

test('matches partial words and adjacent transposition typos', () => {
  assert.equal(searchTextMatch('kera', 'Kerala backwaters'), true);
  assert.equal(searchTextMatch('jaipru', 'Jaipur, Rajasthan'), true);
});

test('requires all query words and rejects unrelated text', () => {
  assert.equal(searchTextMatch('beach goa', 'Goa has quiet beaches'), true);
  assert.equal(searchTextMatch('beach tokyo', 'Goa has quiet beaches'), false);
  assert.equal(searchTextMatch('tokyo', 'Goa, India'), false);
});

test('an empty query matches everything for unfiltered lists', () => {
  assert.equal(searchTextMatch('', 'any destination'), true);
  assert.equal(searchTextMatch('   ', 'any destination'), true);
});
