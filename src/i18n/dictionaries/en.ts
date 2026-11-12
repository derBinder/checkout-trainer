import type { Dictionary } from "./de";

/** Englisches Wörterbuch: britisches Englisch, Fachbegriffe nach dem Glossar. */
import type { Reason } from "@/lib/darts/cards";
import {
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/constants";
import { MAX_NEW_PER_DAY } from "@/lib/settings";

export const en: Dictionary = {
  common: {
    appName: "Checkout-Trainer",
    titleSuffix: " · Checkout-Trainer",
    description: "Learn darts checkout routes with flashcards.",
  },
  validation: {
    nameRequired: "Please enter a name.",
    nameTooLong: `The name can be at most ${MAX_NAME_LENGTH} characters long.`,
    nameInvalid: "The name contains characters that are not allowed.",
    emailRequired: "Please enter your email address.",
    emailTooLong: "The email address is too long.",
    emailInvalid: "That is not a valid email address, for example name@example.com.",
    passwordRequired: "Please enter a password.",
    currentPasswordRequired: "Please enter your current password.",
    passwordTooShort: `The password needs at least ${MIN_PASSWORD_LENGTH} characters.`,
    passwordTooLong: `The password can be at most ${MAX_PASSWORD_LENGTH} characters long.`,
    newPerDayInvalid: `Enter a whole number from 0 to ${MAX_NEW_PER_DAY}.`,
    invalid: "Invalid input.",
  },
  auth: {
    errors: {
      operatorEmail: "This email address cannot be registered.",
      signUpClosed: "Sign-up is not possible at the moment.",
      blocked: "This account is blocked.",
      operatorDelete: "The operator account cannot be deleted.",
      nameRequired: "Please enter a name.",
      nameTooLong: `The name can be at most ${MAX_NAME_LENGTH} characters long.`,
      nameInvalid: "The name contains characters that are not allowed.",
      emailTooLong: "The email address is too long.",
      imageNotAllowed: "A profile picture is not supported.",
      passwordRequired: "Please enter your password.",
    },
    byCode: {
      USER_ALREADY_EXISTS: "There is already an account with this email address.",
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
        "There is already an account with this email address.",
      INVALID_EMAIL_OR_PASSWORD: "The email address or password is wrong.",
      INVALID_EMAIL: "This email address is not valid.",
      PASSWORD_TOO_SHORT: "The password is too short.",
      PASSWORD_TOO_LONG: "The password is too long.",
      INVALID_PASSWORD: "The password is wrong.",
      CREDENTIAL_ACCOUNT_NOT_FOUND: "This account has no password.",
      SESSION_EXPIRED: "Your session is too old. Please sign in again.",
    },
    tooManyAttempts: "Too many attempts. Wait a few minutes and try again.",
    fallback: "That did not work. Please try again.",
    noConnection: "No connection. Please try again.",
    signOut: "Sign out",
    signOutNoConnection: "No connection. You are still signed in.",
  },
  form: {
    showPassword: "Show password",
    hidePassword: "Hide password",
    strength: {
      prefix: "Strength: ",
      levels: { 0: "Weak", 1: "Fair", 2: "Good", 3: "Strong" },
      minimum: (min) => `At least ${min} characters.`,
      remaining: (count) =>
        `${count} more ${count === 1 ? "character" : "characters"} to the minimum.`,
      stronger: "Longer or more varied is stronger.",
    },
  },
  signIn: {
    metaTitle: "Sign in",
    title: "Sign in",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    forgotPassword:
      "Forgotten your password? Ask the operator, who will set a new one for you.",
    noAccount: "No account yet?",
    signUpLink: "Sign up",
  },
  signUp: {
    metaTitle: "Sign up",
    title: "Sign up",
    name: "Name",
    email: "Email",
    password: "Password",
    submit: "Sign up",
    haveAccount: "Already have an account?",
    signInLink: "Sign in",
  },
  pending: {
    metaTitle: "Approval",
    blocked: "Your account is blocked.",
    waiting: "Your account is waiting for approval by the operator.",
  },
  study: {
    reason: (r: Reason): string => {
      switch (r.kind) {
        case "only":
          return "The only route.";
        case "direct":
          return "Straight at the double.";
        case "split":
          return `Aim between ${r.a} and ${r.b}: either one leaves a double.`;
        case "singleFinish":
          return r.bull
            ? `A single ${r.field} still leaves the bull.`
            : `A single ${r.field} still leaves a finish.`;
        case "halving":
          return `Ends on ${r.double}, which splits down ${["", "once", "twice", "three times", "four times"][r.times]}.`;
        case "chart":
          return "The usual chart route.";
      }
    },
  },
  language: {
    label: "Language",
    names: { de: "Deutsch", en: "English" },
    short: { de: "DE", en: "EN" },
  },
};
