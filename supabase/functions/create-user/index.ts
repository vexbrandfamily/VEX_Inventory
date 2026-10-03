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
    const {
      action,
      account_id,
      name,
      email,
      password,
      account_type,
      country,
      town,
      contacts,
      country_code,
      currency_code,
      logo_url,
    } = body;

    if (action === 'delete_account') {
      if (typeof account_id !== 'string' || !account_id) {
        return new Response(JSON.stringify({ error: 'Missing account_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: accountToDelete, error: lookupError } = await adminClient
        .from('accounts')
        .select('id, user_id')
        .eq('id', account_id)
        .maybeSingle();
      if (lookupError || !accountToDelete) {
        return new Response(
          JSON.stringify({ error: lookupError?.message || 'Account not found' }),
          {
            status: lookupError ? 500 : 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { error: deleteAccountError } = await adminClient
        .from('accounts')
        .delete()
        .eq('id', account_id);
      if (deleteAccountError) {
        return new Response(
          JSON.stringify({ error: `Account deletion failed: ${deleteAccountError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (accountToDelete.user_id) {
        const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
          accountToDelete.user_id
        );
        if (deleteUserError) {
          return new Response(
            JSON.stringify({
              error: `Account was deleted, but its login could not be removed: ${deleteUserError.message}`,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    if (!normalizedEmail) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      email: normalizedEmail,
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

    let user = newUser?.user;
    let reusedExistingUser = false;

    if (createError) {
      const pageSize = 1000;
      let existingUser: {
        id: string;
        email?: string;
        user_metadata: Record<string, unknown>;
        app_metadata: Record<string, unknown>;
      } | null = null;
      for (let page = 1; !existingUser; page += 1) {
        const { data: users, error: listError } = await adminClient.auth.admin.listUsers({
          page,
          perPage: pageSize,
        });
        if (listError) {
          return new Response(
            JSON.stringify({ error: `Could not check existing users: ${listError.message}` }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        existingUser =
          users.users.find(
            (candidate: NonNullable<typeof existingUser>) =>
              candidate.email?.trim().toLowerCase() === normalizedEmail.toLowerCase()
          ) || null;
        if (existingUser || users.users.length < pageSize) break;
      }

      if (!existingUser) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: existingAccount, error: existingAccountError } = await adminClient
        .from('accounts')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();
      if (existingAccountError) {
        return new Response(
          JSON.stringify({
            error: `Could not check existing account: ${existingAccountError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const { data: existingProfile, error: existingProfileError } = await adminClient
        .from('user_profiles')
        .select('account_type')
        .eq('id', existingUser.id)
        .maybeSingle();
      if (existingProfileError) {
        return new Response(
          JSON.stringify({
            error: `Could not check existing profile: ${existingProfileError.message}`,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const previousAccountTypes = [
        existingProfile?.account_type,
        existingUser.user_metadata?.account_type,
        existingUser.app_metadata?.account_type,
      ];
      const wasManagedAccount = previousAccountTypes.some(
        (type) => type === 'store' || type === 'business'
      );
      if (existingAccount || !wasManagedAccount) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: updatedUser, error: updateUserError } =
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            ...existingUser.user_metadata,
            full_name: name,
            account_type,
            avatar_url: logo_url || '',
          },
          app_metadata: {
            ...existingUser.app_metadata,
            account_type,
          },
        });
      if (updateUserError) {
        return new Response(
          JSON.stringify({ error: `Could not restore previous login: ${updateUserError.message}` }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      user = updatedUser.user;
      reusedExistingUser = true;
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'User creation did not return a user' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    const { error: profileError } = await adminClient.from('user_profiles').upsert(
      {
        id: userId,
        email: normalizedEmail,
        full_name: name,
        account_type,
        avatar_url: logo_url || '',
        is_active: true,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      if (!reusedExistingUser) await adminClient.auth.admin.deleteUser(userId);
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
        email: normalizedEmail,
        contacts: contacts || '',
        account_type,
        country: country || '',
        town: town || '',
        country_code: country_code || '',
        currency_code: currency_code || 'USD',
        logo_url: logo_url || '',
        status: 'active',
      })
      .select(
        'id, user_id, name, email, contacts, account_type, country, town, country_code, currency_code, logo_url, status'
      )
      .single();

    if (accountError) {
      if (!reusedExistingUser) await adminClient.auth.admin.deleteUser(userId);
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
