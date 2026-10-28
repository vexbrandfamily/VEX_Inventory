type ManagedAccountInput = {
  name: string;
  email: string;
  pos_email?: string | null;
  contacts: string;
  password: string;
  account_type: 'store' | 'business';
  country: string;
  town: string;
  country_code: string;
  currency_code: string;
  logo_url?: string;
};

type CreatePosLoginInput = {
  account_id: string;
  main_email: string;
  pos_email: string;
  password: string;
  full_name: string;
  avatar_url?: string;
};

async function invokeAccountFunction(
  adminClient: any,
  body: ManagedAccountInput | ({ action: 'create_pos_login' } & CreatePosLoginInput)
) {
  const { data, error } = await adminClient.functions.invoke('create-user', { body });
  if (error) {
    const context = (error as { context?: Response }).context;
    const responseBody = context
      ? ((await context
          .clone()
          .json()
          .catch(() => null)) as { error?: string } | null)
      : null;
    throw new Error(responseBody?.error || `Account creation failed: ${error.message}`);
  }
  if (data?.error) throw new Error(data.error);
  if (!data?.success) throw new Error('Account creation failed without a success response.');
  return data;
}

export async function createManagedAccount(adminClient: any, input: ManagedAccountInput) {
  return invokeAccountFunction(adminClient, input);
}

export async function createPosManagedUser(
  adminClient: any,
  input: CreatePosLoginInput
): Promise<string> {
  const data = await invokeAccountFunction(adminClient, { ...input, action: 'create_pos_login' });
  if (typeof data.pos_user_id !== 'string') {
    throw new Error('POS login was created without a linked Auth user.');
  }
  return data.pos_user_id;
}
