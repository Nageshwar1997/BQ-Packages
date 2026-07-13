import { AuthenticationError } from '@beautinique/backend-classes';
/* ========== GET AUTH USER ========== */
export const getUser = <T>(user: T | null | undefined): T => {
  if (!user) {
    throw new AuthenticationError('You are not logged in');
  }

  return user;
};
