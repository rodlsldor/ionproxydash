// db/seed.ts
import { db } from './drizzle';
import {
  users,
  proxies,
  proxyAllocations,
  billing,
  funds,
  subscriptions,
  activityLogs,
  tickets,
  identityVerifications,
  proxyUsageSamples,
} from './schema';
import { hashPassword } from '@/lib/auth/password';
import { eq } from 'drizzle-orm';

function buildUsageSamples(params: {
  proxyId: number;
  userId: number;
  allocationId: number;
  start: Date;
  end: Date;
  stepMinutes: number;
  avgKbpsIn: number;
  avgKbpsOut: number;
}) {
  const { proxyId, userId, allocationId, start, end, stepMinutes, avgKbpsIn, avgKbpsOut } =
    params;

  const samples: {
    proxyId: number;
    userId: number;
    allocationId: number;
    ts: Date;
    bytesIn: number;
    bytesOut: number;
  }[] = [];

  const cursor = new Date(start);

  while (cursor <= end) {
    const seconds = stepMinutes * 60;

    // petit jitter pour que ça ne soit pas plat
    const jitterIn = 0.6 + Math.random() * 0.8; // 0.6 – 1.4
    const jitterOut = 0.6 + Math.random() * 0.8;

    const bytesIn = Math.round(
      ((avgKbpsIn * 1000) / 8) * seconds * jitterIn
    ); // kbps → bytes
    const bytesOut = Math.round(
      ((avgKbpsOut * 1000) / 8) * seconds * jitterOut
    );

    samples.push({
      proxyId,
      userId,
      allocationId,
      ts: new Date(cursor),
      bytesIn,
      bytesOut,
    });

    cursor.setMinutes(cursor.getMinutes() + stepMinutes);
  }

  return samples;
}

