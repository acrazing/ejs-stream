/*!
 * Copyright 2019 acrazing <joking.young@gmail.com>. All rights reserved.
 * @since 2019-10-12 14:18:46
 */

import { Readable } from 'stream';

export function sleep(timeout: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, timeout));
}

/** @internal */
export function createReadable(readCount = 3, prefix = 'readable-') {
  const readable = new Readable({
    async read() {
      await sleep(1);
      if (readCount === 0) {
        readable.push(null);
      } else {
        readable.push(prefix + readCount);
        readCount -= 1;
      }
    },
  });
  return readable;
}

/** @internal */
export function resolveReadable(readable: Readable) {
  const chunks: string[] = [];
  return new Promise<string[]>((resolve, reject) => {
    readable.setEncoding('utf8');
    readable.on('data', (chunk) => chunks.push(chunk));
    readable.on('error', reject);
    readable.on('end', () => resolve(chunks));
  });
}
