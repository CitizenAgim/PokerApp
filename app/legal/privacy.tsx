import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/legal.styles';
import { ScrollView, Text, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeColors = getThemeColors(isDark);

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.lastUpdated, { color: themeColors.subText }]}>Last Updated: December 30, 2025</Text>

      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        This Privacy Policy describes how your personal information is collected, used, and shared when you use the Poker Range Manager application ("the App").
      </Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>1. Information We Collect</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        When you use the App, we collect the following types of information:
      </Text>
      <Text style={[styles.subheading, { color: themeColors.subheading }]}>Account Information</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        When you create an account, we collect your email address. If you sign up using a third-party service (like Google), we collect the authentication token provided by that service.
      </Text>
      <Text style={[styles.subheading, { color: themeColors.subheading }]}>User Content</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        We store the data you input into the App, including poker hand ranges, player notes, and session data. This data is stored securely on our servers (Google Firebase) to allow you to access it across multiple devices.
      </Text>
      <Text style={[styles.subheading, { color: themeColors.subheading }]}>Usage Data</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        We may collect anonymous usage data to help us improve the App, such as crash reports and performance metrics.
      </Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>2. How We Use Your Information</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        We use the information we collect to:
      </Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Provide, operate, and maintain the App;</Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Create and manage your account;</Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Sync your data across your devices;</Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Improve, personalize, and expand the App;</Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Detect and prevent fraud.</Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>3. Data Storage and Security</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        Your data is stored on Google Firebase servers. We implement reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
      </Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>4. Sharing Your Information</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        We do not sell, trade, or rent your personal identification information to others. We do not share your User Content with third parties, except as necessary to provide the service (e.g., cloud hosting providers) or as required by law.
      </Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>5. Your Rights</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        You have the right to:
      </Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Access the personal information we hold about you;</Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Request that we correct any inaccuracies;</Text>
      <Text style={[styles.bullet, { color: themeColors.subText }]}>• Request deletion of your account and all associated data.</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        You can delete your account and all data directly within the App settings or by contacting us.
      </Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>6. Age Restriction</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        The App is intended for use by individuals aged 18 and older (or the legal age of majority in your jurisdiction). We do not knowingly collect personal information from individuals under the age of 18. By using the App, you represent that you are at least 18 years of age.
      </Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>7. Changes to This Privacy Policy</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
      </Text>

      <Text style={[styles.heading, { color: themeColors.heading }]}>8. Contact Us</Text>
      <Text style={[styles.paragraph, { color: themeColors.subText }]}>
        If you have questions or comments about this Privacy Policy, please contact us.
      </Text>
      
      <View style={styles.footer} />
    </ScrollView>
  );
}
