// Georgian to English transliteration mapping
const georgianToEnglishMap: { [key: string]: string } = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
  'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
  'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
  'ქ': 'q', 'ღ': 'gh', 'ყ': 'y', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
  'წ': 'w', 'ჭ': 'j', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

export function transliterateGeorgian(text: string): string {
  return text.replace(/[\u10A0-\u10FF]/g, (char) => {
    return georgianToEnglishMap[char] || char;
  });
}

export function hasGeorgianCharacters(text: string): boolean {
  return /[\u10A0-\u10FF]/.test(text);
}

export function generateSlugFromEmail(email: string): string {
  // Extract username part from email (before @)
  let username = email.split('@')[0];
  
  // Transliterate Georgian characters to English
  if (hasGeorgianCharacters(username)) {
    username = transliterateGeorgian(username);
  }
  
  // Clean and format the username
  return username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
    .slice(0, 20); // Limit to 20 characters
}

export function generateSlugFromStoreName(storeName: string): string {
  let cleanName = storeName;
  
  // Transliterate Georgian characters to English
  if (hasGeorgianCharacters(cleanName)) {
    cleanName = transliterateGeorgian(cleanName);
  }
  
  return cleanName
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters, keep alphanumeric and spaces
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Keep only letters and numbers
    .slice(0, 20); // Limit to 20 characters
}

export function generateSlugFromName(name: string): string {
  let cleanName = name;
  
  // Transliterate Georgian characters to English
  if (hasGeorgianCharacters(cleanName)) {
    cleanName = transliterateGeorgian(cleanName);
  }
  
  return cleanName
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters, keep alphanumeric and spaces
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^a-z0-9]/g, '') // Keep only letters and numbers
    .slice(0, 20); // Limit to 20 characters
}

export function generateBaseArtistSlug(
  storeName?: string,
  email?: string,
  name?: string
): string {
  // Priority 1: Try to use storeName if available and meaningful
  if (storeName && storeName.trim().length > 2) {
    return generateSlugFromStoreName(storeName.trim());
  }
  
  // Priority 2: Use email username
  if (email) {
    return generateSlugFromEmail(email);
  }
  
  // Priority 3: Use user name as fallback
  if (name && name.trim().length > 2) {
    return generateSlugFromName(name.trim());
  }
  
  // Last resort: default
  return 'artist';
}