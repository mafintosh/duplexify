/// <reference types="node"/>
import {Duplex, DuplexOptions, Readable, Writable} from 'stream';

export interface DuplexifyOptions extends DuplexOptions {
  autoDestroy?: boolean;
  end?: boolean;
}

export class Duplexify extends Duplex {
  readonly destroyed: boolean;
  setWritable(writable: Writable|false|null): void;
  setReadable(readable: Readable|false|null): void;
}

interface DuplexifyConstructor {
  obj(writable?: Writable|false|null, readable?: Readable|false|null, options?: DuplexifyOptions): Duplexify;
  new (writable?: Writable|false|null, readable?: Readable|false|null, options?: DuplexifyOptions): Duplexify;
  (writable?: Writable|false|null, readable?: Readable|false|null, options?: DuplexifyOptions): Duplexify;
}

declare var duplexify: DuplexifyConstructor;

export default duplexify;
