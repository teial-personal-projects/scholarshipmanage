/**
 * Helper script to generate a test JWT token for the existing user
 * Run with: npx tsx src/scripts/get-test-token.ts
 */

import { supabase } from '../config/supabase.js';

async function getTestToken() {
  // Get the existing user from database
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', 1)
    .single();

  if (profileError || !userProfile) {
    console.error('❌ User profile not found:', profileError);
    process.exit(1);
  }

  console.log('✅ Found user profile:', {
    id: userProfile.id,
    email: userProfile.email_address,
    authUserId: userProfile.auth_user_id,
  });

  console.log('\n📝 To test the API, you need to:');
  console.log('1. Log in through the frontend to get a real JWT token');
  console.log('2. Or use Supabase auth to sign in with email/password');
  console.log('\nFor now, test with:');
  console.log(`  EMAIL: ${userProfile.email_address}`);
  console.log('  You need to set a password in Supabase Auth dashboard\n');

  process.exit(0);
}

getTestToken();
