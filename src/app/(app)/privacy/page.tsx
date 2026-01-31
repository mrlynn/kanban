import { Box, Container, Typography, Paper } from '@mui/material';

export const metadata = {
  title: 'Privacy Policy - Moltboard',
  description: 'Moltboard privacy policy and data handling practices',
};

export default function PrivacyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: 4 }}>
        <Typography variant="h3" gutterBottom>
          Privacy Policy
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Last updated: January 31, 2026
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          1. Information We Collect
        </Typography>
        <Typography paragraph>
          Moltboard collects and processes the following information:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>
            <strong>Account Information:</strong> When you sign in using GitHub or Google OAuth,
            we collect your email address and basic profile information.
          </li>
          <li>
            <strong>Task Data:</strong> Tasks, boards, labels, descriptions, and other content
            you create within Moltboard.
          </li>
          <li>
            <strong>Chat Messages:</strong> Messages you send to Moltbot and responses generated
            by the AI assistant.
          </li>
          <li>
            <strong>Usage Data:</strong> Activity logs, timestamps, and interaction patterns to
            improve the service.
          </li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          2. How We Use Your Information
        </Typography>
        <Typography paragraph>
          We use your information to:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Provide and maintain the Moltboard service</li>
          <li>Generate AI-powered insights and assistance through Moltbot</li>
          <li>Personalize your experience based on your preferences</li>
          <li>Improve and optimize our features and performance</li>
          <li>Send important service updates and notifications</li>
          <li>Detect and prevent fraudulent or unauthorized use</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          3. AI Processing and Moltbot
        </Typography>
        <Typography paragraph>
          Moltbot is powered by Claude (Anthropic AI). When you interact with Moltbot:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Your messages and task context are sent to Anthropic&apos;s API for processing</li>
          <li>Anthropic processes this data according to their privacy policy</li>
          <li>We store chat history in our database to maintain conversation context</li>
          <li>You can delete chat messages at any time from the chat panel</li>
          <li>You can disable Moltbot&apos;s memory feature in Settings</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          4. Data Storage and Security
        </Typography>
        <Typography paragraph>
          Your data is stored securely:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>All data is stored in MongoDB Atlas with encryption at rest</li>
          <li>Connections use TLS/SSL encryption in transit</li>
          <li>Access is restricted to authorized personnel only</li>
          <li>Regular security audits and updates are performed</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          5. Third-Party Services
        </Typography>
        <Typography paragraph>
          Moltboard integrates with third-party services:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li><strong>GitHub OAuth:</strong> For authentication (privacy policy at github.com)</li>
          <li><strong>Google OAuth:</strong> For authentication (privacy policy at google.com)</li>
          <li><strong>Anthropic Claude:</strong> For AI assistance (privacy policy at anthropic.com)</li>
          <li><strong>MongoDB Atlas:</strong> For data storage (privacy policy at mongodb.com)</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          6. Your Data Rights
        </Typography>
        <Typography paragraph>
          You have the right to:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Access your personal data at any time</li>
          <li>Delete your chat messages and task history</li>
          <li>Export your data in JSON format</li>
          <li>Request account deletion and complete data removal</li>
          <li>Opt out of AI memory features in Settings</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          7. Data Retention
        </Typography>
        <Typography paragraph>
          We retain your data as follows:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Active tasks and boards: Stored indefinitely until you delete them</li>
          <li>Chat history: Stored until you delete messages or clear memory</li>
          <li>Account data: Retained until you request account deletion</li>
          <li>Deleted data: Permanently removed within 30 days</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          8. Cookies and Tracking
        </Typography>
        <Typography paragraph>
          Moltboard uses minimal cookies:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Session cookies for authentication (required)</li>
          <li>Preference cookies for settings (optional)</li>
          <li>No third-party advertising or tracking cookies</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          9. Children&apos;s Privacy
        </Typography>
        <Typography paragraph>
          Moltboard is not intended for users under 13 years of age. We do not
          knowingly collect personal information from children under 13. If you
          believe we have collected such information, please contact us immediately.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          10. Changes to This Policy
        </Typography>
        <Typography paragraph>
          We may update this privacy policy from time to time. We will notify you
          of any changes by posting the new policy on this page and updating the
          &quot;Last updated&quot; date.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          11. Contact Us
        </Typography>
        <Typography paragraph>
          If you have questions about this privacy policy or your data, please contact us at:
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Typography>Email: privacy@moltboard.app</Typography>
          <Typography>GitHub: github.com/mrlynn/moltboard</Typography>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          12. GDPR Compliance (EU Users)
        </Typography>
        <Typography paragraph>
          If you are located in the European Union:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>We process your data based on your consent and legitimate interest</li>
          <li>You have the right to data portability and erasure</li>
          <li>You can withdraw consent at any time</li>
          <li>You have the right to lodge a complaint with a supervisory authority</li>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          13. California Privacy Rights (CCPA)
        </Typography>
        <Typography paragraph>
          California residents have additional rights:
        </Typography>
        <Box component="ul" sx={{ mb: 3 }}>
          <li>Right to know what personal information is collected</li>
          <li>Right to delete personal information</li>
          <li>Right to opt-out of sale of personal information (we do not sell data)</li>
          <li>Right to non-discrimination for exercising privacy rights</li>
        </Box>
      </Paper>
    </Container>
  );
}
