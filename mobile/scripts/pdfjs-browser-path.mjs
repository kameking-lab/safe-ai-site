/** PDF.js embeds its build-machine URL in a Node-only canvas fallback.
 * The exported bundle runs in WKWebView. Keep that unreachable fallback free of host paths.
 */
export function sanitizePdfjsBrowserPath(source){
  if(!source.includes('@napi-rs/canvas'))return source;
  return source.replace(/\.createRequire\((['"])file:\/\/\/[^'"]+\1\)/g,'.createRequire("file:///anzen-native/pdfjs.mjs")');
}
