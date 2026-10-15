const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../server.js');

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let body;
        try {
          body = JSON.parse(data);
        } catch (e) {
          body = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test('GET /api/categories returns category list', async () => {
  const res = await request('/api/categories');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.categories));
  assert.ok(res.body.categories.length > 0);
});

test('GET /api/decisions returns items for category', async () => {
  const res = await request('/api/decisions?category=food');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
  assert.ok(res.body.items.every(item => item.categoryId === 'food'));
});

test('POST /api/decisions adds new custom item', async () => {
  const newItem = { categoryId: 'food', name: 'Ramen Shop', description: 'Delicious tonkotsu ramen' };
  const res = await request('/api/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: newItem
  });

  assert.strictEqual(res.status, 201);
  assert.ok(res.body.item);
  assert.strictEqual(res.body.item.name, 'Ramen Shop');
  assert.strictEqual(res.body.item.isCustom, true);

  // Clean up
  await request(`/api/decisions/${res.body.item.id}`, { method: 'DELETE' });
});

test('POST /api/decisions validates required name', async () => {
  const res = await request('/api/decisions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { categoryId: 'food', name: '  ' }
  });

  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error);
});

test('GET /api/decisions/random selects an item and increments spin count', async () => {
  const initialStats = await request('/api/stats');
  const initialSpins = initialStats.body.totalSpinCount;

  const res = await request('/api/decisions/random?category=food');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.selected);
  assert.strictEqual(res.body.spinCount, initialSpins + 1);

  const updatedStats = await request('/api/stats');
  assert.strictEqual(updatedStats.body.totalSpinCount, initialSpins + 1);
  assert.ok(updatedStats.body.recentHistory.length > 0);
});
