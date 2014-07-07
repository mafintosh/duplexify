var eos = require('end-of-stream')
var stream = require('stream')
var util = require('util')

var onclose = function(self) {
  return function(err) {
    if (err) self.destroy(err.message === 'premature close' ? null : err)
  }
}

var Duplexify = function(writable, readable, opts) {
  stream.Duplex.call(this, opts)

  this.destroyed = false

  this._writable = null
  this._readable = null
  this._readable2 = null

  this._writeArguments = null
  this._endArguments = null

  this._forwarding = false
  this._drained = false
  this._finished = false
  this._ondrain = null
  this._onclose = onclose(this)

  if (writable) this.setWritable(writable)
  if (readable) this.setReadable(readable)
}

util.inherits(Duplexify, stream.Duplex)

Duplexify.prototype.setReadable = function(readable) {
  if (this.destroyed) {
    if (readable.destroy) readable.destroy()
    return
  }
  if (readable === null) {
    this.push(null)
    return
  }

  var self = this
  var onreadable = function() {
    self._forward()
  }
  var onend = function() {
    self.push(null)
  }

  this._readable = readable
  this._readable2 = typeof readable.read === 'function' ? readable : new (stream.Readable)().wrap(readable)
  this._readable2.on('readable', onreadable)
  this._readable2.on('end', onend)

  eos(readable, {writable:false, readable:true}, this._onclose)

  this._forward()
}

Duplexify.prototype.setWritable = function(writable) {
  if (this.destroyed) {
    if (writable.destroy) writable.destroy()
    return
  }
  if (writable === null) {
    stream.Writable.prototype.end.call(this)
    return
  }

  var self = this
  var ondrain = function() {
    var ondrain = self._ondrain
    self._ondrain = null
    ondrain()
  }

  this._writable = writable
  this._writable.on('drain', ondrain)

  eos(writable, {writable:true, readable:false}, this._onclose)

  if (this._writeArguments) this._write.apply(this, this._writeArguments)
  if (this._endArguments) this.end.apply(this, this._endArguments)
}

Duplexify.prototype.destroy = function(err) {
  if (this.destroyed) return
  this.destroyed = true

  if (err) {
    var ondrain = this._ondrain
    this._ondrain = null
    if (ondrain) ondrain(err)
    else this.emit('error', err)
  }

  if (this._readable && this._readable.destroy) this._readable.destroy()
  if (this._writable && this._writable.destroy) this._writable.destroy()

  this.emit('close')
}

Duplexify.prototype._read = function() {
  this._drained = true
  this._forward()
}

Duplexify.prototype._forward = function() {
  if (this._forwarding || !this._readable2 || !this._drained) return
  this._forwarding = true

  var data
  while ((data = this._readable2.read()) !== null) {
    this._drained = this.push(data)
  }

  this._forwarding = false
}

Duplexify.prototype.end = function(data, enc, cb) {
  if (!this._writable) {
    this._endArguments = arguments
    return
  }

  if (typeof data === 'function') {
    enc = null
    cb = data
    data = null
  } else if (typeof enc === 'function') {
    cb = enc
    enc = null
  }

  if (data) this._writable.write(data)

  var self = this
  var end = function() {
    stream.Writable.prototype.end.call(self, cb)
  }

  if (!this._writable._writableState) {
    self._writable.end()
    end()
    return
  }

  self._writable.end(end)
}

Duplexify.prototype._write = function(data, enc, cb) {
  if (this.destroyed) return cb()

  if (!this._writable) {
    this._writeArguments = arguments
    return
  }

  if (this._writable.write(data) === false) this._ondrain = cb
  else cb()
}

module.exports = function(writable, readable, opts) {
  return new Duplexify(writable, readable, opts)
}

module.exports.obj = function(writable, readable) {
  return new Duplexify(writable, readable, {objectMode:true, highWaterMark:16})
}