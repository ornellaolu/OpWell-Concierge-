const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Blog recommendations by service category
const BLOG_RECS = {
  surgical: [
    { title: 'How to Prepare for Surgery', url: 'https://opwellconcierge.com?page=blog-1' },
    { title: 'Post-Op Nutrition & Wound Healing', url: 'https://opwellconcierge.com?page=blog-24' },
    { title: 'What Your Anesthesiologist Wants You to Know', url: 'https://opwellconcierge.com?page=blog-2' },
  ],
  labor: [
    { title: 'Why Your Anesthesiologist May Be the Most Important Doctor', url: 'https://opwellconcierge.com?page=blog-29' },
    { title: 'How to Prepare for Surgery', url: 'https://opwellconcierge.com?page=blog-1' },
  ],
  mental: [
    { title: 'How to Prepare for Surgery', url: 'https://opwellconcierge.com?page=blog-1' },
    { title: 'What Your Anesthesiologist Wants You to Know', url: 'https://opwellconcierge.com?page=blog-2' },
  ],
};

function getCategory(service) {
  if (!service) return 'surgical';
  const s = service.toLowerCase();
  if (s.includes('labor') || s.includes('delivery') || s.includes('l&d')) return 'labor';
  if (s.includes('mental') || s.includes('wellness')) return 'mental';
  return 'surgical';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, patientName, service, notes } = req.body;

    if (!email || !patientName) {
      return res.status(400).json({ error: 'Email and patient name are required' });
    }

    const category = getCategory(service);
    const blogs = BLOG_RECS[category] || BLOG_RECS.surgical;

    const blogLinksHtml = blogs.map(b =>
      `<li style="margin-bottom: 8px;"><a href="${b.url}" style="color: #b85c2b; text-decoration: none; font-weight: 600;">${esc(b.title)} \u2192</a></li>`
    ).join('');

    await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: email,
      subject: 'Your OpWell Follow-Up \u2014 Resources & Next Steps',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">ANESTHESIOLOGIST-LED TELEHEALTH</p>
          </div>

          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Thank You for Your Consultation</h2>
            <p style="color: #555; line-height: 1.7;">Dear ${esc(patientName)},</p>
            <p style="color: #555; line-height: 1.7;">Thank you for your recent consultation with OpWell Concierge. It was a pleasure supporting you on your medical journey.</p>

            ${notes ? `
            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Your Personalized Notes</h3>
              <p style="margin: 0; color: #555; line-height: 1.7; white-space: pre-wrap;">${esc(notes)}</p>
            </div>
            ` : ''}

            <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #2d5a3d; margin-top: 0; font-size: 1rem;">Recommended Reading</h3>
              <p style="color: #555; font-size: 0.9rem; margin-bottom: 12px;">These articles from our Clinical Library were selected for you:</p>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${blogLinksHtml}
              </ul>
            </div>

            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
              <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">We Value Your Feedback</h3>
              <p style="color: #555; font-size: 0.9rem; margin-bottom: 16px;">Your experience helps us improve. Would you take 2 minutes to share your thoughts?</p>
              <a href="https://opwellconcierge.com?page=contact" style="display: inline-block; background: #2d5a3d; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">Share Your Feedback \u2192</a>
            </div>

            <p style="color: #555; line-height: 1.7;">If you have any follow-up questions, simply reply to this email or call us at <strong>(678) 235-5822</strong>.</p>
            <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
          </div>

          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Follow-up email error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
