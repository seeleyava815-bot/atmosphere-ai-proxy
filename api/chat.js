export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, model, temperature, max_tokens } = req.body;
    const apiKey = process.env.SILICONFLOW_API_KEY;
    const defaultModel = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

    if (!apiKey) {
      return res.status(500).json({ error: 'API Key not configured' });
    }

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || defaultModel,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
    res.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
