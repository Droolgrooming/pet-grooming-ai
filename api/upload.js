module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'IMGBB_API_KEY environment variable is not set' });

  try {
    const { filename, dataBase64 } = req.body || {};
    if (!dataBase64) return res.status(400).json({ error: 'Missing dataBase64' });

    const safeName = (filename || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');

    // ImgBB expects form-urlencoded body with the base64 image
    const formData = new URLSearchParams();
    formData.append('image', dataBase64);
    formData.append('name', safeName);

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const result = await imgbbRes.json();

    if (!imgbbRes.ok || !result.data) {
      return res.status(500).json({ error: 'ImgBB upload failed', details: result });
    }

    return res.status(200).json({ url: result.data.url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Upload failed' });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
