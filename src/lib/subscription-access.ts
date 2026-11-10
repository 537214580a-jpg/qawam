export type SubscriptionAccess = {
  readOnly: boolean;
  status: string | null;
  endsAt: string | null;
  graceEndsAt: string | null;
};

export async function getClientSubscriptionAccess(db: any, userId: string): Promise<SubscriptionAccess> {
  const { data, error } = await db
    .from('subscriptions')
    .select('status,ends_at,updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { readOnly: true, status: 'unavailable', endsAt: null, graceEndsAt: null };
  if (!data) return { readOnly: false, status: null, endsAt: null, graceEndsAt: null };

  const now = Date.now();
  const end = data.ends_at ? Date.parse(data.ends_at) : null;
  const graceEnds = data.status === 'past_due'
    ? (end ?? (Date.parse(data.updated_at) + 7 * 24 * 60 * 60 * 1000))
    : null;
  const inDate = end === null || end > now;
  const activeStatus = data.status === 'active' || data.status === 'trialing';
  const inGrace = data.status === 'past_due' && graceEnds !== null && graceEnds > now;
  return {
    readOnly: !(inDate && activeStatus) && !inGrace,
    status: data.status,
    endsAt: data.ends_at,
    graceEndsAt: graceEnds === null ? null : new Date(graceEnds).toISOString()
  };
}
