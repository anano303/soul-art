'use strict';
/**
 * Apply sales_manager role + salesRefCode (PROMO code) to users recovered from chat history.
 *
 * DRY-RUN by default. Pass --apply to actually write.
 *
 * Logic:
 *  - For users with role=user: set role=sales_manager + salesRefCode
 *  - For users already sales_manager/seller_sales_manager: set salesRefCode only if missing
 *  - NEVER changes admins, sellers (unless already SM) without confirmation
 *  - NEVER overwrites an existing salesRefCode
 */

const { MongoClient, ObjectId } = require('mongodb');

const APPLY = process.argv.includes('--apply');
const DB_NAME = 'test';

// Complete SM list extracted from VS Code chat history (28 confirmed entries)
// Source: email/SM_CODE/PROMO_CODE pattern from chat session JSON files
const SM_LIST = [
  { email: 'anakvirikashvili055@gmail.com',    smCode: 'SM_DNGC0492', promoCode: 'PROMO34158' },
  { email: 'earjevanidzee@gmail.com',           smCode: 'SM_IQ62QZ52', promoCode: 'PROMO33276' },
  { email: 'georgeavsa1@gmail.com',             smCode: 'SM_L2ZOG0WF', promoCode: 'PROMO60345' },
  { email: 'hr.higia@gmail.com',                smCode: 'SM_Y0KNB7WW', promoCode: 'PROMO23157' },
  { email: 'iamageorgiansoldier@gmail.com',     smCode: 'SM_HEDUJI7U', promoCode: 'PROMO81750' },
  { email: 'iingushka@gmail.com',               smCode: 'SM_EBFD2K5L', promoCode: 'PROMO42462' },
  { email: 'kristina.kupunia.kris@mail.ru',     smCode: 'SM_BEYVUFWK', promoCode: 'PROMO30335' },
  { email: 'mariammiqo@gmail.com',              smCode: 'SM_S4OGI4G9', promoCode: 'PROMO55728' },
  { email: 'mariamsadgobelashvili09@gmail.com', smCode: 'SM_OMRL54PB', promoCode: 'PROMO99292' },
  { email: 'mayabekauri@gmail.com',             smCode: 'SM_BBZQGUIZ', promoCode: 'PROMO26539' },
  { email: 'mirandasulamanidze2018@gmail.com',  smCode: 'SM_GN9ZDX7R', promoCode: 'PROMO25661' },
  { email: 'mrmgoletiani@gmail.com',            smCode: 'SM_1SN0ZM5W', promoCode: 'PROMO65847' },
  { email: 'ninanm777@gmail.com',               smCode: 'SM_RS7FTEMJ', promoCode: 'PROMO47977' },
  { email: 'sales@gmail.com',                   smCode: 'SM_UQGM42CQ', promoCode: 'PROMO67029' },
  { email: 'salesanni@gmail.com',               smCode: 'SM_53BXL84I', promoCode: 'PROMO30782' },
  { email: 'salokhozrevanidze21@gmail.com',     smCode: 'SM_9XXNJE2X', promoCode: 'PROMO92771' },
  { email: 'tabatadzedali33@gmail.com',         smCode: 'SM_RCO9USSU', promoCode: 'PROMO67909' },
  { email: 'tamari.dardaganidze.1@gmail.com',   smCode: 'SM_Z8EB3EX3', promoCode: 'PROMO41635' },
  { email: 'tamtanarimanidze8@gmail.com',       smCode: 'SM_K2IV7JBX', promoCode: 'PROMO76030' },
  { email: 'tamuna777@yahoo.com',               smCode: 'SM_DLK9DC0B', promoCode: 'PROMO60702' },
  { email: 'teasamadashvili1980@gmail.com',     smCode: 'SM_39GDNCY7', promoCode: 'PROMO19683' },
  { email: 'temurimakaradze@gmail.com',         smCode: 'SM_IK8XCGN3', promoCode: 'PROMO59547' },
  { email: 'teonazarandia29@gmail.com',         smCode: 'SM_Z1SQWDEG', promoCode: 'PROMO81723' },
  { email: 'text2sale@gmail.com',               smCode: 'SM_V1KJDZ63', promoCode: 'PROMO30975' },
  { email: 'tony.johnes@ymail.com',             smCode: 'SM_RKKUAAZ4', promoCode: 'PROMO57317' },
  { email: 'torchinavasophio@gmail.com',        smCode: 'SM_FWCYUWOS', promoCode: 'PROMO63143' },
  { email: 'tsuladzekato@gmail.com',            smCode: 'SM_8BS5XSED', promoCode: 'PROMO31422' },
  { email: 'x.kilasonia97@gmail.com',           smCode: 'SM_0YGAEH90', promoCode: 'PROMO66563' },
];

