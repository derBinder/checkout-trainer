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
    emailInvalid: "That is not a valid email address. A valid one is, for example, name@example.com.",
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
      operatorDelete: "The administrator account cannot be deleted.",
      nameRequired: "Please enter a name.",
      nameTooLong: `The name can be at most ${MAX_NAME_LENGTH} characters long.`,
      nameInvalid: "The name contains characters that are not allowed.",
      emailTooLong: "The email address is too long.",
      imageNotAllowed: "Profile pictures are not supported.",
      passwordRequired: "Please enter your password.",
    },
    byCode: {
      USER_ALREADY_EXISTS: "There is already an account with this email address.",
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
        "There is already an account with this email address.",
      INVALID_EMAIL_OR_PASSWORD: "The email address or password is incorrect.",
      INVALID_EMAIL: "This email address is not valid.",
      PASSWORD_TOO_SHORT: "The password is too short.",
      PASSWORD_TOO_LONG: "The password is too long.",
      INVALID_PASSWORD: "The password is incorrect.",
      CREDENTIAL_ACCOUNT_NOT_FOUND: "This account has no password.",
      SESSION_EXPIRED: "Your session has expired. Please sign in again.",
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
        `${count} more ${count === 1 ? "character" : "characters"} to reach the minimum.`,
      stronger: "A longer or more varied password is stronger.",
    },
  },
  signIn: {
    metaTitle: "Sign in",
    title: "Sign in",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    forgotPassword:
      "Forgotten your password? The administrator will set a new one for you.",
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
    waiting: "Your account is waiting for approval by the administrator.",
  },
  study: {
    reason: (r: Reason): string => {
      switch (r.kind) {
        case "only":
          return "The only route.";
        case "direct":
          return "Straight at the double.";
        case "split":
          return `Aim between ${r.a} and ${r.b}. Either field leaves a double.`;
      }
    },
    metaTitle: "Study",
    closeLabel: "Stop studying",
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
      bogeySetup: (leaves: number) => `Set up ${leaves}.`,
      twoDartsLeft: "2 darts left",
      twoDartsOf: (rest: number) => `${rest} with 2 darts`,
      noFinish: "No finish",
      // Zerlegung: Titel „After T20“, text with the rest and the route it teaches (without route: short).
      after: (first: string) => `After ${first}`,
      breakdown: (after: number, darts: 1 | 2, route?: string) =>
        route ? `${after} with ${darts} ${darts === 1 ? "dart" : "darts"}: ${route}` : `${after} left`,
    },
    result: {
      yourRoute: "Your route",
      bestRoute: "Best route",
      setupShot: "Setup shot",
      notCheckable: "No checkout",
    },
    verdict: {
      codes: {
        best: { title: "Best route" },
        alternative: { title: "Alternative", note: "also correct" },
        notRecommended: { title: "Works, but not recommended", note: "The checkout is right, the route is worse" },
        noCheckout: { title: "Does not check out", note: "The route does not lead to a checkout" },
        checkable: { title: "Checkout possible" },
        bogeyRight: { title: "Correct", note: "No checkout from this score" },
        setupRight: { title: "Correct setup shot" },
        setupOther: { title: "Different setup shot" },
        setupBogey: { title: "Leaves a bogey number", note: "no checkout" },
        setupBust: { title: "Bust", note: "The score stays" },
      },
      detail: (d: VerdictDetail): string => {
        switch (d.kind) {
          case "total":
            return `Adds up to ${d.total}, not ${d.rest}`;
          case "notDouble":
            return "The last dart is not a double";
          case "notCheckable":
            return "No checkout from this score";
          case "leavesBogey":
            return `Leaves ${d.leaves}, no checkout`;
          case "bust":
            return `Scores ${d.total} with ${d.rest} left`;
          case "setupOther":
            switch (d.reason) {
              case "fewerDarts":
                return `${d.leaves} still needs two darts, ${d.bestLeaves} only one`;
              case "noTwoDartFinish":
                return `${d.leaves} cannot be checked out with two darts`;
              case "preferred":
                return `${d.bestDouble} is a preferred double, ${d.double} is not`;
              case "halvings":
                return `${d.bestDouble} can be halved more often than ${d.double}`;
              case "preferredOrder":
                return `${d.bestDouble} ranks above ${d.double}`;
              case "doubleOverBull":
                return "A double is better than the bull";
              case "lowerLeave":
                return `Both need two darts, ${d.bestLeaves} is the lower score`;
              case "triples":
                return "Same score left, but more trebles needed";
              case "onTwenty":
                return "Same score left, but fewer darts at the 20";
              case "equal":
                return "Both setup shots are equally good";
              case "bigFields":
                return "Setup shots go at singles and trebles, not doubles or bull";
            }
        }
      },
    },
    slots: { darts: "Darts", open: "empty", miss: "miss", spent: "used" },
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
      progressText: (done: number, total: number) => `${done} of ${total} ${total === 1 ? "card" : "cards"} studied`,
      confirmClose: "Not everything is saved yet. Close anyway?",
      saveFailed: "Not saved, trying again",
      skipped: (n: number) => (n === 1 ? "One rating was not counted." : `${n} ratings were not counted.`),
      signedOut: "You have been signed out.",
      notSaved: (n: number) => (n === 1 ? "One rating was not saved." : `${n} ratings were not saved.`),
      toSignIn: "Sign in",
      finished: "Done",
      cardsStudied: (n: number) => `${n === 1 ? "1 card" : `${n} cards`} studied.`,
      toOverview: "Back to overview",
      retry: "Try again",
      saving: "Saving…",
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
    days: (n: number) => (n === 1 ? "1 day" : `${n} days`),
    spokenPrefix: "Streak: ",
    spokenPaused: ", paused",
    sample: "00 days",
  },
  home: {
    intro:
      "Learn the checkout routes from 170 downwards with flashcards that come back at increasing intervals. You also practise what comes next when you hit the single instead of the treble.",
    signUp: "Sign up",
    signIn: "Sign in",
  },
  legal: {
    imprint: "Imprint",
    privacy: "Privacy",
    placeholder: "The administrator will add this text.",
    toHome: "Back to the home page",
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
      toHome: "Back to the home page",
    },
  },
  today: {
    due: "due",
    new: "new",
    streakPaused: "Study or practice today to keep your streak going. You can skip one day per week.",
    done: "You are done for today.",
    allStarted: "You have started every card.",
    learn: "Study",
    practice: "Practice",
    moreCards: "Study 5 more cards",
    preparing: "Preparing cards…",
    progress: (started: number, total: number, known: number) =>
      `${started} of ${total} started, ${known} known`,
    progressSample: "00 of 169 started, 00 known",
    moreCardsErrors: {
      auth: "Please sign in again.",
      inactive: "Your account has not been approved yet.",
      notDone: "There are still cards waiting for you. Reload the page.",
      allIntroduced: "You have started every card.",
      cap: "No more cards are possible today. Carry on tomorrow.",
    },
  },
  practice: {
    metaTitle: "Practice",
    title: "Practice",
    exercise: "Exercise",
    exercises: { routes: "Routes", math: "Maths" },
    range: "Range",
    kind: "Card type",
    kinds: { all: "All", ways: "Routes", misses: "Misses", setups: "Setups" },
    roundSize: (round: number, total: number) =>
      total > round ? `${round} of ${total} cards` : total === 1 ? "1 card" : `${total} cards`,
    noRange: "Choose at least one range.",
    noCards: "No cards match this selection.",
    mathIntro: "Ten quick sums before the checkout. What is left after three darts, and is it a bogey number?",
    start: "Start",
    closeLabel: "Stop practising",
    again: "Again",
    next: "Next",
    progressText: (done: number, total: number) => `${done} of ${total} done`,
    roundDone: "Round complete",
    cardsPracticed: (n: number) => `${n === 1 ? "1 card" : `${n} cards`} practised.`,
    anotherRound: "Another round",
    finish: "Done",
    math: {
      question: "What is left?",
      answer: "Your answer",
      deleteLast: "Delete last digit",
      check: "Check",
      right: "Correct",
      rightNote: (rest: number) => `${rest} left`,
      wrong: (rest: number) => `Wrong, ${rest} left`,
      wrongNote: (answer: number) => `not ${answer}`,
      checkable: "Checkout possible, best route",
      bogey: "Bogey number, no checkout",
      score: (right: number, total: number) => `${right} of ${total} correct`,
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
    learnedOn: (date: string) => `learned on ${date}`,
    knownSince: (date: string) => `known since ${date}`,
    dueOn: (date: string) => `due on ${date}`,
    dueToday: "due today",
    forecast: {
      until: (date: string) => `All cards started by ${date}`,
      done: "All cards started",
      none: "New cards per day set to 0",
    },
  },
  settings: {
    appearance: "Appearance",
    theme: { system: "System", light: "Light", dark: "Dark" },
    amount: "Study amount",
    version: (v: string) => `Version ${v}`,
    newPerDay: {
      label: "New cards per day",
      hint: (max: number) => `From 0 to ${max}. Cards due for review are added on top.`,
      save: "Save",
      saved: "Saved.",
    },
    extraCards: {
      title: "Extra cards",
      saved: "Saved.",
      kinds: {
        singleDouble: {
          label: "Single instead of double",
          hint: (n: number) => `${n} cards: double missed, single hit.`,
        },
        neighbours: {
          label: "Neighbouring fields",
          hint: (n: number) => `${n} cards: S1 or S5 instead of T20, S7 or S3 instead of T19.`,
        },
        over170: {
          label: "Scores above 170",
          hint: (n: number) => `${n} cards: setup shot with three darts from 171 to 230.`,
        },
      },
    },
    password: {
      title: "Change password",
      current: "Current password",
      new: "New password",
      submit: "Change password",
      changed: "Password changed. Other devices are signed out.",
    },
    resetProgress: {
      title: "Reset progress",
      hint: "All cards start again from the beginning. Your account and settings stay.",
      question: "Reset progress?",
      description:
        "All cards, your history, your stats and your streak will be deleted. This cannot be undone.",
      confirm: "Reset for good",
      done: "Progress reset.",
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
    operatorAccount: "Administrator account",
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
