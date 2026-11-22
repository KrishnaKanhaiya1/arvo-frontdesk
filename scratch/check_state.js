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
        expression: `JSON.stringify({
          url: window.location.href,
          auth: localStorage.getItem('arvo_authenticated'),
          role: localStorage.getItem('arvo_actor_role'),
          actorId: localStorage.getItem('arvo_actor_id'),
          title: document.title,
          h1: document.querySelector('h1')?.innerText,
          h2: document.querySelector('h2')?.innerText
        })`,
        returnByValue: true
      }
    }));
    ws.onmessage = m => {
      console.log('Browser State:', JSON.parse(JSON.parse(m.data).result.result.value));
      ws.close();
    };
  });
});
