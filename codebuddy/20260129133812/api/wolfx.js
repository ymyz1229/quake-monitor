export default async function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch('https://api.wolfx.jp/cenc_eqlist.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Wolfx API Error:', error);
    res.status(500).json({ error: 'Failed to fetch data from Wolfx' });
  }
}
