import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  pgEnum,
  index,
  boolean,
  bigint,
  PgColumn,
  PgTableWithColumns,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations} from 'drizzle-orm';

/* =========================
 * ENUMS
 * ========================= */

// Proxies
export const proxyStatusEnum = pgEnum('proxy_status', [
  'available',
  'allocated',
  'maintenance',
  'disabled',
]);

// Allocations
export const allocationStatusEnum = pgEnum('allocation_status', [
  'active',
  'expired',
  'cancelled',
]);

// Billing
export const billingStatusEnum = pgEnum('billing_status', [
  'pending',
  'paid',
  'cancelled',
  'failed',
]);

export const billingPaymentMethodEnum = pgEnum('billing_payment_method', [
  'wallet',
  'stripe',
]);

// Funds / Wallet
export const fundsStatusEnum = pgEnum('funds_status', [
  'pending',
  'completed',
  'failed',
  'refunded',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'CREDIT',
  'DEBIT',
]);

export const paymentProviderEnum = pgEnum('payment_provider', ['stripe']);

//Subscriptions

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'incomplete',
  'past_due',
  'canceled',
  'paused',
]);

// Tickets

export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
]);

export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'low',
  'normal',
  'high',
  'urgent'
]);

/* =========================
 * USERS
 * ========================= */

// USERS (extension de ce que tu as déjà)
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash'),
    name: varchar('name', { length: 100 }),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    phone: varchar('phone', { length: 30 }),
    countryOfResidence: varchar('country_residence', { length: 2 }),
    language: varchar('language', { length: 30 }).default('en'),
    timezone: varchar('timezone', { length: 50 }),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    emailVerified: timestamp('email_verified', {
      withTimezone: true,
      mode: 'date',
    }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
    lastLoginIp: varchar('last_login_ip', { length: 45 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    accountLockedUntil: timestamp('account_locked_until', {
      withTimezone: true,
      mode: 'date',
    }),
    passwordUpdatedAt: timestamp('password_updated_at', {
      withTimezone: true,
      mode: 'date',
    }),

    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    twoFactorType: varchar('two_factor_type', { length: 20 }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex('users_email_unique').on(table.email),
  })
);

/* =========================
 * AUTH.JS - ACCOUNTS
 * ========================= */

export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    type: varchar('type', { length: 50 }).notNull(), // "oauth", "oidc", "email", "credentials"
    provider: varchar('provider', { length: 50 }).notNull(), // "google", "github", etc.
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),

    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'), // timestamp en secondes (Auth.js)

    tokenType: varchar('token_type', { length: 50 }),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: varchar('session_state', { length: 255 }),
  },
  (table) => ({
    providerAccountUniqueIdx: uniqueIndex(
      'accounts_provider_providerAccountId_unique'
    ).on(table.provider, table.providerAccountId),
    userIdIdx: index('accounts_user_id_idx').on(table.userId),
  })
);

/* =========================
 * AUTH.JS - SESSIONS
 * ========================= */

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),

    sessionToken: varchar('session_token', { length: 255 })
      .notNull()
      .unique(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    expires: timestamp('expires', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  })
);

/* =========================
 * AUTH.JS - VERIFICATION TOKENS
 * ========================= */

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(), // email ou autre identifiant
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
  },
  (table) => ({
    pk: primaryKey({
      name: 'verification_tokens_pk',
      columns: [table.identifier, table.token],
    }),
  })
);

/* =========================
 * IDENTITY VERIFICATION
 * ========================= */

