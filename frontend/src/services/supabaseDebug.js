import { supabase } from './supabase';

export const DEBUG_MODE = true;

export async function testSupabaseConnection() {
  console.log('🔍 [DEBUG] Testing Supabase Connection...');
  
  const checks = {
    envVars: false,
    clientInitialized: false,
    canConnect: false,
    canAuth: false,
    canInsert: null
  };

  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  console.log('📋 [DEBUG] Environment Check:');
  console.log('   URL:', supabaseUrl ? '✅ Set' : '❌ MISSING');
  console.log('   Key:', supabaseKey ? '✅ Set (length: ' + supabaseKey.length + ')' : '❌ MISSING');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ [DEBUG] FATAL: Missing environment variables!');
    console.error('   Add to .env file:');
    console.error('   REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
    console.error('   REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
    return checks;
  }

  checks.envVars = true;
  checks.clientInitialized = true;

  console.log('📡 [DEBUG] Testing database connection...');
  const { data: testData, error: testError } = await supabase
    .from('community_posts')
    .select('id')
    .limit(1);

  if (testError) {
    console.error('❌ [DEBUG] Connection failed:', testError.code, testError.message);
    console.error('   Error details:', JSON.stringify(testError, null, 2));
    
    if (testError.code === 'PGRST301' || testError.message.includes('JWT')) {
      console.error('⚠️  [DEBUG] JWT/Auth error - check if SUPABASE_URL and ANON_KEY are correct');
    }
  } else {
    console.log('✅ [DEBUG] Connection successful');
    checks.canConnect = true;
  }

  console.log('🔐 [DEBUG] Checking authentication...');
  const { data: authData, error: authError } = await supabase.auth.getSession();
  
  if (authError) {
    console.error('❌ [DEBUG] Auth check failed:', authError);
  } else if (authData.session) {
    console.log('✅ [DEBUG] User authenticated:', authData.session.user?.email);
    console.log('   User ID:', authData.session.user?.id);
    checks.canAuth = true;
  } else {
    console.log('⚠️  [DEBUG] No active session (user not logged in)');
    console.log('   This is OK for public reads, but INSERTs will FAIL');
    console.log('   For INSERT to work, either:');
    console.log('   1. Log in first with signIn()');
    console.log('   2. OR disable RLS (see SQL below)');
  }

  return checks;
}

export async function testInsert(tableName, data) {
  console.log('🧪 [DEBUG] Testing INSERT...');
  console.log('   Table:', tableName);
  console.log('   Data:', JSON.stringify(data, null, 2));

  const { data: result, error, status, statusText } = await supabase
    .from(tableName)
    .insert([data])
    .select()
    .single();

  console.log('📊 [DEBUG] INSERT Result:');
  console.log('   Status:', status);
  console.log('   StatusText:', statusText);
  console.log('   Data:', result);
  console.log('   Error:', error);

  if (error) {
    console.error('❌ [DEBUG] INSERT FAILED!');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   Error details:', JSON.stringify(error, null, 2));
    
    switch (error.code) {
      case '42501':
        console.error('🔒 [DEBUG] RLS POLICY DENIED - User not authorized for INSERT');
        console.error('   FIX: Run SQL to allow authenticated users (see below)');
        break;
      case '23503':
        console.error('🔗 [DEBUG] FOREIGN KEY VIOLATION - Check user_id reference');
        break;
      case '23505':
        console.error('🔑 [DEBUG] DUPLICATE KEY - Use upsert instead');
        break;
      case '404':
        console.error('❌ [DEBUG] TABLE NOT FOUND - Check table name spelling');
        break;
      case 'PGRST301':
        console.error('🔐 [DEBUG] PERMISSION DENIED - RLS blocking access');
        break;
      default:
        console.error('❓ [DEBUG] Unknown error - check Supabase dashboard logs');
    }
    
    return { success: false, error };
  }

  console.log('✅ [DEBUG] INSERT SUCCESS!');
  return { success: true, data: result };
}

export async function testSelect(tableName) {
  console.log('🧪 [DEBUG] Testing SELECT...');
  console.log('   Table:', tableName);

  const { data, error, status } = await supabase
    .from(tableName)
    .select('*')
    .limit(5);

  console.log('📊 [DEBUG] SELECT Result:');
  console.log('   Status:', status);
  console.log('   Row count:', data?.length || 0);
  console.log('   Data:', data);
  console.log('   Error:', error);

  if (error) {
    console.error('❌ [DEBUG] SELECT FAILED:', error.code, error.message);
  } else {
    console.log('✅ [DEBUG] SELECT SUCCESS');
  }

  return { data, error };
}

export async function debugInsert(tableName, data) {
  console.log('═══════════════════════════════════════════════');
  console.log('🔍 SUPABASE INSERT DEBUG');
  console.log('═══════════════════════════════════════════════');
  
  const checks = await testSupabaseConnection();
  
  if (!checks.canAuth) {
    console.log('⚠️  [DEBUG] WARNING: User not authenticated');
    console.log('   INSERT will likely fail due to RLS');
    console.log('');
    console.log('   OPTION 1: Log in first');
    console.log('   OPTION 2: Run SQL to disable RLS (temporary)');
    console.log('');
  }

  const insertResult = await testInsert(tableName, data);
  
  console.log('═══════════════════════════════════════════════');
  return insertResult;
}

export function showRLSFixSQL(tableName) {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  RLS FIX SQL - Run in Supabase SQL Editor             ║
╚═══════════════════════════════════════════════════════╝

-- OPTION 1: Allow authenticated users to INSERT (RECOMMENDED)
CREATE POLICY "Allow authenticated insert" ON ${tableName}
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- OPTION 2: Allow anyone (NO AUTH REQUIRED - TESTING ONLY!)
ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;
-- To re-enable: ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;

-- OPTION 3: Allow with user_id match (if using auth.uid())
CREATE POLICY "Allow authenticated insert" ON ${tableName}
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- VERIFY: Check existing policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = '${tableName}';
`);
}

export function showDebugChecklist() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║  SUPABASE DEBUGGING CHECKLIST                         ║
╚═══════════════════════════════════════════════════════╝

□ 1. CHECK BROWSER CONSOLE
   - Look for [DEBUG] prefixed logs
   - Check error codes (42501 = RLS, 404 = table not found)

□ 2. CHECK NETWORK TAB
   - 200 = Success
   - 401 = Not authenticated
   - 403 = RLS policy denied  
   - 404 = Table not found
   - 500 = Server error

□ 3. CHECK SUPABASE DASHBOARD
   - Table Editor: Verify table exists
   - Authentication: Check user is logged in
   - SQL Editor: Check RLS policies
   - Logs: Check any errors

□ 4. VERIFY ENV VARS
   - REACT_APP_SUPABASE_URL
   - REACT_APP_SUPABASE_ANON_KEY
   - Must match Dashboard > Settings > API

□ 5. VERIFY TABLE NAME
   - Exact match (case sensitive)
   - Check for typos
   - Schema should be 'public'

□ 6. TEST MINIMAL INSERT
   - Use testInsert() function
   - Start with simplest data
   - Add fields one by one
`);
}

export const EXAMPLE_SUCCESS = `
✅ SUCCESS EXAMPLE:
{
  data: { id: "uuid-here", user_id: "...", ... },
  error: null
}

✅ NETWORK TAB:
Status: 201 Created
Response: { id: "...", ... }
`;

export const EXAMPLE_FAILURE = `
❌ FAILURE EXAMPLES:

RLS DENIED (code: 42501):
{
  data: null,
  error: {
    code: "42501",
    message: "new row violates row-level security policy",
    details: null,
    hint: null
  }
}

NOT AUTHENTICATED (401):
{
  data: null,
  error: {
    message: "No session",
    status: 401
  }
}

TABLE NOT FOUND (404):
{
  data: null,
  error: {
    code: "42P01",
    message: "relation \"public.table_name\" does not exist"
  }
}
`;
