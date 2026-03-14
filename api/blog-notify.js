const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Blog posts mapped to service categories
// Categories: surgical, labor, mental, executive, all
const BLOG_CATEGORIES = {
  'blog-1':  { title: 'How to Prepare for Surgery', categories: ['surgical', 'executive'] },
  'blog-2':  { title: 'What Your Anesthesiologist Wants You to Know', categories: ['surgical', 'executive'] },
  'blog-3':  { title: 'Understanding Anesthesia Types', categories: ['surgical', 'labor', 'executive'] },
  'blog-11': { title: 'Navigating Medical Tourism Safely', categories: ['surgical'] },
  'blog-13': { title: 'Surgery Anxiety — What to Know', categories: ['surgical', 'mental'] },
  'blog-24': { title: 'Post-Op Nutrition & Wound Healing', categories: ['surgical', 'executive'] },
  'blog-25': { title: 'Post-Op Nutrition Quick Reference', categories: ['surgical', 'executive'] },
  'blog-26': { title: 'BBL — Higher-Risk Procedure Explainer', categories: ['surgical'] },
  'blog-29': { title: 'Why Your Anesthesiologist May Be the Most Important Doctor', categories: ['labor'] },
  'blog-30': { title: 'Guide to Bariatric Surgery', categories: ['surgical', 'executive'] },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { blogId, title, teaser, category, adminKey } = req.body;

    // Simple admin auth to prevent unauthorized sends
    if (adminKey !== process.env.ADMIN_NOTIFY_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!blogId || !title || !teaser) {
      return res.status(400).json({ error: 'blogId, title, and teaser are required' });
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) {
      return res.status(500).json({ error: 'Audience not configured' });
    }

    // Get all contacts from audience
    const { data: contactsData } = await resend.contacts.list({ audienceId });
    const contacts = contactsData?.data || [];

    if (!contacts.length) {
      return res.status(200).json({ success: true, sent: 0, message: 'No subscribers' });
    }

    const blogUrl = `https://opwellconcierge.com?page=${blogId}`;
    let sent = 0;

    for (const contact of contacts) {
      if (contact.unsubscribed) continue;

      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'there';

      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: contact.email,
        subject: `New from OpWell: ${esc(title)}`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
              <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
              <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">CLINICAL LIBRARY</p>
            </div>

            <div style="background: #fdf8f4; padding: 40px;">
              <p style="color: #555; line-height: 1.7;">Hi ${esc(name)},</p>
              <p style="color: #555; line-height: 1.7;">We just published a new article in our Clinical Library that we think you\u2019ll find helpful:</p>

              <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h2 style="color: #3b2a1a; font-size: 1.2rem; margin-top: 0;">${esc(title)}</h2>
                <p style="color: #555; line-height: 1.7; margin-bottom: 20px;">${esc(teaser)}</p>
                <a href="${blogUrl}" style="display: inline-block; background: #2d5a3d; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">Read Article \u2192</a>
              </div>

              <p style="color: #555; line-height: 1.7;">As an OpWell patient, you have full access to our premium Clinical Library. Use your access code <strong>OPWELL2026</strong> to unlock all patient-only articles.</p>

              <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
            </div>

            <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
              <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
              <p style="color: rgba(232,201,122,0.4); font-size: 0.7rem; margin: 8px 0 0;">You\u2019re receiving this because you\u2019re an OpWell Concierge patient.</p>
            </div>
          </div>
        `,
      });
      sent++;
    }

    return res.status(200).json({ success: true, sent });
  } catch (err) {
    console.error('Blog notification error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
