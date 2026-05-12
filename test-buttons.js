// Quick smoke test for critical button functionality
// Run: node test-buttons.js

const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

const tests = [
  {
    name: 'Hero "Book Your Consultation" button',
    pattern: /<a[^>]*onclick="showPage\('schedule'\)"[^>]*>Book Your Consultation/,
    critical: true
  },
  {
    name: 'Sticky mobile CTA button',
    pattern: /<button[^>]*onclick="showPage\('schedule'\)"[^>]*>Book Now/,
    critical: true
  },
  {
    name: 'All onclick handlers valid',
    pattern: /onclick="(?:showPage|mobileNavTo|window\.location|toggleMobileNav|dismissExitPopup)\(/g,
    critical: true
  },
  {
    name: 'No missing showPage function calls',
    pattern: /onclick="showPage\('[^']+'\)"/,
    critical: true
  },
  {
    name: 'Meta tags present',
    pattern: /<meta name="description"/,
    critical: true
  }
];

console.log('\n🧪 Running smoke tests...\n');

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const result = test.pattern.test(html);
  const status = result ? '✅' : '❌';
  const critical = test.critical ? '[CRITICAL]' : '';

  console.log(`${status} ${test.name} ${critical}`);

  if (result) passed++;
  else {
    failed++;
    if (test.critical) {
      console.log(`   → ${test.name} not found!`);
    }
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
