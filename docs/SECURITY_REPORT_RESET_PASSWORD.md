# Security Analysis: Password Reset Flow

## Question
"How do we prevent someone from resetting someone else's password?"

## Analysis

### 1. The Mechanism
The current implementation uses Firebase Authentication's `sendPasswordResetEmail` method.
- **Action**: This triggers an email to be sent to the address provided.
- **Security Check**: This method **DOES NOT** reset the password. It only sends a **one-time-use, time-limited token** to that email address.

### 2. Can I reset my friend's password?
**No.**
You can *trigger* the email to be sent to them, but you cannot complete the process unless you have access to their email inbox to click the link.

### 3. Attack Vector: Email Enumeration
A common security vulnerability is "Email Enumeration".
- **Scenario**: An attacker enters random emails (or leaked lists) to see if the app replies "User not found" or "Email sent".
- **Risk**: This lets attackers build a list of your actual users.
- **Fix**: The app should respond identically whether the email exists or not.

### 4. Applied Fix
I have updated `app/(auth)/reset-password.tsx` to handle errors more securely.

**Previous Code (Vulnerable to Enumeration):**
```typescript
} else if (error.code === 'auth/user-not-found') {
    errorMessage = 'No user found with that email address.'; // <-- Tells attacker the user doesn't exist
}
```

**New Code (Secure):**
```typescript
} else {
    // Treat "user-not-found" the same as success from the UI perspective
    Alert.alert(
      'Email Sent',
      'If an account exists with this email, we have sent a password reset link.', // <-- Ambiguous
      ...
    );
}
```

This ensures that an attacker cannot determine if an account exists by trying to reset its password.
