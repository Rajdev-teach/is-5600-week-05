const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const productData = require('../data/product1.json');

test('products and orders support the complete CRUD flow', { timeout: 20000 }, async () => {
  assert.ok(process.env.MONGODB_URI, 'Set MONGODB_URI to an isolated test database');
  const reservation = net.createServer();
  await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = spawn(process.execPath, ['app.js'], {
    cwd: require('node:path').join(__dirname, '..'),
    env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${port}`;
  const send = (path, method, body) => fetch(base + path, {
    method, headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch {}
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(ready, 'API starts');
    const fields = { ...productData, description: 'Integration test product' };
    delete fields.id; delete fields._id;
    const created = await send('/products', 'POST', fields);
    assert.equal(created.status, 200);
    const product = await created.json();
    assert.ok(product._id);
    const edited = await send(`/products/${product._id}`, 'PUT', { description: 'Updated product' });
    assert.equal(edited.status, 200);
    assert.equal((await (await fetch(`${base}/products/${product._id}`)).json()).description, 'Updated product');
    const orderResponse = await send('/orders', 'POST', { buyerEmail: 'test@example.com', products: [product._id] });
    assert.equal(orderResponse.status, 200);
    const order = await orderResponse.json();
    const updatedOrder = await send(`/orders/${order._id}`, 'PUT', { status: 'COMPLETED' });
    assert.equal((await updatedOrder.json()).status, 'COMPLETED');
    const orders = await (await fetch(`${base}/orders?status=COMPLETED&productId=${product._id}`)).json();
    assert.ok(orders.some(value => value._id === order._id));
    assert.equal((await (await send(`/orders/${order._id}`, 'DELETE')).json()).deletedCount, 1);
    assert.equal((await (await send(`/products/${product._id}`, 'DELETE')).json()).deletedCount, 1);
    assert.equal((await fetch(`${base}/products/${product._id}`)).status, 404);
  } finally {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await exited;
  }
});
