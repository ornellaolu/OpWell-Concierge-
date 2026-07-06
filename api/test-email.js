const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    console.log('=== EMAIL TEST DEBUG ===');
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey?.length);
    console.log('API Key starts with:', apiKey?.substring(0, 10));

    if (!apiKey) {
      return res.status(400).json({
        error: 'RESEND_API_KEY not set in environment',
        message: 'Please add RESEND_API_KEY to Vercel environment variables'
      });
    }

    const resend = new Resend(apiKey);

    console.log('Attempting to send test email...');
    const response = await resend.emails.send({
      from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject: '🧪 OpWell Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>OpWell Email Test</h2>
          <p>If you're reading this, emails are working!</p>
          <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          <hr>
          <p style="font-size: 12px; color: #666;">
            This is a test email from OpWell Concierge.<br>
            If you received this, the Resend integration is working correctly.
          </p>
        </div>
      `
    });

    console.log('✅ Email response:', response);

    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      response: response
    });

  } catch (err) {
    console.error('❌ Email error:', {
      message: err.message,
      code: err.code,
      status: err.statusCode,
      response: err.response,
      stack: err.stack
    });

    return res.status(500).json({
      error: 'Failed to send test email',
      details: {
        message: err.message,
        code: err.code,
        status: err.statusCode
      }
    });
  }
};
