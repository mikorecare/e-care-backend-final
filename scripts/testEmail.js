const sendPasswordResetEmail = require('../utils/email'); // Path to email utility

(async () => {
  try {
    await sendPasswordResetEmail('test-recipient@example.com', 'https://example.com/reset-password/test-token');
    console.log('Test email sent successfully.');
  } catch (error) {
    console.error('Error sending test email:', error);
  }
})();
