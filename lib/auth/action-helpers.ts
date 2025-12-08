import { z } from 'zod';
import type { User } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any; // Permet d'ajouter d'autres props si besoin
};

/* ============================
 * 1. validatedAction (sans user)
 * ============================ */

type ValidatedActionFunction<S extends z.ZodTypeAny, T> = (
  data: z.infer<S>,
  formData: FormData
) => Promise<T>;

export function validatedAction<S extends z.ZodTypeAny, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0]?.message ?? 'Invalid input' };
    }

    return action(result.data, formData);
  };
}

/* ===============================
 * 2. validatedActionWithUser
 * =============================== */

type ValidatedActionWithUserFunction<S extends z.ZodTypeAny, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User
) => Promise<T>;

export function validatedActionWithUser<S extends z.ZodTypeAny, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
) {
  return async (prevState: ActionState, formData: FormData) => {
    const user = await getUser();
    if (!user) {
      // Tu peux aussi faire `redirect('/sign-in')` si tu préfères
      throw new Error('User is not authenticated');
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0]?.message ?? 'Invalid input' };
    }

    return action(result.data, formData, user);
  };
}

/* ===============================
 * 3. withUser (remplace withTeam)
 * =============================== */

type ActionWithUserFunction<T> = (formData: FormData, user: User) => Promise<T>;

export function withUser<T>(action: ActionWithUserFunction<T>) {
  return async (formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) {
      redirect('/sign-in');
    }

    return action(formData, user!);
  };
}

export async function requireUser(): Promise<User> {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin'); // tu peux changer l’URL si besoin
  }

  return user;
}