const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

function generatePassword(email) {
  // Create a deterministic but unique password from email
  // Format: OpWell-{hash}-{email-prefix}
  const hash = crypto.createHash('sha256').update(email + 'opwell-concierge').digest('hex').substring(0, 8).toUpperCase();
  const emailPrefix = email.split('@')[0].substring(0, 3).toUpperCase();
  return `${hash}${emailPrefix}`;
}

async function createPasswordProtectedPDF(email) {
  try {
    const pdfPath = path.join(__dirname, '../OpWell-Surgery-Prep-Masterclass.pdf');
    const password = generatePassword(email);

    // Check if qpdf is available on the system
    try {
      execSync('which qpdf', { stdio: 'pipe' });

      // qpdf is available - use it to encrypt
      const tempOutputPath = path.join('/tmp', `masterclass-${Date.now()}.pdf`);

      execSync(`qpdf --encrypt "${password}" "${password}" 40 -- "${pdfPath}" "${tempOutputPath}"`, {
        stdio: 'pipe'
      });

      const encryptedPDF = fs.readFileSync(tempOutputPath);

      // Clean up temp file
      try {
        fs.unlinkSync(tempOutputPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      return {
        pdf: encryptedPDF,
        password: password,
        success: true
      };
    } catch (qpdfError) {
      console.log('⚠️ qpdf not available, using fallback approach');

      // Fallback: Read the PDF as-is and return password separately
      // The email will explain to use password to unlock
      const pdf = fs.readFileSync(pdfPath);
      return {
        pdf: pdf,
        password: password,
        success: false,
        note: 'PDF returned unencrypted. Use password for access control.'
      };
    }
  } catch (error) {
    console.error('❌ PDF encryption error:', error.message);
    return {
      pdf: null,
      password: null,
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  createPasswordProtectedPDF,
  generatePassword
};
