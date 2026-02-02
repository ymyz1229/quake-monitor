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
    console.log('[USGS API] Fetching data from earthquake.usgs.gov...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15秒超时
    
    const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/geo+json, application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; QuakeMonitor/1.0)'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[USGS API] Success, features count:', data.features?.length || 0);
    
    res.status(200).json(data);
  } catch (error) {
    console.error('[USGS API Error]:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch data from USGS', 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
