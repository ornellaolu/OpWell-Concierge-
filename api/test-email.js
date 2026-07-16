const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  try {
    console.log('🧪 Testing Resend email configuration...');

    const apiKey = process.env.RESEND_API_KEY;
    console.log('API Key present:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    console.log('API Key starts with:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'RESEND_API_KEY environment variable is NOT configured in Vercel',
        details: 'This is why emails are not being sent. You must add RESEND_API_KEY to Vercel environment variables.'
      });
    }

    const resend = new Resend(apiKey);

    console.log('📧 Sending test email...');
    const result = await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject: '🧪 Resend Email Test - If you see this, email is working!',
      html: '<p>Test email from Resend configuration check.</p>'
    });

    console.log('✅ Email sent successfully:', result);
    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully!',
      result: result
    });

  } catch (err) {
    console.error('❌ Email test FAILED:', {
      message: err.message,
      code: err.code,
      status: err.status,
      stack: err.stack
    });

    return res.status(500).json({
      success: false,
      error: err.message,
      code: err.code,
      status: err.status,
      details: 'Email service configuration failed. Check Vercel logs for details.'
    });
  }
};