export const identityVerifications = pgTable(
  'identity_verifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    status: varchar('status', { length: 20 }).notNull().default('pending'),
    level: varchar('level', { length: 20 }).default('kyc1'),

    documentType: varchar('document_type', { length: 50 }),
    documentCountry: varchar('document_country', { length: 2 }),
    documentLastFour: varchar('document_last_four', { length: 10 }),
    documentExpiryDate: timestamp('document_expiry_date', { mode: 'date' }),

    dateOfBirth: timestamp('date_of_birth', { mode: 'date' }),

    provider: varchar('provider', { length: 50 }),
    providerSessionId: varchar('provider_session_id', { length: 255 }),
    providerVerificationId: varchar('provider_verification_id', { length: 255 }),
    providerResultCode: varchar('provider_result_code', { length: 100 }),
    riskScore: numeric('risk_score', { precision: 5, scale: 2 }).$type<number | null>(),

    selfieMatch: boolean('selfie_match'),

    manualReviewRequired: boolean('manual_review_required')
      .notNull()
      .default(false),
    reviewedBy: integer('reviewed_by'),
    reviewNotes: text('review_notes'),

    verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true, mode: 'date' }),
    rejectedReason: text('rejected_reason'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),

    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => ({
    userStatusIdx: index('identity_verifications_user_status_idx').on(
      table.userId,
      table.status
    ),
  })
);

/* =========================
 * PROXIES (4G / xProxy)
 * ========================= */

export const proxies = pgTable(
  'proxies',
  {
    id: serial('id').primaryKey(),
    label: varchar('label', { length: 100 }), // ex: "FR-4G-ORANGE-01"
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    port: integer('port').notNull(),
    username: varchar('username', { length: 100 }),
    password: varchar('password', { length: 100 }),
    location: varchar('location', { length: 100 }), // ex: "Paris, FR"
    isp: varchar('isp', { length: 100 }), // ex: "Orange"
    status: proxyStatusEnum('status').notNull().default('available'),
    lastHealthCheck: timestamp('last_health_check', {
      withTimezone: true,
      mode: 'date',
    }),
    dongleId: varchar('dongle_id', { length: 100 }),
    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => ({
    ipPortUniqueIdx: uniqueIndex('proxies_ip_port_unique').on(
      table.ipAddress,
      table.port
    ),
    deletedAtIdx: index('proxies_deleted_at_idx').on(table.deletedAt),
  })
);

/* =========================
 * PROXY ALLOCATIONS
 * (quel user loue quel proxy)
 * ========================= */

export const proxyAllocations = pgTable('proxy_allocations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  proxyId: integer('proxy_id')
    .notNull()
    .references(() => proxies.id, { onDelete: 'cascade' }),
  startsAt: timestamp('starts_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  endsAt: timestamp('ends_at', {
    withTimezone: true,
    mode: 'date',
  }),
  status: allocationStatusEnum('status').notNull().default('active'),
  priceMonthly: numeric('price_monthly', {
    precision: 12,
    scale: 2,
  }).notNull()
    .$type<number>(),
  // 👇 NOUVEAU : l’abo qui finance cette alloc
  subscriptionId: integer('subscription_id').references(
    () => subscriptions.id,
    {
      onDelete: 'set null',
    }
  ),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
});

/* =========================
 * PROXY USAGE
 * ========================= */
export const proxyUsageSamples = pgTable(
  'proxy_usage_samples',
  {
    id: serial('id').primaryKey(),

    proxyId: integer('proxy_id')
      .references(() => proxies.id, { onDelete: 'cascade' })
      .notNull(),

    allocationId: integer('allocation_id')
      .references(() => proxyAllocations.id, { onDelete: 'set null' }),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    ts: timestamp('ts', { withTimezone: true })
      .notNull()
      .defaultNow(),

    bytesIn: bigint('bytes_in', { mode: 'number' }).notNull(),
    bytesOut: bigint('bytes_out', { mode: 'number' }).notNull(),
  },
  (table) => ({
    bytesIn: bigint('bytes_in', { mode: 'number' }).notNull(),
    bytesOut: bigint('bytes_out', { mode: 'number' }).notNull(),
  })
);


/* =========================
 * BILLING
 * ========================= */

