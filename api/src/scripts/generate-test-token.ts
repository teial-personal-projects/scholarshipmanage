/**
 * Generate a test JWT token using Supabase admin
 * Run with: npx tsx src/scripts/generate-test-token.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

async function generateToken() {
  const supabaseAdmin = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const testEmail = 'teial.dickens@gmail.com';
  const testPassword = 'TestPassword123!';

  try {
    // Try to create/update the user with a known password
    const { error: userError } = await supabaseAdmin.auth.admin.updateUserById(
      'fcb86d3c-aa8c-4245-931b-a584ac4afbe0',
      {
        password: testPassword,
        email_confirm: true,
      }
    );

    if (userError) {
      console.error('❌ Error updating user:', userError);
      process.exit(1);
    }

    console.log('✅ User password set successfully!');
    console.log('\n📝 Now sign in to get token:');
    console.log(`\nEmail: ${testEmail}`);
    console.log(`Password: ${testPassword}\n`);

    // Now sign in to get the token
    const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error('❌ Error signing in:', signInError);
      console.log('\nTry manually with:');
      console.log(`curl -X POST 'https://ljzvgcbtstxozqlvvzaf.supabase.co/auth/v1/token?grant_type=password' \\`);
      console.log(`  -H 'apikey: YOUR_ANON_KEY' \\`);
      console.log(`  -H 'Content-Type: application/json' \\`);
      console.log(`  -d '{"email":"${testEmail}","password":"${testPassword}"}'`);
      process.exit(1);
    }

    console.log('✅ Token generated successfully!\n');
    console.log('🔑 Access Token:');
    console.log(session.session?.access_token || 'No token');
    console.log('\n📝 Test with:');
    console.log(`export TOKEN="${session.session?.access_token}"`);
    console.log(`curl http://localhost:3001/api/applications -H "Authorization: Bearer $TOKEN"`);
    console.log('');
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

generateToken();
