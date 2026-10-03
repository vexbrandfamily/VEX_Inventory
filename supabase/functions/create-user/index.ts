// @ts-ignore: Deno is available in the Supabase Edge Functions runtime
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    const {
      data: { user: callerUser },
      error: callerError,
    } = await adminClient.auth.getUser(accessToken);
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerMember } = await adminClient
      .from('accounts')
      .select('id, account_type')
      .eq('user_id', callerUser.id)
      .in('account_type', ['store', 'business'])
      .maybeSingle();

    const { data: callerProfile } = await adminClient
      .from('user_profiles')
      .select('account_type')
      .eq('id', callerUser.id)
      .maybeSingle();

    const isAdminByProfile = callerProfile?.account_type === 'admin';
    const isAdminByMeta =
      callerUser.user_metadata?.account_type === 'admin' ||
      callerUser.app_metadata?.account_type === 'admin';

    // Platform admin = Auth user who is not a store/business member.
    // A missing user_profiles row is normal for admins created in the Auth dashboard.
    const isAdmin = isAdminByProfile || isAdminByMeta || !callerMember;

    if (!isAdmin) {
      return new Response(
        JSON.stringify({
          error: 'Only admins can create accounts',
          detail: `The signed-in user is registered as ${callerMember?.account_type || 'a member'} (${callerUser.email || 'unknown email'}).`,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!isAdminByProfile) {
      await adminClient.from('user_profiles').upsert(
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
    }

    const body = await req.json();
    const { name, email, password, account_type, country, country_code, currency_code, logo_url } =
      body;

    if (!name || !email || !password || !account_type || !country_code) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: name, email, password, account_type, country_code',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (account_type !== 'store' && account_type !== 'business') {
      return new Response(JSON.stringify({ error: 'account_type must be store or business' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        account_type,
        avatar_url: logo_url || '',
      },
      app_metadata: {
        account_type,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = newUser.user.id;

    const { error: profileError } = await adminClient.from('user_profiles').upsert(
      {
        id: userId,
        email,
        full_name: name,
        account_type,
        avatar_url: logo_url || '',
        is_active: true,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Profile creation failed: ${profileError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .insert({
        user_id: userId,
        name,
        email,
        account_type,
        country: country || '',
        country_code: country_code || '',
        currency_code: currency_code || 'USD',
        logo_url: logo_url || '',
        status: 'active',
      })
      .select('id, user_id, name, email, account_type, country, country_code, currency_code, logo_url, status')
      .single();

    if (accountError) {
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Account creation failed: ${accountError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await adminClient.from('platform_activities').insert({
      activity_type: 'account_registered',
      title: `New ${account_type} account registered`,
      detail: `${name} (${email}) joined as a ${account_type} account`,
      related_account_id: account.id,
    });

    return new Response(JSON.stringify({ success: true, user_id: userId, account }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