export const billing = pgTable(
  'billing',
  {
    id: serial('id').primaryKey(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    subscriptionId: integer('subscription_id').references(
      () => subscriptions.id,
      { onDelete: 'set null' } // ⬅ garde la facture même si l'abo est supprimé
    ),

    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(), // ⬅ maintenant obligatoire

    amount: numeric('amount', { precision: 12, scale: 2 })
      .notNull()
      .$type<number>(),

    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    status: billingStatusEnum('status').notNull().default('pending'),

    paymentMethod: billingPaymentMethodEnum('payment_method')
      .notNull()
      .default('stripe'),

    dueDate: timestamp('due_date', {
      withTimezone: true,
      mode: 'date',
    }),
    paidAt: timestamp('paid_at', {
      withTimezone: true,
      mode: 'date',
    }),

    paymentProvider: paymentProviderEnum('payment_provider'),
    paymentReference: varchar('payment_reference', { length: 255 }),

    walletFundsId: integer('wallet_funds_id').references(() => funds.id),

    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => ({
    deletedAtIdx: index('billing_deleted_at_idx').on(table.deletedAt),

    // Pour filtrer par user
    billingUserIdx: index('billing_user_id_idx').on(table.userId),

    // Pour filtrer par abonnement
    billingSubscriptionIdx: index('billing_subscription_id_idx').on(
      table.subscriptionId
    ),

    // Pour récupérer rapidement les factures en attente / payées
    billingStatusIdx: index('billing_status_idx').on(table.status),

    // Unicité du numéro de facture par user
    billingInvoiceUserUniqueIdx: uniqueIndex('billing_invoice_user_unique').on(
      table.userId,
      table.invoiceNumber
    ),
  })
);


/* =========================
 * FUNDS (wallet / recharges)
 * ========================= */

export const funds = pgTable(
  'funds',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    amount: numeric('amount', { precision: 12, scale: 2 })
      .notNull()
      .$type<number>(),

    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    transactionType: transactionTypeEnum('transaction_type')
      .notNull()
      .$type<'CREDIT' | 'DEBIT'>(),

    status: fundsStatusEnum('status').notNull().default('pending'),

    paymentProvider: paymentProviderEnum('payment_provider'),
    transactionReference: varchar('transaction_reference', { length: 255 }),

    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => ({
    deletedAtIdx: index('funds_deleted_at_idx').on(table.deletedAt),
  })
);

/* =========================
 * ACTIVITY LOGS
 * ========================= */

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

/* =========================
 * SUBSCRIPTIONS
 * ========================= */

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // 'wallet' ou 'stripe' → ce qu’on a déjà défini plus haut
    paymentMethod: billingPaymentMethodEnum('payment_method')
      .notNull()
      .default('stripe'),

    status: subscriptionStatusEnum('status')
      .notNull()
      .default('active'),

    // prix récurrent de l’abo (tu peux dupliquer priceMonthly ici)
    amountMonthly: numeric('amount_monthly', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .$type<number>(),

    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    // Stripe (optionnel si paymentMethod = 'wallet')
    stripeSubscriptionId: varchar('stripe_subscription_id', {
      length: 255,
    }),
    stripePriceId: varchar('stripe_price_id', { length: 255 }),

    // périodes de facturation
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
      mode: 'date',
    }),
    currentPeriodEnd: timestamp('current_period_end', {
      withTimezone: true,
      mode: 'date',
    }),
    cancelAt: timestamp('cancel_at', {
      withTimezone: true,
      mode: 'date',
    }),
    canceledAt: timestamp('canceled_at', {
      withTimezone: true,
      mode: 'date',
    }),

    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
  }
);


/* =========================
 * TICKETS
 * ========================= */


export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),

  // Auteur du ticket
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Contenu du ticket
  subject: varchar('subject', { length: 255 }).notNull(),
  message: text('message').notNull(),

  // Catégorie optionnelle (facturation, bug, connexion, etc.)
  category: varchar('category', { length: 50 }),

  // Statut du ticket
  status: ticketStatusEnum('status')
    .notNull()
    .default('open'),

  // Priorité
  priority: ticketPriorityEnum('priority')
    .notNull()
    .default('normal'),

  // Réponse admin (si clos)
  adminReply: text('admin_reply'),

  // Dates
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at'),
  closedAt: timestamp('closed_at'),

  // Soft delete
  deletedAt: timestamp('deleted_at'),
});

