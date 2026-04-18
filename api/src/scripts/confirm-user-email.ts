/**
 * Script to confirm a user's email address in Supabase
 * This bypasses the email confirmation requirement for development/testing
 * 
 * Usage: npx tsx src/scripts/confirm-user-email.ts <email>
 * Example: npx tsx src/scripts/confirm-user-email.ts teial.dickens@gmail.com
 */

import { supabase } from '../config/supabase.js';

async function confirmUserEmail(email: string) {
  try {
    console.log(`🔍 Looking up user with email: ${email}...`);

    // Get user by email using admin API
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    const user = users.users.find((u) => u.email === email);

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      console.log('\nAvailable users:');
      users.users.forEach((u) => {
        console.log(`  - ${u.email} (ID: ${u.id}, Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'})`);
      });
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);

    if (user.email_confirmed_at) {
      console.log('✅ Email is already confirmed!');
      process.exit(0);
    }

    // Confirm the email
    console.log('\n📧 Confirming email address...');
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error('❌ Error confirming email:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Email confirmed successfully!');
    console.log(`\n📝 User details:`);
    console.log(`   Email: ${updatedUser.user.email}`);
    console.log(`   ID: ${updatedUser.user.id}`);
    console.log(`   Confirmed at: ${updatedUser.user.email_confirmed_at}`);
    console.log(`\n✨ You can now authenticate with this user using:`);
    console.log(`   POST https://ljzvgcbtstxozqlvvzaf.supabase.co/auth/v1/token?grant_type=password`);
    console.log(`   Headers: apikey: YOUR_SUPABASE_ANON_KEY`);
    console.log(`   Body: { "email": "${email}", "password": "YOUR_PASSWORD" }`);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email address is required');
  console.log('\nUsage: npx tsx src/scripts/confirm-user-email.ts <email>');
  console.log('Example: npx tsx src/scripts/confirm-user-email.ts teial.dickens@gmail.com');
  process.exit(1);
}

confirmUserEmail(email);



