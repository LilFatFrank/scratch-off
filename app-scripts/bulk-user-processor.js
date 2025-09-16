#!/usr/bin/env node

/**
 * Bulk User Processor Script
 * 
 * This script processes a list of users with wallet, fid, username, and pfp data.
 * For each user, it:
 * 1. Creates the user if they don't exist
 * 2. Creates 2 cards for each user (existing or new)
 * 
 * Usage:
 * node scripts/bulk-user-processor.js <input-file.json>
 * 
 * Input file format:
 * [
 *   {
 *     "wallet": "0x...",
 *     "fid": 12345,
 *     "username": "username",
 *     "pfp": "https://..."
 *   },
 *   ...
 * ]
 */

const fs = require('fs');
const path = require('path');

// Import the required modules
const { createClient } = require('@supabase/supabase-js');

// Configuration - Replace these with your actual values
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_SERVICE_KEY = 'YOUR_SUPABASE_SERVICE_KEY_HERE';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE') {
  console.error('❌ Please update the SUPABASE_URL and SUPABASE_SERVICE_KEY in the script');
  console.error('   Edit lines 32-33 in bulk-user-processor.js with your actual values');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Prize drawing function (copied from drawPrize.ts)
function drawPrize() {
  const r = Math.random() * 100;
  if (r < 30) return 0; // 30% lose
  if (r < 40) return -1; // 10% friend win
  if (r < 75) return 0.5; // 35% → 75%
  if (r < 87) return 1; // 12% → 87%
  if (r < 98) return 2; // 11% → 98%
  return 0; // last 2% blank
}

// Generate numbers function (simplified version)
function generateNumbers(params) {
  const {
    prizeAmount,
    prizeAsset = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
    decoyAmounts = [0.5, 1, 2],
    decoyAssets = ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
    friends = []
  } = params;

  const total = 12; // 3 cols x 4 rows
  const cells = new Array(total);
  let winningRow = -1;
  
  if (prizeAmount > 0) {
    winningRow = Math.floor(Math.random() * 4);
    const start = winningRow * 3;
    for (let i = 0; i < 3; i++) {
      cells[start + i] = { amount: prizeAmount, asset_contract: prizeAsset };
    }
  } else if (prizeAmount === -1) {
    winningRow = Math.floor(Math.random() * 4);
    const start = winningRow * 3;
    const randomFriend = friends.length > 0 ? friends[Math.floor(Math.random() * friends.length)] : null;
    
    for (let i = 0; i < 3; i++) {
      cells[start + i] = { 
        amount: -1, 
        asset_contract: '',
        friend_fid: randomFriend?.fid || 0,
        friend_username: randomFriend?.username || '',
        friend_pfp: randomFriend?.pfp || '',
        friend_wallet: randomFriend?.wallet || ''
      };
    }
  }

  // Fill remaining cells as decoys
  for (let row = 0; row < 4; row++) {
    if (row === winningRow) continue;
    
    const rowStart = row * 3;
    const rowEnd = rowStart + 3;
    const rowAmountCounts = {};
    
    for (let i = rowStart; i < rowEnd; i++) {
      let amt;
      let attempts = 0;
      const maxAttempts = 30;
      
      do {
        amt = decoyAmounts[Math.floor(Math.random() * decoyAmounts.length)];
        attempts++;
        if ((rowAmountCounts[amt] || 0) >= 2) {
          amt = 0;
        }
      } while ((rowAmountCounts[amt] || 0) >= 2 && attempts < maxAttempts);
      
      if (attempts >= maxAttempts) {
        amt = decoyAmounts[Math.floor(Math.random() * decoyAmounts.length)];
      }
      
      const asset = decoyAssets[Math.floor(Math.random() * decoyAssets.length)];
      cells[i] = { amount: amt, asset_contract: asset };
      rowAmountCounts[amt] = (rowAmountCounts[amt] || 0) + 1;
    }
  }

  return cells;
}

// Get reveals to next level function
function getRevealsToNextLevel(level) {
  const revealsMap = {
    1: 5,   // Level 1 → 2: 5 reveals
    2: 10,  // Level 2 → 3: 10 reveals
    3: 20,  // Level 3 → 4: 20 reveals
    4: 50,  // Level 4 → 5: 50 reveals
    5: 100, // Level 5 → 6: 100 reveals
  };
  return revealsMap[level] || 100;
}