const SM_ROLES = new Set(['sales_manager', 'seller_sales_manager']);
// Roles that should NOT be changed to sales_manager (too risky without manual confirmation)
const PROTECTED_ROLES = new Set(['admin', 'seller', 'blogger', 'auction_admin']);

async function main() {
  const uri = process.env.MONGODB_URI;
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);
  const col = db.collection('users');

  console.log(`Mode: ${APPLY ? '⚡ APPLY' : '🔍 DRY-RUN'}`);
  console.log(`SM entries to process: ${SM_LIST.length}\n`);

  // Preflight: check for salesRefCode collisions in DB
  const allPromoCodes = SM_LIST.map(s => s.promoCode);
  const existing = await col.find(
    { salesRefCode: { $in: allPromoCodes } },
    { projection: { email: 1, salesRefCode: 1, role: 1 } }
  ).toArray();
  if (existing.length > 0) {
    console.log('⚠️  salesRefCode conflicts (these already exist in DB):');
    existing.forEach(u => console.log(`   ${u.email} | salesRefCode=${u.salesRefCode} | role=${u.role}`));
    console.log('');
  }
  const existingCodes = new Set(existing.map(u => u.salesRefCode));

  let roleUpdateCount = 0;
  let promoUpdateCount = 0;
  let skippedProtected = 0;
  let notFound = 0;

  const roleUpdates = [];
  const promoOnlyUpdates = [];
  const skipped = [];
  const missing = [];

  for (const sm of SM_LIST) {
    const user = await col.findOne(
      { email: new RegExp('^' + sm.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
      { projection: { _id: 1, email: 1, role: 1, salesRefCode: 1, phoneNumber: 1, name: 1 } }
    );

    if (!user) {
      missing.push(sm.email);
      notFound++;
      continue;
    }

    const isAlreadySM = SM_ROLES.has(user.role);
    const isProtected = PROTECTED_ROLES.has(user.role);
    const hasPromoCode = !!user.salesRefCode;
    const promoConflict = existingCodes.has(sm.promoCode) && user.salesRefCode !== sm.promoCode;

    if (isProtected && !isAlreadySM) {
      skipped.push({ email: user.email, reason: `Protected role: ${user.role}`, smEntry: sm });
      skippedProtected++;
      continue;
    }

    const needsRoleUpdate = !isAlreadySM;
    const needsPromoUpdate = !hasPromoCode && !promoConflict;

    if (!needsRoleUpdate && !needsPromoUpdate) {
      console.log(`✅ Already complete: ${user.email} | role=${user.role} | salesRefCode=${user.salesRefCode}`);
      continue;
    }

    const update = {};
    if (needsRoleUpdate) {
      update.role = 'sales_manager';
      roleUpdates.push({ email: user.email, smCode: sm.smCode, promoCode: sm.promoCode, currentRole: user.role });
    }
    if (needsPromoUpdate) {
      update.salesRefCode = sm.promoCode;
      promoOnlyUpdates.push({ email: user.email, promoCode: sm.promoCode });
    } else if (hasPromoCode) {
      console.log(`  ℹ️  ${user.email}: salesRefCode already set to ${user.salesRefCode}, keeping it`);
    } else if (promoConflict) {
      console.log(`  ⚠️  ${user.email}: PROMO ${sm.promoCode} already used by another user, skipping salesRefCode`);
    }

    if (Object.keys(update).length > 0) {
      console.log(`  ${APPLY ? '→ UPDATING' : '→ WOULD UPDATE'}: ${user.email}`);
      console.log(`      role: ${user.role} → ${update.role || user.role}`);
      if (update.salesRefCode) console.log(`      salesRefCode: (none) → ${update.salesRefCode}`);
      console.log(`      smCode: ${sm.smCode}`);

      if (APPLY) {
        await col.updateOne(
          { _id: user._id },
          { $set: update }
        );
      }
    }

    if (needsRoleUpdate) roleUpdateCount++;
    if (needsPromoUpdate) promoUpdateCount++;
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Role updates (→ sales_manager):  ${roleUpdateCount}`);
  console.log(`salesRefCode updates (PROMO set): ${promoUpdateCount}`);
  console.log(`Skipped (protected role):         ${skippedProtected}`);
  console.log(`Not found in DB:                  ${notFound}`);

  if (skipped.length) {
    console.log('\nSKIPPED (protected roles):');
    skipped.forEach(s => console.log(`  ${s.email} | ${s.reason} | would-be promo: ${s.smEntry.promoCode}`));
  }
  if (missing.length) {
    console.log('\nNOT IN DB:');
    missing.forEach(e => console.log(`  ${e}`));
  }

  if (!APPLY) {
    console.log('\n💡 Run with --apply to execute the updates.');
  } else {
    console.log('\n✅ Updates applied to DB.');
  }

  await client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