async function seed() {
  console.log('🌱 Seeding database...');

  // ======================
  // 1) User de test
  // ======================
  const email = 'test@ionproxy.dev';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: 'Test User',
      firstName: 'Poor',
      lastName: 'Khara',
      countryOfResidence: 'FR',
      avatarUrl: 'https://static.toiimg.com/thumb/msid-125216702,imgsize-864802,width-400,resizemode-4/michael-willis-heard-cause-of-death-how-did-the-tiktok-star-yes-king-die.jpg',
      language: 'en',
      timezone: 'Europe/Paris',
      emailVerified: new Date(),
      lastLoginAt: new Date(),
    })
    .returning();
  console.log(`👤 User created: ${user.email} / ${password}`);

  await db.insert(identityVerifications).values({
    userId: user.id,
    status: 'verified',
    level: 'kyc1',
    documentType: 'id_card',
    documentCountry: 'FR',
    documentLastFour: '1234',
    verifiedAt: new Date(),
    manualReviewRequired: false,
  });

  // ======================
  // 2) Proxies de test (user 1)
  // ======================
  const [proxy1, proxy2, proxy3] = await db
    .insert(proxies)
    .values([
      {
        label: 'FR-4G-ORANGE-01',
        ipAddress: '10.0.0.1',
        port: 40001,
        username: 'user1',
        password: 'pass1',
        location: 'Paris, FR',
        isp: 'Orange',
        status: 'available',
      },
      {
        label: 'FR-4G-ORANGE-02',
        ipAddress: '10.0.0.2',
        port: 40002,
        username: 'user2',
        password: 'pass2',
        location: 'Lyon, FR',
        isp: 'Orange',
        status: 'available',
      },
      {
        label: 'ES-4G-VODAFONE-01',
        ipAddress: '10.0.0.3',
        port: 40003,
        username: 'user3',
        password: 'pass3',
        location: 'Madrid, ES',
        isp: 'Vodafone',
        status: 'available',
      },
    ])
    .returning();

  console.log('🛰️ Proxies created:', [proxy1.label, proxy2.label, proxy3.label]);

  // ======================
  // 3) Subscription de test (user 1)
  // ======================
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      userId: user.id,
      paymentMethod: 'wallet',
      amountMonthly: 49,
      currency: 'USD',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    })
    .returning();

  console.log('🔁 Subscription created with id:', subscription.id);

  // ======================
  // 4) Allocation d’un proxy avec cet abo (user 1)
  // ======================
  const [allocation] = await db
    .insert(proxyAllocations)
    .values({
      userId: user.id,
      proxyId: proxy1.id,
      startsAt: now,
      endsAt: periodEnd,
      status: 'active',
      priceMonthly: 49,
      subscriptionId: subscription.id,
    })
    .returning();

  await db
    .update(proxies)
    .set({ status: 'allocated' })
    .where(eq(proxies.id, proxy1.id));

  console.log(
    `📡 Proxy ${proxy1.label} allocated to user ${user.email} (allocation id: ${allocation.id})`
  );

  // ======================
  // 4bis) Usage samples pour l'allocation du user 1
  // ======================

  // On génère ~24h de trafic à 5 min d’intervalle
  const user1UsageStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // il y a 24h
  const user1UsageEnd = now;

  const user1UsageSamples = buildUsageSamples({
    proxyId: proxy1.id,
    userId: user.id,
    allocationId: allocation.id,
    start: user1UsageStart,
    end: user1UsageEnd,
    stepMinutes: 5,      // 👈 1 point / 5 min (288 points / jour)
    avgKbpsIn: 300,      // ~300 kbps en entrée
    avgKbpsOut: 200,     // ~200 kbps en sortie
  });

  if (user1UsageSamples.length > 0) {
    await db.insert(proxyUsageSamples).values(user1UsageSamples);
  }

  console.log(
    `📈 Seeded ${user1UsageSamples.length} usage samples for user ${user.email} / proxy ${proxy1.label}`
  );

  // ======================
  // 5) Wallet / Funds (user 1)
  // ======================

  const [fundCredit] = await db
    .insert(funds)
    .values({
      userId: user.id,
      amount: 100,
      currency: 'USD',
      transactionType: 'CREDIT',
      status: 'completed',
      paymentProvider: 'stripe',
      transactionReference: 'seed_topup_1',
      metadata: { note: 'Seed initial credit' },
    })
    .returning();

  const [fundDebit] = await db
    .insert(funds)
    .values({
      userId: user.id,
      amount: 49,
      currency: 'USD',
      transactionType: 'DEBIT',
      status: 'completed',
      paymentProvider: null,
      transactionReference: 'seed_wallet_payment_1',
      metadata: { note: 'Seed invoice payment from wallet' },
    })
    .returning();

  console.log(
    `💰 Wallet seeded (user 1): +${fundCredit.amount} (CREDIT), -${fundDebit.amount} (DEBIT)`
  );

  // ======================
  // 6) Billing / Invoices (user 1)
  // ======================

  const [paidInvoice] = await db
    .insert(billing)
    .values({
      userId: user.id,
      invoiceNumber: 'INV-0001',
      amount: 49,
      currency: 'USD',
      status: 'paid',
      paymentMethod: 'wallet',
      dueDate: now,
      paidAt: now,
      paymentProvider: null,
      paymentReference: 'seed_wallet_payment_1',
      walletFundsId: fundDebit.id,
      subscriptionId: subscription.id,
      metadata: { note: 'Seed paid invoice via wallet' },
    })
    .returning();

  const [pendingInvoice] = await db
    .insert(billing)
    .values({
      userId: user.id,
      invoiceNumber: 'INV-0002',
      amount: 49,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'wallet',
      dueDate: periodEnd,
      paymentProvider: null,
      paymentReference: null,
      walletFundsId: null,
      subscriptionId: subscription.id,
      metadata: { note: 'Seed pending invoice' },
    })
    .returning();

  console.log(
    '📄 Invoices created (user 1):',
    paidInvoice.invoiceNumber,
    pendingInvoice.invoiceNumber
  );

  // ======================
  // 7) Activity logs (user 1)
  // ======================
  await db.insert(activityLogs).values([
    {
      userId: user.id,
      action: 'SIGN_UP',
      ipAddress: '127.0.0.1',
    },
    {
      userId: user.id,
      action: 'ALLOCATE_PROXY',
      ipAddress: '127.0.0.1',
    },
  ]);

  console.log('📝 Activity logs inserted for user 1.');

  // ============================================================
  // 8) User 2 : rich@ionproxy.dev (wallet bien rempli, multi-proxy)
  // ============================================================

  const richEmail = 'rich@ionproxy.dev';
  const richPassword = 'kharakalb';
  const richPasswordHash = await hashPassword(richPassword);

  const [richUser] = await db
    .insert(users)
    .values({
      email: richEmail,
      passwordHash: richPasswordHash,
      name: 'Rich User',
      firstName: 'Rich',
      lastName: 'Milionnaire',
      countryOfResidence: 'FR',
      avatarUrl: 'https://i.imgflip.com/2/7j27ao.jpg',
      language: 'en',
      timezone: 'Europe/Paris',
      emailVerified: new Date(),
      lastLoginAt: new Date(),
    })
    .returning();
  
  await db.insert(identityVerifications).values({
    userId: richUser.id,
    status: 'verified',
    level: 'kyc2',
    documentType: 'passport',
    documentCountry: 'FR',
    documentLastFour: '9876',
    verifiedAt: new Date(),
    riskScore: 2.5,
    manualReviewRequired: false,
  });

  console.log(`👤 Rich user created: ${richUser.email} / ${richPassword}`);

  // Proxies FR 4G pour Rich
  const [richProxy1, richProxy2, richProxy3] = await db
    .insert(proxies)
    .values([
      {
        label: 'FR-4G-RICH-01',
        ipAddress: '10.0.1.10',
        port: 41001,
        username: 'rich1',
        password: 'richpass1',
        location: 'Paris, FR',
        isp: 'Orange',
        status: 'available',
      },
      {
        label: 'FR-4G-RICH-02',
        ipAddress: '10.0.1.11',
        port: 41002,
        username: 'rich2',
        password: 'richpass2',
        location: 'Marseille, FR',
        isp: 'Orange',
        status: 'available',
      },
      {
        label: 'FR-4G-RICH-03',
        ipAddress: '10.0.1.12',
        port: 41003,
        username: 'rich3',
        password: 'richpass3',
        location: 'Lyon, FR',
        isp: 'Orange',
        status: 'available',
      },
    ])
    .returning();

  console.log(
    '🛰️ Proxies created for rich:',
    [richProxy1.label, richProxy2.label, richProxy3.label]
  );

  // Subscription pour Rich : 3 proxys à 70$/mois
  const richNow = new Date();
  const richPeriodEnd = new Date(richNow);
  richPeriodEnd.setDate(richPeriodEnd.getDate() + 30);

  const [richSubscription] = await db
    .insert(subscriptions)
    .values({
      userId: richUser.id,
      paymentMethod: 'wallet',
      amountMonthly: 70 * 3, // 3 proxies à 70$
      currency: 'USD',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodStart: richNow,
      currentPeriodEnd: richPeriodEnd,
    })
    .returning();

  console.log('🔁 Rich subscription created with id:', richSubscription.id);

  // Allocations de proxys (Rich possède plusieurs proxies)
  const [richAlloc1] = await db
    .insert(proxyAllocations)
    .values({
      userId: richUser.id,
      proxyId: richProxy1.id,
      startsAt: richNow,
      endsAt: richPeriodEnd,
      status: 'active',
      priceMonthly: 70,
      subscriptionId: richSubscription.id,
    })
    .returning();

  const [richAlloc2] = await db
    .insert(proxyAllocations)
    .values({
      userId: richUser.id,
      proxyId: richProxy2.id,
      startsAt: richNow,
      endsAt: richPeriodEnd,
      status: 'active',
      priceMonthly: 70,
      subscriptionId: richSubscription.id,
    })
    .returning();

  const [richAlloc3] = await db
    .insert(proxyAllocations)
    .values({
      userId: richUser.id,
      proxyId: richProxy3.id,
      startsAt: richNow,
      endsAt: richPeriodEnd,
      status: 'active',
      priceMonthly: 70,
      subscriptionId: richSubscription.id,
    })
    .returning();

  await db
    .update(proxies)
    .set({ status: 'allocated' })
    .where(eq(proxies.id, richProxy1.id));

  await db
    .update(proxies)
    .set({ status: 'allocated' })
    .where(eq(proxies.id, richProxy2.id));

  await db
    .update(proxies)
    .set({ status: 'allocated' })
    .where(eq(proxies.id, richProxy3.id));

  console.log(
    `📡 Rich allocations created:`,
    [richAlloc1.id, richAlloc2.id, richAlloc3.id]
  );


    // ======================
  // 8bis) Usage samples pour le rich user (3 proxys)
  // ======================

  // On génère ~7 jours de trafic à 10 min d’intervalle pour chaque proxy
  const richUsageStart = new Date(richNow.getTime() - 7 * 24 * 60 * 60 * 1000); // il y a 7 jours
  const richUsageEnd = richNow;

  const richUsageSamples1 = buildUsageSamples({
    proxyId: richProxy1.id,
    userId: richUser.id,
    allocationId: richAlloc1.id,
    start: richUsageStart,
    end: richUsageEnd,
    stepMinutes: 10,
    avgKbpsIn: 500,   // proxy plutôt utilisé
    avgKbpsOut: 350,
  });

  const richUsageSamples2 = buildUsageSamples({
    proxyId: richProxy2.id,
    userId: richUser.id,
    allocationId: richAlloc2.id,
    start: richUsageStart,
    end: richUsageEnd,
    stepMinutes: 10,
    avgKbpsIn: 300,
    avgKbpsOut: 250,
  });

  const richUsageSamples3 = buildUsageSamples({
    proxyId: richProxy3.id,
    userId: richUser.id,
    allocationId: richAlloc3.id,
    start: richUsageStart,
    end: richUsageEnd,
    stepMinutes: 10,
    avgKbpsIn: 150,
    avgKbpsOut: 120,
  });

  const allRichSamples = [
    ...richUsageSamples1,
    ...richUsageSamples2,
    ...richUsageSamples3,
  ];

  if (allRichSamples.length > 0) {
    await db.insert(proxyUsageSamples).values(allRichSamples);
  }

  console.log(
    `📈 Seeded ${allRichSamples.length} usage samples for rich user ${richUser.email} (3 proxies)`
  );

  // Wallet / Funds pour Rich
  // Objectif : balance finale = 481$
  // On fait : +1000 (CREDIT) -210 (DEBIT invoice) -309 (DEBIT divers) = 481

  const [richCredit] = await db
    .insert(funds)
    .values({
      userId: richUser.id,
      amount: 1000,
      currency: 'USD',
      transactionType: 'CREDIT',
      status: 'completed',
      paymentProvider: 'stripe',
      transactionReference: 'rich_seed_topup_1',
      metadata: { note: 'Rich initial topup' },
    })
    .returning();

  const [richDebitInvoice] = await db
    .insert(funds)
    .values({
      userId: richUser.id,
      amount: 210, // 3 proxys * 70$
      currency: 'USD',
      transactionType: 'DEBIT',
      status: 'completed',
      paymentProvider: null,
      transactionReference: 'rich_invoice_payment_1',
      metadata: { note: 'Rich invoice payment for 3 proxies' },
    })
    .returning();

  const [richDebitMisc] = await db
    .insert(funds)
    .values({
      userId: richUser.id,
      amount: 309,
      currency: 'USD',
      transactionType: 'DEBIT',
      status: 'completed',
      paymentProvider: null,
      transactionReference: 'rich_misc_spend_1',
      metadata: { note: 'Misc usage / historical spend' },
    })
    .returning();

  console.log(
    `💰 Wallet seeded (rich): +${richCredit.amount} (CREDIT), -${richDebitInvoice.amount} (DEBIT invoice), -${richDebitMisc.amount} (DEBIT misc)`
  );
  console.log('💰 Expected balance for rich ≈ 481$');

  // Billing pour Rich : monthlySpent positif (210$ ce mois-ci)
  const [richPaidInvoice] = await db
    .insert(billing)
    .values({
      userId: richUser.id,
      invoiceNumber: 'RICH-INV-0001',
      amount: 210,
      currency: 'USD',
      status: 'paid',
      paymentMethod: 'wallet',
      dueDate: richNow,
      paidAt: richNow, // → comptera dans le monthlySpent courant
      paymentProvider: null,
      paymentReference: 'rich_invoice_payment_1',
      walletFundsId: richDebitInvoice.id,
      subscriptionId: richSubscription.id,
      metadata: { note: 'Monthly invoice for 3 FR 4G proxies' },
    })
    .returning();

  console.log('📄 Rich paid invoice:', richPaidInvoice.invoiceNumber);

  await db.insert(tickets).values([
  {
    userId: richUser.id,
    subject: 'Billing issue – unexpected wallet charge',
    message:
      'Hey, I got a $70 charge this morning and I’m not sure which proxy or invoice it corresponds to. Can you check my last transactions and explain the charge?',
    category: 'billing',
    status: 'open',
    priority: 'high',
  },
  {
    userId: richUser.id,
    subject: 'Proxy down – FR-4G-ORANGE-02 unreachable',
    message:
      'The proxy FR-4G-ORANGE-02 keeps timing out for HTTP and HTTPS requests. I tried rotating IP and restarting my tools but it still fails. Can you investigate?',
    category: 'proxy',
    status: 'open',
    priority: 'urgent',
  },
  {
    userId: richUser.id,
    subject: 'Feature request – webhook on IP rotation',
    message:
      'It would be super useful to have a webhook fired each time my proxy IP changes so I can update my internal cache automatically. Is this something you could add?',
    category: 'feature',
    status: 'open',
    priority: 'normal',
  },
  {
    userId: richUser.id,
    subject: 'Login security question',
    message:
      'Can you confirm if my account has had any suspicious logins in the last 7 days? I had a weird email alert from another service and just want to be sure.',
    category: 'account',
    status: 'open',
    priority: 'low',
  },
  {
    userId: richUser.id,
    subject: 'Abuse report – blocked target site',
    message:
      'One of my target sites is now blocking requests coming from my proxies. Do you have any recommendations or best practices to avoid getting IPs banned so fast?',
    category: 'abuse',
    status: 'open',
    priority: 'high',
  },
  {
    userId: richUser.id,
    subject: 'Frequent captchas on target websites',
    message:
      'I am constantly hitting captchas on several websites even with a low request rate. Is there a way to reduce detection or rotate IPs more efficiently?',
    category: 'abuse',
    status: 'open',
    priority: 'normal',
  },
  {
    userId: richUser.id,
    subject: 'IP range flagged by website',
    message:
      'A website I am working with seems to block an entire IP range that my proxies belong to. Can you provide IPs from a different subnet or ASN?',
    category: 'abuse',
    status: 'open',
    priority: 'high',
  },
  {
    userId: richUser.id,
    subject: 'Temporary ban after short usage',
    message:
      'I get temporarily banned after just a few minutes of traffic on some websites even with limited concurrency. I’m not sure if the issue comes from my setup or the proxy itself.',
    category: 'abuse',
    status: 'open',
    priority: 'urgent',
  },



  {
    userId: richUser.id,
    subject: 'Wallet top-up not reflected',
    message:
      'I added funds to my wallet earlier today but my balance didn’t update immediately. Is there a delay or did something go wrong?',
    category: 'billing',
    status: 'closed',
    priority: 'normal',
    adminReply:
      'Hi, thanks for reporting this. The payment was temporarily stuck in a provider queue but has now been confirmed. Your wallet balance has been updated correctly.',
    closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    userId: richUser.id,
    subject: 'Cannot authenticate on proxy endpoint',
    message:
      'I’m receiving authentication errors when trying to connect to my proxy with the provided credentials.',
    category: 'proxy',
    status: 'closed',
    priority: 'high',
    adminReply:
      'We found an incorrect character in your password due to a copy/paste issue. We regenerated your credentials and everything should now work properly.',
    closedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    userId: richUser.id,
    subject: 'Question about refund policy',
    message:
      'If I cancel my subscription, am I eligible for a refund on the remaining days or is it billed until the end of the month?',
    category: 'billing',
    status: 'closed',
    priority: 'low',
    adminReply:
      'Subscriptions are billed until the end of the current billing period. You will retain access until the end date, but no partial refunds are issued.',
    closedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    userId: richUser.id,
    subject: 'How to rotate IP programmatically?',
    message:
      'Is there an API or endpoint to force an IP rotation by code instead of from the dashboard?',
    category: 'feature',
    status: 'closed',
    priority: 'normal',
    adminReply:
      'Yes, you can use the /rotate endpoint with your API token. We have also added documentation in your dashboard under the API section.',
    closedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  },
  {
    userId: richUser.id,
    subject: 'SSL errors on some websites',
    message:
      'I’m getting SSL handshake errors when connecting to specific websites through one proxy.',
    category: 'proxy',
    status: 'closed',
    priority: 'normal',
    adminReply:
      'The issue was related to an outdated CA certificate on that proxy node. We performed a full refresh and the SSL issue has been resolved.',
    closedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
  userId: richUser.id,
  subject: 'Proxy randomly disconnects',
  message:
    'One of my proxies disconnects after a few minutes of usage and does not reconnect automatically.',
  category: 'proxy',
  status: 'resolved',
  priority: 'high',
  adminReply:
    'This was caused by instability on the mobile network. The node has been replaced with a more stable one and monitoring has been reinforced.',
  closedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
},
{
  userId: richUser.id,
  subject: 'Billing charged twice this month',
  message:
    'I noticed that I was charged twice for the same monthly period. Could you please verify this?',
  category: 'billing',
  status: 'closed',
  priority: 'urgent',
  adminReply:
    'A duplicate invoice was generated following a temporary synchronization issue. The extra charge has been refunded to your original payment method.',
  closedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
},
{
  userId: richUser.id,
  subject: 'Unable to authenticate on proxy',
  message:
    'I keep getting authentication errors when connecting using the provided username and password. The proxy refuses the connection.',
  category: 'proxy',
  status: 'resolved',
  priority: 'normal',
  adminReply:
    'The credentials were out of sync after a rotation cycle. We regenerated your proxy credentials and access is now restored.',
  closedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
},
]);

  // Activity logs pour Rich
  await db.insert(activityLogs).values([
    {
      userId: richUser.id,
      action: 'SIGN_UP',
      ipAddress: '127.0.0.1',
    },
    {
      userId: richUser.id,
      action: 'ALLOCATE_PROXY',
      ipAddress: '127.0.0.1',
    },
  ]);

  console.log('📝 Activity logs inserted for rich user.');

  console.log('✅ Seed finished successfully.');
}

seed()
  .catch((error) => {
    console.error('❌ Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('👋 Seed process finished. Exiting...');
    process.exit(0);
  });
