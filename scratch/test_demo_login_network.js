const http = require('http');

http.get('http://127.0.0.1:9222/json/list', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', async () => {
    const list = JSON.parse(d);
    const page = list.find(p => p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => ws.onopen = res);
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `(async () => {
          try {
            const res = await fetch('/api/auth/demo-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ personaId: 'agent-meera' })
            });
            const data = await res.json();
            const sessionRes = await fetch('/api/auth/session');
            const sessionData = await sessionRes.json();
            return { demoLoginStatus: res.status, demoData: data, sessionData };
          } catch (err) {
            return { error: err.message };
          }
        })()`,
        awaitPromise: true,
        returnByValue: true
      }
    }));
    ws.onmessage = m => {
      console.log('API Test Result:', JSON.stringify(JSON.parse(m.data).result.result.value, null, 2));
      ws.close();
    };
  });
});
