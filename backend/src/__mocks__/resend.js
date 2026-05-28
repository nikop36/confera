// Auto-mock for resend package — not installed in dev/test environment
const Resend = jest.fn().mockImplementation(() => ({
  emails: {
    send: jest.fn().mockResolvedValue({ id: 'mock-email-id' }),
  },
}));

module.exports = { Resend };
