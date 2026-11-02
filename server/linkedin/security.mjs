import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
export class SafeError extends Error {
  constructor(message, status = 400, code = 'invalid_request') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const hash = (value) => createHash('sha256').update(value).digest('hex');
export const random = () => randomBytes(32).toString('base64url');
export function equal(a, b) {
  return (
    typeof a === 'string' &&
    typeof b === 'string' &&
    a.length >= 32 &&
    b.length >= 32 &&
    timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)))
  );
}
export function seal(token, key, owner) {
  if (!/^[a-f0-9]{64}$/i.test(key || ''))
    throw new SafeError('LinkedIn connection is not configured yet.', 503, 'setup_required');
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  cipher.setAAD(Buffer.from(owner));
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [
    1,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}
export function unseal(value, key, owner) {
  try {
    const [version, iv, tag, data] = value.split('.');
    if (version !== '1') throw new Error();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'base64url'),
    );
    decipher.setAAD(Buffer.from(owner));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new SafeError('Reconnect your LinkedIn account.', 409, 'reconnect_required');
  }
}
export function caption(text, generated = false) {
  if (typeof text !== 'string') throw new SafeError('Enter a caption.');
  text = text
    .replace(/\r\n/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim();
  if (!text || text.length > 2800)
    throw new SafeError('Use a caption between 1 and 2,800 characters.');
  if (
    /\S+@\S+\.\S+|\b(?:STKBTCOE\d+|KBTUG\d{5})\b/i.test(text) ||
    [...text.matchAll(/\+?\d[\d ()-]{7,}\d/g)].some((m) => m[0].replace(/\D/g, '').length >= 10)
  )
    throw new SafeError('Remove private identifiers and contact details.');
  if (generated) {
    const count = text.split(/\s+/).length;
    if (
      count < 60 ||
      count > 170 ||
      (text.match(/#[\p{L}\p{N}_]+/gu) || []).length > 3 ||
      !/\b(I|my|I've|I’m|I'm)\b/i.test(text)
    )
      throw new SafeError('Caption needs another generation attempt.');
  }
  return text;
}
export function approvedContext(value) {
  // These are only selected source fields; never forward the full owner portfolio.
  return JSON.parse(
    JSON.stringify(value, (_, v) =>
      typeof v === 'string'
        ? v
            .replace(/\S+@\S+\.\S+/g, '[private contact removed]')
            .replace(/\b(?:STKBTCOE\d+|KBTUG\d{5})\b/gi, '[private identifier removed]')
            .replace(/\+?\d[\d ()-]{7,}\d/g, (match) =>
              match.replace(/\D/g, '').length >= 10 ? '[private contact removed]' : match,
            )
        : v,
    ),
  );
}
export function imageMetadata(media) {
  const buffer = Buffer.from(media.base64 || '', 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024)
    throw new SafeError('Choose a JPG or PNG image up to 2 MiB.');
  let width = 0,
    height = 0;
  if (
    media.mimeType === 'image/png' &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    buffer.length >= 24
  ) {
    width = buffer.readUInt32BE(16);
    height = buffer.readUInt32BE(20);
  } else if (media.mimeType === 'image/jpeg' && buffer[0] === 255 && buffer[1] === 216) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 255) break;
      const marker = buffer[offset + 1];
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        height = buffer.readUInt16BE(offset + 5);
        width = buffer.readUInt16BE(offset + 7);
        break;
      }
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += length + 2;
    }
  }
  if (!width || !height || width * height >= 36152320)
    throw new SafeError('Choose a valid JPG or PNG with fewer than 36 million pixels.');
  return {
    id: media.id,
    name: media.name,
    mimeType: media.mimeType,
    hash: hash(buffer),
    base64: buffer.toString('base64'),
  };
}
