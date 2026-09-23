export const LIST_PREFIX = "anzen-ai:safety-sign-list:v1:";
export const RETURN_PATH_KEY = "anzen-ai:safety-sign-return:v1";
export const HUB_PATH = "/materials/safety-images";

export function isLibraryPath(path: string): boolean {
  return path === HUB_PATH || /^\/materials\/safety-images\/category\/[a-z-]+$/u.test(path);
}

export function listStorageKey(path: string): string {
  return `${LIST_PREFIX}${path}`;
}