// Process a single user
async function processUser(userData, index, total) {
  const { wallet, fid, username, pfp } = userData;
  
  console.log(`\n[${index + 1}/${total}] Processing user: ${username || 'Unknown'} (${wallet})`);
  
  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('wallet, fid, username, cards_count')
      .eq('wallet', wallet)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw new Error(`Failed to check user existence: ${fetchError.message}`);
    }

    let user;
    let isNewUser = false;

    if (!existingUser) {
      // Create new user
      console.log('  📝 Creating new user...');
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          wallet: wallet,
          fid: fid,
          username: username,
          pfp: pfp,
          created_at: new Date().toISOString(),
          amount_won: 0,
          cards_count: 0,
          last_active: new Date().toISOString(),
          current_level: 1,
          reveals_to_next_level: getRevealsToNextLevel(1),
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      user = newUser;
      isNewUser = true;
      console.log('  ✅ User created successfully');
    } else {
      // Update existing user
      console.log('  🔄 Updating existing user...');
      const updateData = { last_active: new Date().toISOString() };

      if (fid && !existingUser.fid) {
        updateData.fid = fid;
      }
      if (username && !existingUser.username) {
        updateData.username = username;
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('wallet', wallet)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`);
      }

      user = updatedUser;
      console.log('  ✅ User updated successfully');
    }

    // Create 2 cards for the user
    console.log('  🎴 Creating 2 cards...');
    
    // Get the next card number for this user
    const { data: existingCards, error: countError } = await supabase
      .from('cards')
      .select('card_no')
      .eq('user_wallet', wallet)
      .order('card_no', { ascending: false })
      .limit(1);

    if (countError) {
      throw new Error(`Failed to get card count: ${countError.message}`);
    }

    const startCardNo = existingCards && existingCards.length > 0 
      ? existingCards[0].card_no + 1 
      : 1;

    // Create 2 cards
    const cardsToCreate = [];
    for (let i = 0; i < 2; i++) {
      const prize = drawPrize();
      const prizeAsset = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC
      const numbers = generateNumbers({
        prizeAmount: prize,
        prizeAsset,
        decoyAmounts: [0.5, 1, 2, 5, 10],
        decoyAssets: ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'],
        friends: []
      });

      let shared_to = null;
      if (prize === -1) {
        // Find winning row for friend win
        const winningRow = numbers.findIndex((cell, index) => 
          cell.amount === -1 && index % 3 === 0
        );
        if (winningRow !== -1) {
          shared_to = numbers[winningRow].friend_wallet;
        }
      }

      cardsToCreate.push({
        user_wallet: wallet,
        payment_tx: 'BULK_CREATION',
        prize_amount: prize,
        prize_asset_contract: prizeAsset,
        numbers_json: numbers,
        scratched: false,
        claimed: false,
        created_at: new Date().toISOString(),
        card_no: startCardNo + i,
        shared_to,
      });
    }

    const { data: newCards, error: createError } = await supabase
      .from('cards')
      .insert(cardsToCreate)
      .select();

    if (createError) {
      throw new Error(`Failed to create cards: ${createError.message}`);
    }

    // Update user's cards_count
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        cards_count: startCardNo + 1, // 2 cards created
        last_active: new Date().toISOString()
      })
      .eq('wallet', wallet);

    if (updateError) {
      console.warn(`  ⚠️  Warning: Failed to update user card count: ${updateError.message}`);
    }

    console.log(`  ✅ Created 2 cards (${startCardNo} - ${startCardNo + 1})`);
    
    return {
      success: true,
      user: user,
      isNewUser: isNewUser,
      cardsCreated: 2,
      cardNumbers: [startCardNo, startCardNo + 1]
    };

  } catch (error) {
    console.error(`  ❌ Error processing user: ${error.message}`);
    return {
      success: false,
      error: error.message,
      user: userData
    };
  }
}

// Main processing function
async function processUsers(users) {
  console.log(`🚀 Starting bulk user processing for ${users.length} users...\n`);
  
  const results = {
    total: users.length,
    successful: 0,
    failed: 0,
    newUsers: 0,
    existingUsers: 0,
    totalCardsCreated: 0,
    errors: []
  };

  // Process users in batches to avoid overwhelming the database
  const batchSize = 10;
  const batches = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} users)...`);
    
    // Process batch in parallel
    const batchPromises = batch.map((user, index) => 
      processUser(user, batchIndex * batchSize + index, users.length)
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    // Process results
    batchResults.forEach(result => {
      if (result.success) {
        results.successful++;
        if (result.isNewUser) {
          results.newUsers++;
        } else {
          results.existingUsers++;
        }
        results.totalCardsCreated += result.cardsCreated;
      } else {
        results.failed++;
        results.errors.push({
          user: result.user,
          error: result.error
        });
      }
    });

    // Add a small delay between batches
    if (batchIndex < batches.length - 1) {
      console.log('  ⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// Main execution
async function main() {
  const inputFile = process.argv[2];
  
  if (!inputFile) {
    console.error('❌ Usage: node scripts/bulk-user-processor.js <input-file.json>');
    process.exit(1);
  }

  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    process.exit(1);
  }

  try {
    const fileContent = fs.readFileSync(inputFile, 'utf8');
    const users = JSON.parse(fileContent);

    if (!Array.isArray(users)) {
      throw new Error('Input file must contain an array of user objects');
    }

    if (users.length === 0) {
      console.log('ℹ️  No users to process');
      return;
    }

    // Validate user data structure
    const requiredFields = ['wallet', 'fid', 'username', 'pfp'];
    const invalidUsers = users.filter(user => 
      !requiredFields.every(field => user.hasOwnProperty(field))
    );

    if (invalidUsers.length > 0) {
      console.error(`❌ Found ${invalidUsers.length} users with missing required fields.`);
      console.error('Required fields: wallet, fid, username, pfp');
      process.exit(1);
    }

    const results = await processUsers(users);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 PROCESSING SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${results.total}`);
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`🆕 New users created: ${results.newUsers}`);
    console.log(`🔄 Existing users updated: ${results.existingUsers}`);
    console.log(`🎴 Total cards created: ${results.totalCardsCreated}`);

    if (results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.user.username || 'Unknown'} (${error.user.wallet}): ${error.error}`);
      });
    }

    // Save results to file
    const outputFile = `bulk-processing-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputFile}`);

  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { processUsers, processUser };
