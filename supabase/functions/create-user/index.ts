// @ts-ignore: Deno is available in the Supabase Edge Functions runtime
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Could not verify existing POS login: ${error.message}`);
    const user = data.users.find(
      (item: { email?: string }) => item.email?.toLowerCase() === email.toLowerCase()
    );
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
  throw new Error('Could not verify existing POS login after checking the Auth directory.');
}

async function recoverUnlinkedPosUser(
  adminClient: ReturnType<typeof createClient>,
  input: { email: string; password: string; fullName: string; avatarUrl: string }
) {
  const existingUser = await findAuthUserByEmail(adminClient, input.email);
  if (!existingUser) return null;
  if (
    existingUser.user_metadata?.is_pos_user !== true &&
    existingUser.app_metadata?.is_pos_user !== true
  ) {
    throw new Error('This POS email is already used by another login. Choose a different email.');
  }

  const { data: linkedAccount, error: linkError } = await adminClient
    .from('accounts')
    .select('id')
    .eq('pos_user_id', existingUser.id)
    .maybeSingle();
  if (linkError)
    throw new Error(`Could not verify existing POS account link: ${linkError.message}`);
  if (linkedAccount) throw new Error('This POS login is already linked to another account.');

  const { error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      ...existingUser.user_metadata,
      full_name: input.fullName,
      account_type: 'business',
      is_pos_user: true,
      avatar_url: input.avatarUrl,
    },
    app_metadata: {
      ...existingUser.app_metadata,
      account_type: 'business',
      is_pos_user: true,
    },
  });
  if (error) throw new Error(`Could not activate the POS login: ${error.message}`);
  return existingUser.id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let createdUserIds: string[] = [];
  let adminClient: ReturnType<typeof createClient> | null = null;
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Supabase Edge Function secrets are not configured.');
    }

    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    const {
      data: { user: callerUser },
      error: callerError,
    } = await adminClient.auth.getUser(accessToken);
    if (callerError || !callerUser) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { data: callerMember, error: memberError } = await adminClient
      .from('accounts')
      .select('id, account_type')
      .or(`user_id.eq.${callerUser.id},pos_user_id.eq.${callerUser.id}`)
      .maybeSingle();
    if (memberError)
      throw new Error(`Could not verify account permissions: ${memberError.message}`);

    const { data: callerProfile, error: profileLookupError } = await adminClient
      .from('user_profiles')
      .select('account_type')
      .eq('id', callerUser.id)
      .maybeSingle();
    if (profileLookupError)
      throw new Error(`Could not verify profile permissions: ${profileLookupError.message}`);

    const isAdmin =
      !callerMember &&
      (callerProfile?.account_type === 'admin' ||
        callerUser.user_metadata?.account_type === 'admin' ||
        callerUser.app_metadata?.account_type === 'admin' ||
        !callerProfile);
    if (!isAdmin) return jsonResponse({ error: 'Only admins can create accounts' }, 403);

    if (callerProfile?.account_type !== 'admin') {
      const { error } = await adminClient.from('user_profiles').upsert(
        {
          id: callerUser.id,
          email: callerUser.email ?? '',
          full_name: (callerUser.user_metadata?.full_name as string) || '',
          avatar_url: (callerUser.user_metadata?.avatar_url as string) || '',
          account_type: 'admin',
          is_active: true,
        },
        { onConflict: 'id' }
      );
      if (error) throw new Error(`Could not save admin profile: ${error.message}`);
    }

    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action === 'create_pos_login' ? 'create_pos_login' : 'create_account';

    if (action === 'create_pos_login') {
      const accountId = typeof body.account_id === 'string' ? body.account_id : '';
      const mainEmail = typeof body.main_email === 'string' ? body.main_email.trim() : '';
      const posEmail =
        typeof body.pos_email === 'string' && body.pos_email.trim()
          ? body.pos_email.trim().toLowerCase()
          : null;
      const password = typeof body.password === 'string' ? body.password : '';
      const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
      const avatarUrl = typeof body.avatar_url === 'string' ? body.avatar_url : '';
      if (!accountId || !mainEmail || !posEmail || !password) {
        return jsonResponse(
          { error: 'Account, main email, POS email, and password are required.' },
          400
        );
      }

      const { data: account, error: accountError } = await adminClient
        .from('accounts')
        .select('id, user_id, pos_user_id, email, pos_email, name, account_type, logo_url, status')
        .eq('id', accountId)
        .maybeSingle();
      if (accountError) throw new Error(`Could not load business account: ${accountError.message}`);
      if (!account || account.account_type !== 'business' || !account.user_id) {
        return jsonResponse({ error: 'Business account not found or not ready for sign in.' }, 404);
      }
      if (account.status === 'suspended') {
        return jsonResponse({ error: 'This account is suspended.' }, 403);
      }
      if (account.email.toLowerCase() !== mainEmail.toLowerCase()) {
        return jsonResponse({ error: 'The main email does not match this business account.' }, 400);
      }

      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: mainLogin, error: mainLoginError } = await authClient.auth.signInWithPassword({
        email: account.email,
        password,
      });
      if (mainLoginError || mainLogin.user?.id !== account.user_id) {
        return jsonResponse(
          { error: 'Enter the current main account password to create its POS login.' },
          401
        );
      }

      let posUserId = account.pos_user_id as string | null;
      if (posUserId) {
        const { error } = await adminClient.auth.admin.updateUserById(posUserId, {
          email: posEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || account.name,
            account_type: 'business',
            is_pos_user: true,
            avatar_url: avatarUrl || account.logo_url || '',
          },
          app_metadata: { account_type: 'business', is_pos_user: true },
        });
        if (error) throw new Error(`Could not activate the POS login: ${error.message}`);
      } else {
        const { data: posUser, error } = await adminClient.auth.admin.createUser({
          email: posEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName || account.name,
            account_type: 'business',
            is_pos_user: true,
            avatar_url: avatarUrl || account.logo_url || '',
          },
          app_metadata: { account_type: 'business', is_pos_user: true },
        });
        if (!error && posUser.user) {
          posUserId = posUser.user.id;
          createdUserIds.push(posUser.user.id);
        } else if (error && /already|exists|registered/i.test(error.message)) {
          const existingPosUser = await findAuthUserByEmail(adminClient, posEmail);
          const isExistingPosUser =
            existingPosUser?.user_metadata?.is_pos_user === true ||
            existingPosUser?.app_metadata?.is_pos_user === true;
          if (!existingPosUser || !isExistingPosUser) {
            return jsonResponse(
              {
                error: 'This POS email is already used by another login. Choose a different email.',
              },
              409
            );
          }

          const { data: linkedAccount, error: linkedAccountError } = await adminClient
            .from('accounts')
            .select('id')
            .eq('pos_user_id', existingPosUser.id)
            .maybeSingle();
          if (linkedAccountError) {
            throw new Error(
              `Could not verify existing POS account link: ${linkedAccountError.message}`
            );
          }
          if (linkedAccount && linkedAccount.id !== account.id) {
            return jsonResponse(
              { error: 'This POS login is already linked to another account.' },
              409
            );
          }

          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            existingPosUser.id,
            {
              email: posEmail,
              password,
              email_confirm: true,
              user_metadata: {
                ...existingPosUser.user_metadata,
                full_name: fullName || account.name,
                account_type: 'business',
                is_pos_user: true,
                avatar_url: avatarUrl || account.logo_url || '',
              },
              app_metadata: {
                ...existingPosUser.app_metadata,
                account_type: 'business',
                is_pos_user: true,
              },
            }
          );
          if (updateError) {
            throw new Error(`Could not activate the POS login: ${updateError.message}`);
          }
          posUserId = existingPosUser.id;
        } else if (error || !posUser.user) {
          return jsonResponse(
            { error: `POS login creation failed: ${error?.message || 'No user returned.'}` },
            400
          );
        }
      }
      if (!posUserId) return jsonResponse({ error: 'POS user was not created.' }, 500);

      const { error: posProfileError } = await adminClient.from('user_profiles').upsert(
        {
          id: posUserId,
          email: posEmail,
          full_name: fullName || account.name,
          account_type: 'business',
          avatar_url: avatarUrl || account.logo_url || '',
          is_active: true,
        },
        { onConflict: 'id' }
      );
      if (posProfileError)
        throw new Error(`POS profile creation failed: ${posProfileError.message}`);

      const { error: linkError } = await adminClient
        .from('accounts')
        .update({ pos_user_id: posUserId, pos_email: posEmail })
        .eq('id', account.id);
      if (linkError) throw new Error(`Could not link POS login: ${linkError.message}`);

      return jsonResponse({ success: true, pos_user_id: posUserId });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const accountType = body.account_type;
    const country = typeof body.country === 'string' ? body.country : '';
    const town = typeof body.town === 'string' ? body.town.trim() : '';
    const countryCode = typeof body.country_code === 'string' ? body.country_code : '';
    const currencyCode = typeof body.currency_code === 'string' ? body.currency_code : 'USD';
    const contacts = typeof body.contacts === 'string' ? body.contacts : '';
    const logoUrl = typeof body.logo_url === 'string' ? body.logo_url : '';
    const posEmail =
      accountType === 'business' && typeof body.pos_email === 'string' && body.pos_email.trim()
        ? body.pos_email.trim().toLowerCase()
        : null;

    if (!name || !email || !password || !countryCode) {
      return jsonResponse(
        { error: 'Name, email, password, and country calling code are required.' },
        400
      );
    }
    if (accountType !== 'store' && accountType !== 'business') {
      return jsonResponse({ error: 'account_type must be store or business.' }, 400);
    }
    if (posEmail && posEmail === email) {
      return jsonResponse(
        { error: 'POS email must be different from the main account email.' },
        400
      );
    }

    const { data: mainUser, error: mainCreateError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, account_type: accountType, avatar_url: logoUrl },
      app_metadata: { account_type: accountType },
    });
    if (mainCreateError || !mainUser.user) {
      return jsonResponse(
        { error: mainCreateError?.message || 'Main login creation failed.' },
        400
      );
    }
    const mainUserId = mainUser.user.id;
    createdUserIds.push(mainUserId);

    let posUserId: string | null = null;
    if (accountType === 'business' && posEmail) {
      const { data: posUser, error: posCreateError } = await adminClient.auth.admin.createUser({
        email: posEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          account_type: 'business',
          is_pos_user: true,
          avatar_url: logoUrl,
        },
        app_metadata: { account_type: 'business', is_pos_user: true },
      });
      if (!posCreateError && posUser.user) {
        posUserId = posUser.user.id;
        createdUserIds.push(posUser.user.id);
      } else if (posCreateError && /already|exists|registered/i.test(posCreateError.message)) {
        posUserId = await recoverUnlinkedPosUser(adminClient, {
          email: posEmail,
          password,
          fullName: name,
          avatarUrl: logoUrl,
        });
        if (!posUserId) throw new Error('POS login creation failed without a user.');
      } else {
        throw new Error(
          `POS login creation failed: ${posCreateError?.message || 'No user returned.'}`
        );
      }
    }

    const profiles = [
      {
        id: mainUserId,
        email,
        full_name: name,
        account_type: accountType,
        avatar_url: logoUrl,
        is_active: true,
      },
      ...(posUserId
        ? [
            {
              id: posUserId,
              email: posEmail!,
              full_name: name,
              account_type: 'business',
              avatar_url: logoUrl,
              is_active: true,
            },
          ]
        : []),
    ];
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .upsert(profiles, { onConflict: 'id' });
    if (profileError) throw new Error(`Profile creation failed: ${profileError.message}`);

    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .insert({
        user_id: mainUserId,
        pos_user_id: posUserId,
        name,
        email,
        pos_email: posEmail,
        contacts,
        account_type: accountType,
        country,
        town,
        country_code: countryCode,
        currency_code: currencyCode,
        logo_url: logoUrl,
        status: 'active',
      })
      .select(
        'id, user_id, pos_user_id, name, email, pos_email, account_type, country, town, country_code, currency_code, logo_url, status'
      )
      .single();
    if (accountError) throw new Error(`Account creation failed: ${accountError.message}`);

    const { error: activityError } = await adminClient.from('platform_activities').insert({
      activity_type: 'account_registered',
      title: `New ${accountType} account registered`,
      detail: `${name} (${email}) joined as a ${accountType} account`,
      related_account_id: account.id,
    });
    if (activityError) console.warn('Could not record account activity:', activityError.message);

    return jsonResponse({ success: true, user_id: mainUserId, account });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    if (adminClient) {
      for (const userId of createdUserIds.reverse()) {
        const { error } = await adminClient.auth.admin.deleteUser(userId);
        if (error)
          console.error(`Could not clean up incomplete auth user ${userId}:`, error.message);
      }
    }
    return jsonResponse({ error: message }, 500);
  }
});
