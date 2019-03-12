import {expectType} from 'tsd-check';
import {Readable, Writable} from 'stream';
import duplexify, {Duplexify, DuplexifyOptions} from '.';

const readable = new Readable({read: () => {}});
const writable = new Writable({write: () => {}});
const options: DuplexifyOptions = {highWaterMark: 6};

expectType<Duplexify>(new duplexify());
expectType<Duplexify>(new duplexify(null));
expectType<Duplexify>(new duplexify(null, null));
expectType<Duplexify>(new duplexify(false, false));
expectType<Duplexify>(new duplexify(writable, readable, options));

expectType<Duplexify>(duplexify());
expectType<Duplexify>(duplexify(null));
expectType<Duplexify>(duplexify(null, null));
expectType<Duplexify>(duplexify(false, false));
expectType<Duplexify>(duplexify(writable, readable, options));

expectType<Duplexify>(duplexify.obj());
expectType<Duplexify>(duplexify.obj(null));
expectType<Duplexify>(duplexify.obj(null, null));
expectType<Duplexify>(duplexify.obj(false, false));
expectType<Duplexify>(duplexify.obj(writable, readable, options));

expectType<boolean>(duplexify().destroyed);

expectType<void>(duplexify().setWritable(null));
expectType<void>(duplexify().setWritable(false));
expectType<void>(duplexify().setWritable(writable));

expectType<void>(duplexify().setReadable(null));
expectType<void>(duplexify().setReadable(false));
expectType<void>(duplexify().setReadable(readable));

class MyDuplex extends duplexify {}
const duplex = new MyDuplex();
expectType<void>(duplex.setWritable(null));
