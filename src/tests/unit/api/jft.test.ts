import { describe, it, expect } from 'vitest';
import { sanitiseJft } from '$lib/api/jft';

describe('sanitiseJft', () => {
  it('extracts body content from a full HTML document', () => {
    const html = '<html><head><title>JFT</title></head><body><table>content</table></body></html>';
    expect(sanitiseJft(html)).toBe('<table>content</table>');
  });

  it('removes <link> tags', () => {
    const html = '<body><link rel="stylesheet" href="smartphone.css?ver=0.2" /><table>ok</table></body>';
    const result = sanitiseJft(html);
    expect(result).not.toContain('<link');
    expect(result).toContain('<table>ok</table>');
  });

  it('removes <script> tags and their content', () => {
    const html = '<body><script>window.location.href = "/";</script><table>ok</table></body>';
    const result = sanitiseJft(html);
    expect(result).not.toContain('<script');
    expect(result).not.toContain('window.location');
    expect(result).toContain('<table>ok</table>');
  });

  it('removes <meta> tags', () => {
    const html = '<body><meta name="viewport" content="width=device-width"><table>ok</table></body>';
    const result = sanitiseJft(html);
    expect(result).not.toContain('<meta');
    expect(result).toContain('<table>ok</table>');
  });

  it('handles a real-world jftna.org response shape', () => {
    const html = `<html>
<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<title>Just for Today Meditation</title>
<meta name="viewport" content="width=device-width, initial-scale=1,user-scalable=yes">
<link rel="stylesheet" type="text/css" href="smartphone.css?ver=0.2" />
</head>
<body>
<script>
var now = new Date();
window.location.href = "/?tz=Europe/Dublin";
</script>
<table align="center">
<tr><td align="left"><h2>August 19, 2026</h2></td></tr>
</table>
</body>
</html>`;
    const result = sanitiseJft(html);
    expect(result).not.toContain('<link');
    expect(result).not.toContain('<meta');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('window.location');
    expect(result).toContain('<table');
    expect(result).toContain('August 19, 2026');
  });

  it('falls back to the full string when there is no <body> tag', () => {
    const html = '<table><tr><td>fallback</td></tr></table>';
    expect(sanitiseJft(html)).toBe(html);
  });
});
