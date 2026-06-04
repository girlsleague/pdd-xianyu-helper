const { resolvePddProduct } = require('./providers/pdd');

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
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({
        ok: false,
        message: '缺少拼多多链接。'
      });
    }

    const product = await resolvePddProduct(url);
    return res.status(200).json({
      ok: true,
      data: product
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: error.message || '拼多多解析失败。'
    });
  }
};