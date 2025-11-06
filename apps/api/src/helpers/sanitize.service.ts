import { Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { htmlToText } from 'html-to-text';

const SANITIZE_OPTIONS = {
  allowedTags: [
    'p',
    'a',
    'b',
    'i',
    'strong',
    'em',
    'ul',
    'ol',
    'li',
    'br',
    'pre',
    'code',
    'h1',
    'h2',
    'h3',
    'h4',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'img',
    'blockquote',
    'hr',
    'input',
    'iframe',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'data-id'],
    iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen'],
    '*': ['data-id', 'data-type'],
  },
  allowedSchemes: ['http', 'https', 'data'],
  transformTags: {
    iframe: (tagName, attribs) => {
      const allowedHosts = ['youtube.com', 'youtu.be', 'player.vimeo.com'];
      try {
        const url = new URL(attribs.src);
        if (!allowedHosts.some((h) => url.hostname.includes(h))) {
          return { tagName: 'div', text: '[Embed removido por segurança]' };
        }
      } catch {
        return { tagName: 'div', text: '[Embed inválido]' };
      }
      return { tagName, attribs };
    },
  },
};

@Injectable()
export class SanitizeService {
  sanitize(html: string | null): string {
    const rawHtml = html ?? '';
    return sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
  }

  plainTextFromHtml(html: string | null): string {
    return htmlToText(html, {
      wordwrap: false,
      selectors: [{ selector: 'img', format: 'skip' }],
    })
      .replace(/\s+/g, ' ')
      .trim();
  }
}
