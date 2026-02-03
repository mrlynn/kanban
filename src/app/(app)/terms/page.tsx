import { Box, Container, Typography, Paper } from '@mui/material';

export const metadata = {
  title: 'Terms of Service - Moltboard',
  description: 'Moltboard terms of service and usage agreement',
};

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom>
          Terms of Service
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: January 31, 2026
        </Typography>

        <Typography paragraph>
          By accessing and using Moltboard (&quot;Service&quot;), you agree to be bound by these
          Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not
          use the Service.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          1. Acceptance of Terms
        </Typography>
        <Typography paragraph>
          These Terms constitute a legally binding agreement between you and Moltboard.
          By creating an account or using the Service, you acknowledge that you have read,
          understood, and agree to be bound by these Terms.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          2. Description of Service
        </Typography>
        <Typography paragraph>
          Moltboard is a task management platform powered by AI. The Service includes:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Task boards and project management features</li>
          <li>AI-powered assistant using Anthropic Claude</li>
          <li>Collaboration and sharing capabilities</li>
          <li>Integration with third-party services</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          3. User Accounts
        </Typography>
        <Typography paragraph>
          To use Moltboard, you must:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Be at least 13 years of age</li>
          <li>Provide accurate and complete registration information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Notify us immediately of any unauthorized account access</li>
          <li>Be responsible for all activities under your account</li>
        </Box>
        <Typography paragraph>
          We reserve the right to suspend or terminate accounts that violate these Terms.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          4. Acceptable Use Policy
        </Typography>
        <Typography paragraph>
          You agree NOT to use Moltboard to:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Violate any laws or regulations</li>
          <li>Infringe on intellectual property rights</li>
          <li>Transmit malware, viruses, or harmful code</li>
          <li>Harass, abuse, or harm other users</li>
          <li>Spam, phish, or engage in fraudulent activities</li>
          <li>Attempt to gain unauthorized access to systems</li>
          <li>Reverse engineer or decompile the Service</li>
          <li>Scrape or collect data without permission</li>
          <li>Use the Service for illegal or unethical purposes</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          5. AI Usage
        </Typography>
        <Typography paragraph>
          When using the AI assistant:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>AI responses are generated using Anthropic Claude</li>
          <li>Responses may not always be accurate or complete</li>
          <li>You are responsible for verifying AI-generated content</li>
          <li>We do not guarantee specific outcomes from AI interactions</li>
          <li>You retain ownership of your input; we retain rights to improve the AI</li>
          <li>Do not input sensitive or confidential information you do not want processed</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          6. Intellectual Property
        </Typography>
        <Typography paragraph>
          <strong>Your Content:</strong> You retain all rights to the content you create
          (tasks, notes, messages). By using Moltboard, you grant us a license to host,
          store, and process your content to provide the Service.
        </Typography>
        <Typography paragraph>
          <strong>Our Property:</strong> Moltboard&apos;s code, design, features, and branding
          are owned by us and protected by intellectual property laws. You may not copy,
          modify, or redistribute our intellectual property without permission.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          7. Privacy and Data
        </Typography>
        <Typography paragraph>
          Your use of Moltboard is also governed by our Privacy Policy. We collect and
          process data as described in the Privacy Policy. You agree to our data practices
          by using the Service.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          8. Service Availability
        </Typography>
        <Typography paragraph>
          We strive to provide reliable service but do not guarantee:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Uninterrupted access (maintenance and updates may cause downtime)</li>
          <li>Error-free operation</li>
          <li>Data backup or recovery</li>
          <li>Specific uptime percentages</li>
        </Box>
        <Typography paragraph>
          We reserve the right to modify or discontinue the Service at any time.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          9. Pricing and Payments
        </Typography>
        <Typography paragraph>
          Moltboard is currently offered free of charge. We may introduce paid features
          or subscriptions in the future:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>We will provide 30 days notice before charging for previously free features</li>
          <li>Subscription fees are billed in advance and non-refundable</li>
          <li>You can cancel subscriptions at any time</li>
          <li>Price changes will be communicated with 30 days notice</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          10. Disclaimers
        </Typography>
        <Typography paragraph sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties
          of any kind, either express or implied, including but not limited to warranties
          of merchantability, fitness for a particular purpose, or non-infringement.
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>We do not warrant that the Service will be uninterrupted or error-free</li>
          <li>We do not guarantee the accuracy of AI-generated content</li>
          <li>We are not responsible for third-party services or integrations</li>
          <li>You use the Service at your own risk</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          11. Limitation of Liability
        </Typography>
        <Typography paragraph sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
          To the maximum extent permitted by law, Moltboard shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, including
          lost profits, data loss, or business interruption, arising from your use of
          the Service.
        </Typography>
        <Typography paragraph>
          Our total liability shall not exceed the amount you paid us in the past 12 months,
          or $100, whichever is greater.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          12. Indemnification
        </Typography>
        <Typography paragraph>
          You agree to indemnify and hold harmless Moltboard and its affiliates from any
          claims, damages, losses, or expenses (including legal fees) arising from:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Your use of the Service</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any rights of another party</li>
          <li>Content you submit or share</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          13. Termination
        </Typography>
        <Typography paragraph>
          We may suspend or terminate your account if:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>You violate these Terms</li>
          <li>Your account is inactive for 12 consecutive months</li>
          <li>We discontinue the Service</li>
          <li>Required by law or legal process</li>
        </Box>
        <Typography paragraph>
          You may terminate your account at any time from Settings. Upon termination,
          your data will be deleted according to our Privacy Policy.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          14. Changes to Terms
        </Typography>
        <Typography paragraph>
          We reserve the right to modify these Terms at any time. We will notify you of
          material changes via email or in-app notification. Continued use of the Service
          after changes constitutes acceptance of the new Terms.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          15. Governing Law
        </Typography>
        <Typography paragraph>
          These Terms are governed by the laws of the State of Delaware, United States,
          without regard to conflict of law principles. Any disputes shall be resolved
          in the courts of Delaware.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          16. Arbitration Agreement
        </Typography>
        <Typography paragraph>
          Any disputes arising from these Terms or the Service shall be resolved through
          binding arbitration, except that either party may seek injunctive relief in court.
          You waive your right to participate in class action lawsuits.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          17. Export Compliance
        </Typography>
        <Typography paragraph>
          You agree to comply with all export laws and regulations. You may not use or
          export the Service in violation of U.S. export laws or to prohibited countries
          or entities.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          18. Severability
        </Typography>
        <Typography paragraph>
          If any provision of these Terms is found to be unenforceable, the remaining
          provisions will continue in full force and effect.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          19. Entire Agreement
        </Typography>
        <Typography paragraph>
          These Terms, together with the Privacy Policy, constitute the entire agreement
          between you and Moltboard regarding the Service.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          20. Contact Information
        </Typography>
        <Typography paragraph>
          For questions about these Terms, please contact us at:
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography>Email: legal@moltboard.app</Typography>
          <Typography>GitHub: github.com/mrlynn/moltboard</Typography>
          <Typography>Website: moltboard.app</Typography>
        </Box>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            By using Moltboard, you acknowledge that you have read, understood, and agree
            to be bound by these Terms of Service.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
