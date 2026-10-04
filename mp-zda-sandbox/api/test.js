module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const accessToken = process.env.MERCADO_PAGO_TEST_ACCESS_TOKEN;
  if (!accessToken) {
    return res.status(500).json({
      error: 'missing_env',
      message: 'Configure MERCADO_PAGO_TEST_ACCESS_TOKEN na Vercel.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }

  const token = body && body.token;
  if (!token || typeof token !== 'string' || token.length < 10) {
    return res.status(400).json({
      error: 'invalid_token',
      message: 'Envie somente um token de cartão gerado pelo SDK oficial do Mercado Pago em ambiente de teste.'
    });
  }

  try {
    const mp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'X-Card-Validation': 'card_validation',
        'X-Idempotency-Key': 'zda-sandbox-' + Date.now()
      },
      body: JSON.stringify({
        token,
        transaction_amount: 0,
        description: 'Zero Dollar Auth sandbox'
      })
    });

    const data = await mp.json();
    return res.status(mp.status).json({
      ok: mp.ok,
      status: data.status || null,
      status_detail: data.status_detail || null,
      payment_method_id: data.payment_method_id || null,
      transaction_amount: data.transaction_amount ?? 0,
      live_mode: data.live_mode ?? null,
      error: mp.ok ? null : (data.message || data.error || 'mercado_pago_error')
    });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', message: String(err) });
  }
};