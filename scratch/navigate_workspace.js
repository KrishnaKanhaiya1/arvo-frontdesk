const http = require('http');

http.get('http://127.0.0.1:9222/json/list', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', async () => {
    const list = JSON.parse(d);
    const page = list.find(p => p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => ws.onopen = res);
    
    // Set localStorage as authenticated
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          localStorage.setItem('arvo_authenticated', 'true');
          localStorage.setItem('arvo_actor_role', 'agent');
          localStorage.setItem('arvo_actor_id', 'agent-meera');
          window.location.href = '/tickets/ARV-101';
        `
      }
    }));
    await new Promise(r => setTimeout(r, 3000));

    ws.send(JSON.stringify({
      id: 2,
      method: 'Runtime.evaluate',
      params: {
        expression: `JSON.stringify({
          url: window.location.href,
          title: document.title,
          h2: document.querySelector('h2')?.innerText,
          ticketsCount: document.querySelectorAll('.cursor-pointer').length,
          hasCSV: document.body.innerText.includes('CSV'),
          hasClock: !!document.querySelector('button[title*="Simulation Clock"]'),
          assignee: document.body.innerText.includes('Meera Krishnan')
        })`,
        returnByValue: true
      }
    }));
    ws.onmessage = m => {
      const parsed = JSON.parse(m.data);
      if (parsed.id === 2) {
        console.log('Workspace State:', JSON.parse(parsed.result.result.value));
        ws.close();
      }
    };
  });
});
