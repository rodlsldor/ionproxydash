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
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

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

/* =========================
 * USERS
 * ========================= */

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
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
    emailUniqueIdx: uniqueIndex('users_email_unique').on(table.email),
    stripeCustomerUniqueIdx: uniqueIndex('users_stripe_customer_unique').on(
      table.stripeCustomerId
    ),
    deletedAtIdx: index('users_deleted_at_idx').on(table.deletedAt),
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
 * BILLING (factures)
 * ========================= */

export const billing = pgTable(
  'billing',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subscriptionId: integer('subscription_id').references(
      () => subscriptions.id
    ),
    invoiceNumber: varchar('invoice_number', { length: 100 }),
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
 * RELATIONS
 * ========================= */

export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs),
  proxyAllocations: many(proxyAllocations),
  billing: many(billing),
  funds: many(funds),
}));

export const proxiesRelations = relations(proxies, ({ many }) => ({
  proxyAllocations: many(proxyAllocations),
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
  ({ one }) => ({
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
  })
);


export const billingRelations = relations(billing, ({ one }) => ({
  user: one(users, {
    fields: [billing.userId],
    references: [users.id],
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
