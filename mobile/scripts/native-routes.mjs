export const OWNER_EXCLUDED_ROUTES = ['/ky', '/safety-diary', '/site-records/near-miss', '/e-learning/exams', '/exam-quiz'];
export const isOwnerExcludedRoute = route => OWNER_EXCLUDED_ROUTES.some(prefix => route === prefix || route.startsWith(`${prefix}/`));
