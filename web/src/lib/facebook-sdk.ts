/**
 * Facebook SDK ჩატვირთვის სტატუსის შემოწმება
 */
export function checkFacebookSDK(): { loaded: boolean; status: string } {
  if (typeof window === 'undefined') {
    return { loaded: false, status: 'სერვერზე გაშვებულია' };
  }
  
  // შევამოწმოთ FB ობიექტი
  if (!window.FB) {
    return { loaded: false, status: 'FB ობიექტი არ არსებობს' };
  }
  
  // შევამოწმოთ საჭირო მეთოდები
  if (!window.FB.init) {
    return { loaded: false, status: 'FB.init მეთოდი არ არის ხელმისაწვდომი' };
  }
  
  if (!window.FB.XFBML || !window.FB.XFBML.parse) {
    return { loaded: false, status: 'FB.XFBML.parse მეთოდი არ არის ხელმისაწვდომი' };
  }
  
  const fbRoot = document.getElementById('fb-root');
  if (!fbRoot) {
    return { loaded: false, status: 'fb-root ელემენტი არ არსებობს DOM-ში' };
  }
  
  // შევამოწმოთ Messenger ჩეთის ელემენტი
  const chatElement = document.querySelector('.fb-customerchat');
  if (!chatElement) {
    return { loaded: false, status: 'fb-customerchat ელემენტი არ არსებობს DOM-ში' };
  }
  
  return { loaded: true, status: 'Facebook SDK სრულადაა ჩატვირთული' };
}

/**
 * Facebook SDK-ის ხელახლა ინიციალიზაცია
 */
export function reinitializeFacebookSDK(): void {
  if (typeof window === 'undefined' || !window.FB) {
    console.log('Facebook SDK ვერ მოიძებნა');
    return;
  }
  
  try {
    // ხელახლა გავაანალიზოთ XFBML
    window.FB.XFBML.parse();
    console.log('Facebook XFBML ხელახლა გაანალიზდა');
  } catch (error) {
    console.error('Facebook XFBML ხელახალი ანალიზისას შეცდომა მოხდა:', error);
  }
}
