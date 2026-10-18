// Site-wide settings shared by every experiment.

export const feedback = {
  formUrl: null, // TODO: Google Form URL for the Feedback tab
  signature: 'The Virtual Labs Team', // TODO: confirm sign-off (reference wording)
}

export const footer = {
  communityLinks: [
    { label: 'Somaiya Vidyavihar University', href: 'https://www.somaiya.edu/' },
    { label: 'Virtual Labs', href: 'https://www.vlab.co.in/' },
    // TODO: further community links
  ],
  contact: {
    phone: 'TODO', // TODO: contact phone number
    email: 'TODO', // TODO: contact email address
  },
  // Official accounts, as linked from https://www.somaiya.edu/en/contact-us
  social: [
    { network: 'twitter', label: 'Somaiya Vidyavihar University on X (Twitter)', href: 'https://twitter.com/Somaiya_SVU/', color: '#55acee' },
    { network: 'facebook', label: 'Somaiya Vidyavihar on Facebook', href: 'https://www.facebook.com/pages/Somaiya-Vidyavihar/122977847737512/', color: '#3b5998' },
    { network: 'youtube', label: 'Somaiya Vidyavihar on YouTube', href: 'https://www.youtube.com/c/SomaiyaVidyavihar-Mumbai', color: '#e52d27' },
    { network: 'linkedin', label: 'Somaiya Vidyavihar University on LinkedIn', href: 'https://www.linkedin.com/school/somaiya-vidyavihar-university/', color: '#2867b2' },
  ],
  // TODO: confirm these licences apply to this project (copied from the reference site).
  licences: [
    { label: 'AGPL 3.0', href: 'https://www.gnu.org/licenses/agpl-3.0.en.html' },
    { label: 'Creative Commons (CC BY-NC-SA 4.0)', href: 'https://creativecommons.org/licenses/by-nc-sa/4.0/' },
  ],
}
