import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import React from 'react';
import { Alert } from 'react-native';
import ResetPasswordScreen from '../reset-password';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock dependencies
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  initializeAuth: jest.fn(),
  getReactNativePersistence: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  auth: {},
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

// Spy on Alert
jest.spyOn(Alert, 'alert');

describe('ResetPasswordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<ResetPasswordScreen />);
    
    expect(getByText('Reset Password')).toBeTruthy();
    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByText('Send Reset Link')).toBeTruthy();
  });

  it('shows error if email is empty', () => {
    const { getByText } = render(<ResetPasswordScreen />);
    
    const button = getByText('Send Reset Link');
    fireEvent.press(button);
    
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter your email address');
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('calls sendPasswordResetEmail with correct email', async () => {
    const { getByPlaceholderText, getByText } = render(<ResetPasswordScreen />);
    
    const emailInput = getByPlaceholderText('Email');
    fireEvent.changeText(emailInput, 'test@example.com');
    
    (sendPasswordResetEmail as jest.Mock).mockResolvedValueOnce(undefined);

    const button = getByText('Send Reset Link');
    fireEvent.press(button);
    
    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'test@example.com');
    });
    
    expect(Alert.alert).toHaveBeenCalledWith(
      'Email Sent',
      expect.stringContaining('Check your email'),
      expect.any(Array)
    );
  });

  it('handles firebase errors correctly', async () => {
    const { getByPlaceholderText, getByText } = render(<ResetPasswordScreen />);
    
    const emailInput = getByPlaceholderText('Email');
    fireEvent.changeText(emailInput, 'invalid@email');
    
    const error = { code: 'auth/invalid-email', message: 'Invalid email' };
    (sendPasswordResetEmail as jest.Mock).mockRejectedValueOnce(error);

    const button = getByText('Send Reset Link');
    fireEvent.press(button);
    
    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
    
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'That email address is invalid.');
  });
});
