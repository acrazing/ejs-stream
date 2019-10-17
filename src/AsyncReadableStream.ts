/*!
 * Copyright 2019 yangjunbao <yangjunbao@shimo.im>. All rights reserved.
 * @since 2019-10-10 12:08:58
 */

import isStream from 'is-stream';
import { Readable, ReadableOptions } from 'stream';

export type BaseChunkType = NodeJS.ReadableStream | Uint8Array | string;

export type ChunkType =
  | BaseChunkType
  | Promise<BaseChunkType>
  | Array<BaseChunkType | Promise<BaseChunkType>>;

export class AsyncReadableStream extends Readable {
  private chunks: ChunkType[] = [];
  private current: ChunkType | undefined = void 0;
  private nextSize: number | undefined = void 0;
  private isStoped = false;

  constructor(options: ReadableOptions = {}) {
    super(options);
  }

  pushChunk(chunk: ChunkType) {
    if (this.isStoped) {
      return;
    }
    if (Array.isArray(chunk)) {
      for (const item of chunk) {
        this.pushChunk(item);
      }
    } else if (chunk) {
      this.chunks.push(chunk);
      if (!this.current && this.nextSize !== void 0) {
        this._read(this.nextSize);
      }
    }
  }

  end() {
    this.isStoped = true;
  }

  private handleError = (e: Error) => {
    this.destroy(e);
  };
  private handleData = (chunk: any) => {
    this.nextSize = void 0;
    this.push(chunk);
  };
  private handleEnd = () => {
    this.removeHandlers(this.current);
    const nextSize = this.nextSize;
    this.current = void 0;
    this.nextSize = void 0;
    if (nextSize !== void 0) {
      this._read(nextSize);
    }
  };

  private removeHandlers(chunk: ChunkType | undefined) {
    if (isStream.readable(chunk)) {
      chunk.removeListener('data', this.handleData);
      chunk.removeListener('error', this.handleError);
      chunk.removeListener('end', this.handleEnd);
    }
  }

  _read(size: number): void {
    if (this.current) {
      this.nextSize = size || 0;
      return;
    }
    if (this.chunks.length === 0) {
      if (this.isStoped) {
        this.push(null);
      } else {
        this.nextSize = size;
      }
      return;
    }
    const chunk = this.chunks.shift();
    if (isStream.readable(chunk)) {
      this.current = chunk;
      chunk.on('error', this.handleError);
      chunk.on('data', this.handleData);
      chunk.on('end', this.handleEnd);
    } else if (chunk instanceof Promise) {
      chunk.then(
        (data) => this.push(data || ''),
        (reason) => this.destroy(reason),
      );
    } else {
      this.push(chunk || '');
    }
  }

  _destroy(error: Error | null, callback: (error?: Error | null) => void) {
    this.removeHandlers(this.current);
    this.current = void 0;
    this.nextSize = void 0;
    callback(error);
  }
}
