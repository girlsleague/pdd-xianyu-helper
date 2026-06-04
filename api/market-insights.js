const { resolveXianyuInsights } = require('./providers/xianyu');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      message: 'Only POST is supported.'
    });
  }

  try {
    const { keyword } = req.body || {};
    if (!keyword) {
      return res.status(400).json({
        ok: false,
        message: '缺少闲鱼搜索关键词。'
      });
    }

    const insights = await resolveXianyuInsights(keyword);
    return res.status(200).json({
      ok: true,
      data: insights
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || '闲鱼市场分析失败。'
    });
  }
};