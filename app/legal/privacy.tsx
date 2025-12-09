import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.lastUpdated}>Last Updated: December 9, 2025</Text>

      <Text style={styles.paragraph}>
        This Privacy Policy describes how your personal information is collected, used, and shared when you use the Poker Range Manager application ("the App").
      </Text>

      <Text style={styles.heading}>1. Information We Collect</Text>
      <Text style={styles.paragraph}>
        When you use the App, we collect the following types of information:
      </Text>
      <Text style={styles.subheading}>Account Information</Text>
      <Text style={styles.paragraph}>
        When you create an account, we collect your email address. If you sign up using a third-party service (like Google), we collect the authentication token provided by that service.
      </Text>
      <Text style={styles.subheading}>User Content</Text>
      <Text style={styles.paragraph}>
        We store the data you input into the App, including poker hand ranges, player notes, session data, and any images you upload (such as player photos). This data is stored securely on our servers (Google Firebase) to allow you to access it across multiple devices.
      </Text>
      <Text style={styles.subheading}>Usage Data</Text>
      <Text style={styles.paragraph}>
        We may collect anonymous usage data to help us improve the App, such as crash reports and performance metrics.
      </Text>

      <Text style={styles.heading}>2. How We Use Your Information</Text>
      <Text style={styles.paragraph}>
        We use the information we collect to:
      </Text>
      <Text style={styles.bullet}>• Provide, operate, and maintain the App;</Text>
      <Text style={styles.bullet}>• Create and manage your account;</Text>
      <Text style={styles.bullet}>• Sync your data across your devices;</Text>
      <Text style={styles.bullet}>• Improve, personalize, and expand the App;</Text>
      <Text style={styles.bullet}>• Detect and prevent fraud.</Text>

      <Text style={styles.heading}>3. Data Storage and Security</Text>
      <Text style={styles.paragraph}>
        Your data is stored on Google Firebase servers. We implement reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
      </Text>

      <Text style={styles.heading}>4. Sharing Your Information</Text>
      <Text style={styles.paragraph}>
        We do not sell, trade, or rent your personal identification information to others. We do not share your User Content with third parties, except as necessary to provide the service (e.g., cloud hosting providers) or as required by law.
      </Text>

      <Text style={styles.heading}>5. Your Rights</Text>
      <Text style={styles.paragraph}>
        You have the right to:
      </Text>
      <Text style={styles.bullet}>• Access the personal information we hold about you;</Text>
      <Text style={styles.bullet}>• Request that we correct any inaccuracies;</Text>
      <Text style={styles.bullet}>• Request deletion of your account and all associated data.</Text>
      <Text style={styles.paragraph}>
        You can delete your account and all data directly within the App settings or by contacting us.
      </Text>

      <Text style={styles.heading}>6. Children's Privacy</Text>
      <Text style={styles.paragraph}>
        The App is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.
      </Text>

      <Text style={styles.heading}>7. Changes to This Privacy Policy</Text>
      <Text style={styles.paragraph}>
        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
      </Text>

      <Text style={styles.heading}>8. Contact Us</Text>
      <Text style={styles.paragraph}>
        If you have questions or comments about this Privacy Policy, please contact us.
      </Text>
      
      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 10,
    marginBottom: 5,
  },
  paragraph: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
  },
  bullet: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginLeft: 10,
    marginBottom: 5,
  },
  footer: {
    height: 40,
  },
});
