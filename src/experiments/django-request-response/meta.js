export const meta = {
  slug: 'django-request-response',
  title: 'Django Request–Response Cycle',

  // Breadcrumb trail above the experiment's own entry. `href: null` renders plain text.
  breadcrumb: [
    { label: 'Computer Science and Engineering', href: null }, // TODO: domain URL
    { label: 'Python', href: null }, // TODO: lab URL
    { label: 'Django', href: null }, // TODO: Django lab/section URL
  ],
  breadcrumbLabel: 'Request–Response Cycle',

  // Rate Me opens a popup. With a backend the rating is saved for the signed-in student;
  // without one it is kept on the page only.
  // Optional external Report a Bug URL. When null and a backend is set, the built-in form is used.
  bugReportUrl: null,
  // TODO: average rating (0-5). null shows unrated (outline) stars until the
  // visitor rates the experiment; then the header shows their own rating.
  rating: null,

  // Posttest levels, in the order the level picker shows them.
  posttestLevels: ['easy', 'medium', 'hard'],

  tabs: [
    { slug: 'aim', label: 'Aim' },
    { slug: 'theory', label: 'Theory' },
    { slug: 'pretest', label: 'Pretest' },
    { slug: 'procedure', label: 'Procedure' },
    { slug: 'simulation', label: 'Simulation' },
    { slug: 'posttest', label: 'Posttest' },
    { slug: 'references', label: 'References' },
    { slug: 'contributors', label: 'Contributors' },
    { slug: 'feedback', label: 'Feedback' },
  ],
}

export const basePath = `/experiments/${meta.slug}`
