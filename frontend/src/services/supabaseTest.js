import { supabase } from './supabase';

export const TEST_MODE = true;

export async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         SUPABASE DEBUG TEST - RUNNING ALL CHECKS             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  await test1_Environment();
  await test2_Connection();
  await test3_AuthStatus();
  await test4_PublicRead();
  await test5_AuthenticatedInsert();
  
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                        TEST SUMMARY                            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('If tests 1-4 passed but test 5 failed:');
  console.log('  → RLS is blocking inserts (most common issue)');
  console.log('  → Run the SQL fix below in Supabase SQL Editor');
  console.log('');
  console.log('If test 2 failed:');
  console.log('  → Check your REACT_APP_SUPABASE_URL and ANON_KEY');
  console.log('  → Verify project exists in Supabase dashboard');
  console.log('');
  console.log('If test 3 shows "No session":');
  console.log('  → User is not logged in');
  console.log('  → Log in first before inserting data');
  console.log('');
}

async function test1_Environment() {
  console.log('TEST 1: Environment Variables');
  console.log('─'.repeat(60));
  
  const url = process.env.REACT_APP_SUPABASE_URL;
  const key = process.env.REACT_APP_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.log('❌ FAIL: Missing environment variables');
    console.log('   Add to your .env file:');
    console.log('   REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
    console.log('   REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
    return false;
  }
  
  console.log('✅ PASS: Environment variables set');
  console.log('   URL:', url.substring(0, 30) + '...');
  console.log('   Key length:', key.length, 'chars');
  return true;
}

async function test2_Connection() {
  console.log('');
  console.log('TEST 2: Database Connection');
  console.log('─'.repeat(60));
  
  try {
    const { data, error } = await supabase.from('community_posts').select('id').limit(1);
    
    if (error) {
      console.log('❌ FAIL: Cannot connect to database');
      console.log('   Error:', error.message);
      console.log('   Code:', error.code);
      return false;
    }
    
    console.log('✅ PASS: Connected to database');
    return true;
  } catch (err) {
    console.log('❌ FAIL: Connection exception');
    console.log('   Error:', err.message);
    return false;
  }
}

async function test3_AuthStatus() {
  console.log('');
  console.log('TEST 3: Authentication Status');
  console.log('─'.repeat(60));
  
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.log('⚠️  WARNING: Auth check error:', error.message);
  }
  
  if (data.session) {
    console.log('✅ PASS: User is authenticated');
    console.log('   Email:', data.session.user?.email);
    console.log('   User ID:', data.session.user?.id);
  } else {
    console.log('⚠️  INFO: No active session (not logged in)');
    console.log('   This is OK for public reads,');
    console.log('   but INSERT operations will likely fail');
  }
  
  return !!data.session;
}

async function test4_PublicRead() {
  console.log('');
  console.log('TEST 4: Public Read (SELECT)');
  console.log('─'.repeat(60));
  
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .limit(3);
  
  if (error) {
    console.log('❌ FAIL: Cannot read from table');
    console.log('   Error:', error.code, error.message);
    
    if (error.code === 'PGRST301') {
      console.log('   → RLS is blocking SELECT');
      console.log('   → Run: ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;');
    }
    return false;
  }
  
  console.log('✅ PASS: Can read from table');
  console.log('   Rows found:', data?.length || 0);
  return true;
}

async function test5_AuthenticatedInsert() {
  console.log('');
  console.log('TEST 5: Authenticated INSERT');
  console.log('─'.repeat(60));
  
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData.session) {
    console.log('⚠️  SKIP: No user logged in');
    console.log('   Log in first, then re-run this test');
    return null;
  }
  
  const testData = {
    user_id: sessionData.session.user.id,
    content: 'TEST POST - Can be deleted',
    location: null
  };
  
  const { data, error, status } = await supabase
    .from('community_posts')
    .insert([testData])
    .select()
    .single();
  
  console.log('   Status code:', status);
  
  if (error) {
    console.log('❌ FAIL: Cannot insert row');
    console.log('   Error code:', error.code);
    console.log('   Error message:', error.message);
    
    if (error.code === '42501') {
      console.log('');
      console.log('   🔒 RLS POLICY DENIED!');
      console.log('   → The user is logged in but RLS is blocking INSERT');
      console.log('   → Run this SQL in Supabase SQL Editor:');
      console.log('');
      console.log('   ALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('   Or create a proper policy:');
      console.log('   CREATE POLICY "authenticated_insert" ON community_posts');
      console.log('   FOR INSERT WITH CHECK (auth.role() = \\'authenticated\\');');
    }
    
    return false;
  }
  
  console.log('✅ PASS: Can insert rows');
  console.log('   Inserted ID:', data?.id);
  
  if (data?.id) {
    await supabase.from('community_posts').delete().eq('id', data.id);
    console.log('   (Test row deleted)');
  }
  
  return true;
}

export async function quickInsertTest() {
  console.log('');
  console.log('QUICK INSERT TEST');
  console.log('─'.repeat(60));
  
  const { data: sessionData } = await supabase.auth.getSession();
  
  if (!sessionData.session) {
    console.log('❌ No user logged in - cannot test insert');
    return { success: false, error: 'NOT_AUTHENTICATED' };
  }
  
  const { data, error } = await supabase
    .from('community_posts')
    .insert([{
      user_id: sessionData.session.user.id,
      content: 'Quick test - ' + new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) {
    console.log('❌ Insert failed:', error.code, error.message);
    return { success: false, error };
  }
  
  console.log('✅ Insert success! ID:', data.id);
  
  await supabase.from('community_posts').delete().eq('id', data.id);
  
  return { success: true, data };
}

window.runAllTests = runAllTests;
window.quickInsertTest = quickInsertTest;
