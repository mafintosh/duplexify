var eos = require('end-of-stream')
var stream = require('stream')
var util = require('util')

var noop = function() {}

var TEST_BUFFER_PLEASE_IGNORE = new Buffer(0)

var onclose = function(self) {
  return function(err) {
    if (err) self.destroy(err.message === 'premature close' ? null : err)
  }
}

var Duplexify = function(writable, readable, opts) {
  if (!(this instanceof Duplexify)) return new Duplexify(writable, readable, opts)
  stream.Duplex.call(this, opts)

  this.destroyed = false
  this._destroy = !opts || opts.destroy !== false

  this._writable = null
  this._readable = null
  this._readable2 = null

  this._writeArguments = null
  this._endArguments = null

  this._forwarding = false
  this._finishing = false
  this._drained = false
  this._ondrain = null
  this._onclose = onclose(this)

  if (writable) this.setWritable(writable)
  if (readable) this.setReadable(readable)
}

util.inherits(Duplexify, stream.Duplex)

Duplexify.obj = function(writable, readable, opts) {
  if (!opts) opts = {}
  opts.objectMode = true
  opts.highWaterMark = 16
  return new Duplexify(writable, readable, opts)
}

Duplexify.prototype.setReadable = function(readable) {
  this._readableClear()

  if (this.destroyed) {
    if (readable.destroy) readable.destroy()
    return
  }
  if (readable === null || readable === false) {
    this.push(null)
    return
  }

  var self = this
  var unend = eos(readable, {writable:false, readable:true}, this._onclose)

  var onreadable = function() {
    self._forward()
  }

  var onend = function() {
    self.push(null)
  }

  var clear = function() {
    self._readable2.removeListener('readable', onreadable)
    self._readable2.removeListener('end', onend)
    unend()
  }

  this._drained = true
  this._readable = readable
  this._readable2 = typeof readable.read === 'function' ? readable : new (stream.Readable)().wrap(readable)
  this._readable2.on('readable', onreadable)
  this._readable2.on('end', onend)
  this._readableClear = clear

  this._forward()
}

Duplexify.prototype.setWritable = function(writable) {
  this._writableClear()

  if (this.destroyed) {
    if (writable.destroy) writable.destroy()
    return
  }
  if (writable === null || writable === false) {
    this._finish()
    return
  }

  var self = this
  var overriding = !!this._writable
  var unend = eos(writable, {writable:true, readable:false}, this._onclose)

  var ondrain = function() {
    var ondrain = self._ondrain
    self._ondrain = null
    if (ondrain) ondrain()
  }

  var clear = function() {
    self._writable.removeListener('drain', ondrain)
    unend()
  }

  this._writable = writable
  this._writable.on('drain', ondrain)
  this._writableClear = clear
  if (overriding) process.nextTick(ondrain) // force a drain too avoid livelocks

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

  if (this._destroy) {
    if (this._readable && this._readable.destroy) this._readable.destroy()
    if (this._writable && this._writable.destroy) this._writable.destroy()
  }

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

Duplexify.prototype._finish = function() {
  var self = this
  this._flush(function() {
    stream.Writable.prototype.end.call(self)
  })
}

Duplexify.prototype._flush = function(cb) {
  cb()
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

  if (data) this.write(data)

  if (cb) {
    if (this._writableState.finished) cb()
    else this.once('finish', cb)
  }

  if (this._finishing) return
  this._finishing = true

  var self = this
  var finish = function() {
    self._finish()
  }

  this.write(TEST_BUFFER_PLEASE_IGNORE, function(err) {
    if (err) return

    self.emit('prefinish')

    if (!self._writable._writableState) {
      self._writable.end()
      return finish()
    }

    self._writable.end(finish)
  })
}

Duplexify.prototype._write = function(data, enc, cb) {
  if (this.destroyed) return cb()

  if (!this._writable) {
    this._writeArguments = arguments
    return
  }

  if (data === TEST_BUFFER_PLEASE_IGNORE) return cb()
  if (this._writable.write(data) === false) this._ondrain = cb
  else cb()
}

Duplexify.prototype._readableClear = Duplexify.prototype._writableClear = noop

module.exports = Duplexify