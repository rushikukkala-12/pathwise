import toast from 'react-hot-toast';

/** Friendly feedback when a new expense pushes the trip across a 50 / 75 / 90 / 100 % threshold. */
export function budgetToast(result) {
  const t = result?.crossedThreshold;
  if (!t) return;
  if (t >= 100) toast.error('Your planned budget has been exceeded.', { duration: 6000 });
  else if (t === 90) toast('Over 90% of your budget is used.', { icon: '🚨', duration: 5000 });
  else if (t === 75) toast('You have used 75% of your budget.', { icon: '⚠️', duration: 5000 });
  else if (t === 50) toast('Half of your budget is used.', { icon: '📍' });
}
