module.exports = async function handler(req, res) {
  // 设置 CORS 头 - 允许所有来源
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('[Wolfx API] Fetching data from api.wolfx.jp...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10秒超时
    
    const response = await fetch('https://api.wolfx.jp/cenc_eqlist.json', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; QuakeMonitor/1.0)'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Wolfx API] Success, entries:', Object.keys(data).length);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('[Wolfx API Error]:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch data from Wolfx', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
