type RequestLike = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  setHeader: (name: string, value: string) => void;
  json: (payload: unknown) => void;
  send: (payload: unknown) => void;
};

type CaptureRequest = {
  html?: string;
  width?: number;
  height?: number;
  sourcePath?: string;
  selector?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  fileName?: string;
};

const MAX_BODY_BYTES = 4_000_000;
const MAX_DIMENSION = 2400;
const MIN_DIMENSION = 200;

const parseBody = (body: unknown): CaptureRequest | null => {
  if (!body) return null;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as CaptureRequest;
    } catch {
      return null;
    }
  }
  if (typeof body === 'object') {
    return body as CaptureRequest;
  }
  return null;
};

const readHeader = (req: RequestLike, name: string) => {
  const value = req.headers?.[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

const resolveOrigin = (req: RequestLike) => {
  const host = readHeader(req, 'x-forwarded-host') || readHeader(req, 'host');
  if (!host) return '';
  const protocol = readHeader(req, 'x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
};

const clampDimension = (value: number) =>
  Math.max(MIN_DIMENSION, Math.min(MAX_DIMENSION, Math.round(value)));

const clampViewportDimension = (value: number, fallback: number) =>
  Math.max(320, Math.min(2200, Math.round(Number.isFinite(value) ? value : fallback)));

const safeFileName = (value?: string) => {
  const raw = (value || 'pet-profile-card.png').trim();
  const normalized = raw.toLowerCase().endsWith('.png') ? raw : `${raw}.png`;
  return normalized.replace(/[^a-zA-Z0-9._-가-힣]/g, '_');
};

const buildHtmlDocument = (html: string, width: number, height: number) => `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: transparent;
      }
      #capture-root {
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
      }
      #capture-root * {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    </style>
  </head>
  <body>
    <div id="capture-root">${html}</div>
  </body>
</html>`;

const waitForImages = async (page: any) => {
  await page.evaluate(async () => {
    const imageNodes = Array.from(document.images || []);
    await Promise.all(
      imageNodes.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            window.setTimeout(done, 3000);
          }),
      ),
    );
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
};

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const payload = parseBody(req.body);
  if (!payload) {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  const html = typeof payload.html === 'string' ? payload.html : '';
  const sourcePath = typeof payload.sourcePath === 'string' ? payload.sourcePath.trim() : '';
  const width = Number(payload.width || 0);
  const height = Number(payload.height || 0);
  const selector =
    typeof payload.selector === 'string' && payload.selector.trim()
      ? payload.selector.trim()
      : '[data-capture-card-front="true"]';

  let chromiumMod: any;
  let playwrightMod: any;
  try {
    chromiumMod = await import('@sparticuz/chromium');
    playwrightMod = await import('playwright-core');
  } catch (error) {
    console.error('[api/card-image] missing_browser_deps', error);
    res.status(500).json({ error: 'missing_browser_deps' });
    return;
  }

  const chromium = chromiumMod.default ?? chromiumMod;
  const playwright = playwrightMod.default ?? playwrightMod;
  const executablePath = await chromium.executablePath();

  let browser: any;
  try {
    browser = await playwright.chromium.launch({
      executablePath,
      args: chromium.args,
      headless: chromium.headless ?? true,
    });
    let page: any;
    let targetSelector = '#capture-root';

    if (sourcePath) {
      if (!sourcePath.startsWith('/')) {
        res.status(400).json({ error: 'invalid_source_path' });
        return;
      }
      if (sourcePath.length > 1000) {
        res.status(400).json({ error: 'source_path_too_long' });
        return;
      }

      const origin = resolveOrigin(req);
      if (!origin) {
        res.status(500).json({ error: 'origin_unresolved' });
        return;
      }

      const viewportWidth = clampViewportDimension(Number(payload.viewportWidth || 0), 430);
      const viewportHeight = clampViewportDimension(Number(payload.viewportHeight || 0), 932);
      const targetUrl = new URL(sourcePath, origin).toString();

      page = await browser.newPage({
        viewport: {
          width: viewportWidth,
          height: viewportHeight,
          deviceScaleFactor: 2,
        },
      });
      await page.goto(targetUrl, {
        waitUntil: 'networkidle',
        timeout: 20_000,
      });
      await page.addStyleTag({
        content: `
          * { animation: none !important; transition: none !important; caret-color: transparent !important; }
          html, body { scroll-behavior: auto !important; }
        `,
      });
      await waitForImages(page);
      await page.waitForTimeout(140);
      targetSelector = selector;
    } else {
      if (!html.trim()) {
        res.status(400).json({ error: 'html_required' });
        return;
      }
      if (Buffer.byteLength(html, 'utf8') > MAX_BODY_BYTES) {
        res.status(413).json({ error: 'payload_too_large' });
        return;
      }
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        res.status(400).json({ error: 'invalid_dimensions' });
        return;
      }

      const clampedWidth = clampDimension(width);
      const clampedHeight = clampDimension(height);

      page = await browser.newPage({
        viewport: {
          width: clampedWidth,
          height: clampedHeight,
          deviceScaleFactor: 2,
        },
      });

      await page.setContent(buildHtmlDocument(html, clampedWidth, clampedHeight), {
        waitUntil: 'networkidle',
        timeout: 15_000,
      });
      await waitForImages(page);
      await page.waitForTimeout(60);
    }

    const target = page.locator(targetSelector).first();
    const targetCount = await target.count();
    if (targetCount < 1) {
      res.status(500).json({ error: 'capture_selector_not_found' });
      return;
    }

    const imageBuffer = await target.screenshot({
      type: 'png',
      omitBackground: false,
    });

    res.status(200);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName(payload.fileName)}"`);
    res.send(imageBuffer);
  } catch (error) {
    console.error('[api/card-image] render_failed', error);
    res.status(500).json({ error: 'render_failed' });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore close error
      }
    }
  }
}
