const ESCAPED_HTML_REGEX =
  /&lt;\s*\/?\s*(?:div|table|thead|tbody|tr|td|th|p|h[1-6]|span|strong|b|i|em|u|ul|ol|li|br|hr|style|section|header|footer|article|img|a|!doctype|html|body)\b[^&]*&gt;/i;

/**
 * Unescapes HTML code that was pasted into a Rich Text Editor (e.g. Quill)
 * and wrapped inside <p>...</p> or <br> tags as escaped entities (&lt;div&gt;).
 */
export function normalizeRenderedHtml(content?: string | null): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  if (!ESCAPED_HTML_REGEX.test(content)) {
    return content;
  }

  let cleaned = content
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/^\s*<p[^>]*>/i, '')
    .replace(/<\/p>\s*$/i, '')
    .replace(/<br\s*\/?>/gi, '\n');

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = cleaned;
    cleaned = textarea.value;
  } else {
    cleaned = cleaned
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  return cleaned.replace(/\u00a0/g, ' ').trim();
}
