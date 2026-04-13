const PAGE_ID = '542501458957000';
const ACCESS_TOKEN =
  'EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi';

async function main() {
  // Get first gskkart post
  const url = new URL(`https://graph.facebook.com/v19.0/${PAGE_ID}/posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message,created_time');

  const res = await fetch(url.toString());
  const data = await res.json();

  // Find first gskkart post
  const post = data.data.find(
    (p) => p.message && p.message.toLowerCase().includes('gskkart'),
  );
  if (!post) {
    console.log('No post found');
    return;
  }

  console.log('Post ID:', post.id);
  console.log('Post message:', post.message);

  // Fetch comments on this post
  const commUrl = new URL(
    `https://graph.facebook.com/v19.0/${post.id}/comments`,
  );
  commUrl.searchParams.set('access_token', ACCESS_TOKEN);
  commUrl.searchParams.set('fields', 'id,message,from');
  commUrl.searchParams.set('limit', '10');

  const commRes = await fetch(commUrl.toString());
  const commData = await commRes.json();

  console.log('\n--- Comments ---');
  if (commData.data) {
    for (const c of commData.data) {
      console.log(`From: ${c.from?.name || 'unknown'}`);
      console.log(`Message: ${c.message}`);
      console.log('---');
    }
  } else {
    console.log('No comments or error:', JSON.stringify(commData));
  }

  // Also check all gskkart posts - do any have description in the message?
  console.log('\n\n=== Checking ALL gskkart posts for description text ===');
  let idx = 0;
  for (const p of data.data) {
    if (!p.message || !p.message.toLowerCase().includes('gskkart')) continue;
    idx++;
    const lines = p.message.split('\n').filter((l) => l.trim());
    // Find lines that are NOT emoji-prefixed structured fields
    const descLines = lines.filter((l) => {
      const t = l.trim();
      return (
        !t.startsWith('📌') &&
        !t.startsWith('✍️') &&
        !t.startsWith('✅') &&
        !t.startsWith('🖼️') &&
        !t.startsWith('🎨') &&
        !t.startsWith('📏') &&
        !t.startsWith('💰') &&
        !t.startsWith('🔻') &&
        !t.startsWith('⏳') &&
        !t.startsWith('🔗') &&
        !t.startsWith('👤') &&
        !t.startsWith('#') &&
        t.length > 5
      ); // ignore short decorator lines
    });
    if (descLines.length > 0) {
      console.log(`\nPost ${idx}: HAS description-like text:`);
      descLines.forEach((l) => console.log(`  "${l}"`));
    } else {
      console.log(`Post ${idx}: No description text`);
    }
  }
}
main().catch(console.error);