/* =========================
 * RELATIONS
 * ========================= */

export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs),
  proxyAllocations: many(proxyAllocations),
  billing: many(billing),
  funds: many(funds),
  subscriptions: many(subscriptions),
  tickets: many(tickets),
  identityVerifications: many(identityVerifications),
  usageSamples: many(proxyUsageSamples),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));


export const identityVerificationsRelations = relations(
  identityVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [identityVerifications.userId],
      references: [users.id],
    }),
  })
);

export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
}));


export const proxiesRelations = relations(proxies, ({ many }) => ({
  proxyAllocations: many(proxyAllocations),
  usageSamples: many(proxyUsageSamples),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  proxyAllocations: many(proxyAllocations),
  billing: many(billing),
}));

export const proxyAllocationsRelations = relations(
  proxyAllocations,
  ({ one, many }) => ({              // 👈 ICI : ajouter many
    user: one(users, {
      fields: [proxyAllocations.userId],
      references: [users.id],
    }),
    proxy: one(proxies, {
      fields: [proxyAllocations.proxyId],
      references: [proxies.id],
    }),
    subscription: one(subscriptions, {
      fields: [proxyAllocations.subscriptionId],
      references: [subscriptions.id],
    }),
    usageSamples: many(proxyUsageSamples),  // 👈 maintenant many est dans le scope
  })
);


export const proxyUsageSamplesRelations = relations(proxyUsageSamples, ({ one }) => ({
  proxy: one(proxies, {
    fields: [proxyUsageSamples.proxyId],
    references: [proxies.id],
  }),

  allocation: one(proxyAllocations, {
    fields: [proxyUsageSamples.allocationId],
    references: [proxyAllocations.id],
  }),

  user: one(users, {
    fields: [proxyUsageSamples.userId],
    references: [users.id],
  }),
}));

export const billingRelations = relations(billing, ({ one }) => ({
  user: one(users, {
    fields: [billing.userId],
    references: [users.id],
  }),
  subscription: one(subscriptions, {
    fields: [billing.subscriptionId],
    references: [subscriptions.id],
  }),
  walletFunds: one(funds, {
    fields: [billing.walletFundsId],
    references: [funds.id],
  }),
}));


export const fundsRelations = relations(funds, ({ one }) => ({
  user: one(users, {
    fields: [funds.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));


/* =========================
 * TYPES
 * ========================= */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type IdentityVerification = typeof identityVerifications.$inferSelect;
export type NewIdentityVerification = typeof identityVerifications.$inferInsert;

export type Proxy = typeof proxies.$inferSelect;
export type NewProxy = typeof proxies.$inferInsert;

export type ProxyAllocation = typeof proxyAllocations.$inferSelect;
export type NewProxyAllocation = typeof proxyAllocations.$inferInsert;

export type Billing = typeof billing.$inferSelect;
export type NewBilling = typeof billing.$inferInsert;

export type Funds = typeof funds.$inferSelect;
export type NewFunds = typeof funds.$inferInsert;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

export type ProxyUsageSample = typeof proxyUsageSamples.$inferSelect;
export type NewProxyUsageSample = typeof proxyUsageSamples.$inferInsert;

/* =========================
 * ACTIVITY TYPES
 * ========================= */

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',

  ALLOCATE_PROXY = 'ALLOCATE_PROXY',
  RELEASE_PROXY = 'RELEASE_PROXY',
  RENEW_PROXY = 'RENEW_PROXY',

  ADD_FUNDS = 'ADD_FUNDS',
  CREATE_INVOICE = 'CREATE_INVOICE',
  PAY_INVOICE = 'PAY_INVOICE',
}

