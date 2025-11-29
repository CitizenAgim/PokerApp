// ============================================
// FORM VALIDATION UTILITIES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationRules {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  custom?: (value: string) => ValidationResult;
}

/**
 * Validate a single field
 */
export function validateField(value: string, rules: ValidationRules): ValidationResult {
  const trimmedValue = value.trim();

  // Required check
  if (rules.required && !trimmedValue) {
    return { isValid: false, error: 'This field is required' };
  }

  // Skip other validations if empty and not required
  if (!trimmedValue && !rules.required) {
    return { isValid: true };
  }

  // Min length
  if (rules.minLength && trimmedValue.length < rules.minLength) {
    return { 
      isValid: false, 
      error: `Must be at least ${rules.minLength} characters` 
    };
  }

  // Max length
  if (rules.maxLength && trimmedValue.length > rules.maxLength) {
    return { 
      isValid: false, 
      error: `Must be no more than ${rules.maxLength} characters` 
    };
  }

  // Email format
  if (rules.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedValue)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
  }

  // Custom pattern
  if (rules.pattern && !rules.pattern.test(trimmedValue)) {
    return { isValid: false, error: 'Invalid format' };
  }

  // Custom validation
  if (rules.custom) {
    return rules.custom(trimmedValue);
  }

  return { isValid: true };
}

/**
 * Common validators
 */
export const validators = {
  playerName: (value: string): ValidationResult => {
    return validateField(value, {
      required: true,
      minLength: 2,
      maxLength: 50,
    });
  },

  sessionName: (value: string): ValidationResult => {
    return validateField(value, {
      maxLength: 100,
    });
  },

  email: (value: string): ValidationResult => {
    return validateField(value, {
      required: true,
      email: true,
    });
  },

  password: (value: string): ValidationResult => {
    return validateField(value, {
      required: true,
      minLength: 6,
      custom: (v) => {
        if (!/[A-Za-z]/.test(v)) {
          return { isValid: false, error: 'Must contain at least one letter' };
        }
        if (!/[0-9]/.test(v)) {
          return { isValid: false, error: 'Must contain at least one number' };
        }
        return { isValid: true };
      },
    });
  },

  displayName: (value: string): ValidationResult => {
    return validateField(value, {
      required: true,
      minLength: 2,
      maxLength: 30,
    });
  },

  notes: (value: string): ValidationResult => {
    return validateField(value, {
      maxLength: 500,
    });
  },

  stakes: (value: string): ValidationResult => {
    return validateField(value, {
      pattern: /^\d+\/\d+(\/\d+)?$/,
      custom: (v) => {
        if (v && !/^\d+\/\d+(\/\d+)?$/.test(v)) {
          return { 
            isValid: false, 
            error: 'Format should be like 1/2 or 1/2/5' 
          };
        }
        return { isValid: true };
      },
    });
  },
};

/**
 * Validate multiple fields at once
 */
export function validateForm<T extends Record<string, string>>(
  values: T,
  rules: Partial<Record<keyof T, ValidationRules>>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  let isValid = true;

  for (const key of Object.keys(rules) as Array<keyof T>) {
    const rule = rules[key];
    if (rule) {
      const result = validateField(values[key] || '', rule);
      if (!result.isValid) {
        isValid = false;
        errors[key] = result.error;
      }
    }
  }

  return { isValid, errors };
}
