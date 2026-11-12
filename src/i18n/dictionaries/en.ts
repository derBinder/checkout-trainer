import type { Dictionary } from "./de";

/** Englisches Wörterbuch: britisches Englisch, Fachbegriffe nach dem Glossar. */
import type { Reason } from "@/lib/darts/cards";
import type { VerdictDetail } from "@/lib/darts/judge";
import type { IntervalLabel } from "@/lib/srs/fsrs";
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
    cancel: "Cancel",
    close: "Close",
    percent: (n: number | string) => `${n}%`,
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
    metaTitle: "Study",
    closeLabel: "End studying",
    card: {
      score: "Score",
      scoreWas: (rest: number) => `Score was ${rest}`,
      scoreOf: (rest: number) => `Score ${rest}`,
      newScore: "New score",
      notCheckable: "No checkout",
      missHint: (aimed: string, field: string) => `Aimed at ${aimed}, hit: single ${field}`,
      why: "Why",
      setupShot: "Setup shot",
      alternative: "Alternative",
      alternatives: "Alternatives",
      or: "or",
      twoDarts: "With 2 darts",
      only: (hit: string) => `Only ${hit}`,
      setUp: (text: string) => `Set up: ${text}`,
      setupShort: (throws: string, leaves: number) => `${throws}, ${leaves} left`,
      afterwards: (leaves: number) => `Then ${leaves} left`,
      bogeySetup: (leaves: number) => `No checkout. Set up ${leaves}.`,
    },
    result: {
      yourRoute: "Your route",
      bestRoute: "Best route",
      setupShot: "Setup shot",
      notCheckable: "No checkout",
    },
    verdict: {
      codes: {
        best: { title: "Best route", note: "spot on" },
        alternative: { title: "Alternative", note: "also correct" },
        notRecommended: { title: "Works, but not recommended", note: "The checkout is right, the route is worse" },
        noCheckout: { title: "Does not check out", note: "The route does not lead to a finish" },
        checkable: { title: "Can be checked out", note: "There is a route" },
        bogeyRight: { title: "Correct", note: "No checkout from this score" },
        setupRight: { title: "Correct setup shot", note: "spot on" },
        setupOther: { title: "Different setup shot", note: "recommended one below" },
      },
      detail: (d: VerdictDetail): string => {
        switch (d.kind) {
          case "total":
            return `Adds up to ${d.total}, not ${d.rest}`;
          case "notDouble":
            return "The last dart is not a double";
          case "notCheckable":
            return "No checkout from this score";
        }
      },
    },
    slots: { darts: "Darts", open: "empty", miss: "miss" },
    pad: {
      ring: "Ring",
      rings: { S: "Single", D: "Double", T: "Treble" },
      singleBull: "Single bull 25",
      deleteLast: "Delete last dart",
    },
    question: {
      notCheckable: "No checkout",
      check: "Check",
      reveal: "Reveal without answering",
    },
    interval: (l: IntervalLabel): string => {
      switch (l.unit) {
        case "now":
          return "now";
        case "underMinute":
          return "< 1 min";
        case "minutes":
          return `${l.value} min`;
        case "hours":
          return `${l.value} h`;
        case "days":
          return l.value === 1 ? "1 day" : `${l.value} days`;
        case "months":
          return l.value === 1 ? "1 month" : `${l.value} months`;
        case "years":
          return l.value === 1 ? "1 year" : `${l.value} years`;
      }
    },
    session: {
      ratings: { 1: "Again", 2: "Hard", 3: "Good", 4: "Easy" },
      progress: "Progress",
      progressText: (done: number, total: number) => `${done} of ${total} cards studied`,
      confirmClose: "Not everything is saved yet. Close anyway?",
      saveFailed: "Not saved, trying again",
      skipped: (n: number) => (n === 1 ? "One rating was not counted." : `${n} ratings were not counted.`),
      signedOut: "You have been signed out.",
      notSaved: (n: number) => (n === 1 ? "1 rating was not saved." : `${n} ratings were not saved.`),
      toSignIn: "Sign in",
      finished: "Done",
      cardsStudied: (n: number) => `${n === 1 ? "1 card" : `${n} cards`} studied.`,
      toOverview: "Back to overview",
      retry: "Try again",
      saving: "Saving …",
      loadFailed: "The study session could not be loaded.",
    },
  },
  nav: {
    label: "Main navigation",
    today: "Today",
    stats: "Stats",
    settings: "Settings",
    admin: "Admin",
  },
  streak: {
    label: (n: number) => `${n}-day streak`,
    sample: "00-day streak",
  },
  home: {
    intro:
      "Learn the checkout routes from 170 downwards with flashcards that come back at growing intervals. You also practise what comes next when you hit the single instead of the treble.",
    signUp: "Sign up",
    signIn: "Sign in",
  },
  legal: {
    imprint: "Imprint",
    privacy: "Privacy",
    placeholder: "The operator will add this text.",
    toHome: "Back to the start page",
  },
  errors: {
    title: "That did not work.",
    description: "The page could not be loaded. Please try again in a moment.",
    retry: "Try again",
    toOverview: "Back to overview",
    metaTitle: "Error",
    notFound: {
      title: "Page not found",
      description: "There is no page at this address.",
      toHome: "Back to the start page",
    },
  },
  today: {
    due: "due",
    new: "new",
    done: "You are done for today.",
    allStarted: "You have started every card.",
    learn: "Study",
    moreCards: "Study 5 more cards",
    preparing: "Preparing cards …",
    progress: (started: number, total: number, known: number) =>
      `${started} of ${total} started, ${known} known`,
    progressSample: "00 of 169 started, 00 known",
    moreCardsErrors: {
      auth: "Please sign in again.",
      inactive: "Your account has not been approved.",
      notDone: "There are still cards waiting for you. Reload the page.",
      allIntroduced: "You have started every card.",
      cap: "No more cards are possible today. Carry on tomorrow.",
    },
  },
  stats: {
    levels: { known: "known", learning: "learning", new: "new" },
    gridLabel: "All scores from 2 to 170",
    bogey: "no checkout",
    weak: "difficult",
    hardest: "Hardest",
    againCount: (n: number) => `${n}× “Again”`,
    levelOf: (level: string) => `Level: ${level}`,
  },
  settings: {
    appearance: "Appearance",
    theme: { system: "System", light: "Light", dark: "Dark" },
    amount: "Study amount",
    newPerDay: {
      label: "New cards per day",
      hint: (max: number) => `From 0 to ${max}. Cards that are due always come on top.`,
      save: "Save",
      saved: "Saved.",
    },
    password: {
      title: "Change password",
      current: "Current password",
      new: "New password",
      submit: "Change password",
      changed: "Password changed. Other devices are signed out.",
    },
    deleteAccount: {
      title: "Delete account",
      question: "Delete account?",
      description:
        "Your account and all your progress will be deleted for good. This cannot be undone.",
      password: "Password to confirm",
      confirm: "Delete for good",
      noConnection: "No connection. Your account has not been deleted.",
    },
  },
  admin: {
    status: { pending: "pending", active: "active", blocked: "blocked" },
    registered: (date: string) => `registered on ${date}`,
    metaSample: "status · registered on 00 Mon 0000",
    operatorAccount: "Operator account",
    approve: "Approve",
    unblock: "Unblock",
    block: "Block",
    setPassword: "Set password",
    failed: "That did not work. Reload the page and try again.",
    passwordFor: (name: string) => `Set password for ${name}`,
    passwordDescription:
      "All of the user's sessions will be ended. Give the new password to the user in person.",
    newPassword: "New password",
    notSet: "The password was not set.",
    notSetNoConnection: "No connection. The password was not set.",
    passwordSet: "Password set. All of the user's sessions have ended.",
  },
  language: {
    label: "Language",
    names: { de: "Deutsch", en: "English" },
    short: { de: "DE", en: "EN" },
  },
};
