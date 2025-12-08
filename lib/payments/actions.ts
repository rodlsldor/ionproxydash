'use server';

import { redirect } from 'next/navigation';
import {
  createCheckoutSession,
  createCustomerPortalSession,
} from './stripe';

// Action appelée depuis un form (priceId dans le FormData)
export const checkoutAction = async (formData: FormData) => {
  const priceId = formData.get('priceId');

  if (typeof priceId !== 'string' || !priceId) {
    throw new Error('priceId is required');
  }

  // Cette fonction fait déjà redirect() en interne
  await createCheckoutSession({ priceId });
};

// Action pour ouvrir le portail client Stripe
export const customerPortalAction = async () => {
  const portalSession = await createCustomerPortalSession();
  redirect(portalSession.url);
};
