const PAGE_ID = '542501458957000';
const ACCESS_TOKEN =
  'EAAh5uzqZCKRIBP22uG9wc5sKNWz53S9gfuRzehCmVDcZAX6grP5X9XHU0eNY7wNoos9vXKc9Toq4qN2tXioAiGwalBZC93NQOj4u4nCE4doJQ2Rwp9HPH5Md4jUD0qIZAHoNoVjBHNZBa7xZCeByKykCXzxhe8ZAZCwSUupRku3qqiWv7vdUe068UX8ZBoutrK7n6ZAaBi';

async function main() {
  const url = new URL(`https://graph.facebook.com/v19.0/${PAGE_ID}/posts`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  url.searchParams.set('limit', '100');
  url.searchParams.set('fields', 'id,message,created_time');

  const res = await fetch(url.toString());
  const data = await res.json();

  let count = 0;
  for (const post of data.data) {
    if (post.message && post.message.toLowerCase().includes('gskkart')) {
      count++;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`POST ${count} (${post.created_time})`);
      console.log('='.repeat(60));
      console.log(post.message);
      if (count >= 3) break;
    }
  }
}
main().catch(console.error);
