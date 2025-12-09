import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TermsOfServiceScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.lastUpdated}>Last Updated: December 9, 2025</Text>

      <Text style={styles.paragraph}>
        Please read these Terms of Service ("Terms") carefully before using the Poker Range Manager application ("the App") operated by us.
      </Text>

      <Text style={styles.heading}>1. Acceptance of Terms</Text>
      <Text style={styles.paragraph}>
        By accessing or using the App, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the App.
      </Text>

      <Text style={styles.heading}>2. Description of Service</Text>
      <Text style={styles.paragraph}>
        The App is a personal utility tool designed to help poker players manage their hand ranges, player notes, and session data. The App is provided for personal, non-commercial use.
      </Text>

      <Text style={styles.heading}>3. User Accounts</Text>
      <Text style={styles.paragraph}>
        When you create an account with us, you must provide information that is accurate, complete, and current. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
      </Text>
      <Text style={styles.paragraph}>
        You are responsible for safeguarding the password that you use to access the App and for any activities or actions under your password.
      </Text>

      <Text style={styles.heading}>4. User Content</Text>
      <Text style={styles.paragraph}>
        Our App allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the App, including its legality, reliability, and appropriateness.
      </Text>
      <Text style={styles.paragraph}>
        By posting Content to the App, you grant us the right and license to use, modify, perform, display, reproduce, and distribute such Content on and through the App solely for the purpose of providing the service to you. You retain any and all of your rights to any Content you submit, post or display on or through the App and you are responsible for protecting those rights.
      </Text>
      <Text style={styles.paragraph}>
        You represent and warrant that: (i) the Content is yours (you own it) or you have the right to use it and grant us the rights and license as provided in these Terms, and (ii) the posting of your Content on or through the App does not violate the privacy rights, publicity rights, copyrights, contract rights or any other rights of any person.
      </Text>

      <Text style={styles.heading}>5. Intellectual Property</Text>
      <Text style={styles.paragraph}>
        The App and its original content (excluding Content provided by users), features and functionality are and will remain the exclusive property of the App developers and its licensors. The App is protected by copyright, trademark, and other laws.
      </Text>

      <Text style={styles.heading}>6. Termination</Text>
      <Text style={styles.paragraph}>
        We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the App will immediately cease.
      </Text>

      <Text style={styles.heading}>7. Limitation of Liability</Text>
      <Text style={styles.paragraph}>
        In no event shall the App developers, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the App; (ii) any conduct or content of any third party on the App; (iii) any content obtained from the App; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory, whether or not we have been informed of the possibility of such damage.
      </Text>

      <Text style={styles.heading}>8. Disclaimer</Text>
      <Text style={styles.paragraph}>
        Your use of the App is at your sole risk. The App is provided on an "AS IS" and "AS AVAILABLE" basis. The App is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
      </Text>

      <Text style={styles.heading}>9. Changes</Text>
      <Text style={styles.paragraph}>
        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our App after those revisions become effective, you agree to be bound by the revised terms.
      </Text>

      <Text style={styles.heading}>10. Contact Us</Text>
      <Text style={styles.paragraph}>
        If you have any questions about these Terms, please contact us.
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
  paragraph: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 10,
  },
  footer: {
    height: 40,
  },
});
