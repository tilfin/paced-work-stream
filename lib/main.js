'use strict';

const Transform = require('stream').Transform;
const util = require('util');


/**
 * PacedWorkStream
 *
 * @param {Number} opts.concurrency - number of concurrent process, default is 10
 * @param {number} opts.workMS - work-time millseconds at once, default is 0 (no wait)
 * @param {Function} workPromise - work-function returns a Promise callwed with an item `function (item)`
 */
function PacedWorkStream(opts, workPromise) {
  if (!(this instanceof PacedWorkStream))
    return new PacedWorkStream(opts, workPromise);

  const opts_ = opts || {};
  this._concurrency = opts_.concurrency || 10;
  this._workMS = opts_.workMS || 0;
  delete opts_.concurrency;
  delete opts_.workMS;

  this.tagCounts = {};
  this._bufItems = [];
  if (workPromise) {
    this._workPromise = workPromise;
  }

  opts_.objectMode = true;
  Transform.call(this, opts_);
}
util.inherits(PacedWorkStream, Transform);

PacedWorkStream.prototype._transform = function(data, encoding, cb) {
  this._bufItems.push(data);

  if (this._bufItems.length < this._concurrency) {
    cb();
    return;
  }

  const items = this._bufItems.splice(0, this._concurrency);
  this._process(items, cb);
}
PacedWorkStream.prototype._flush = function(cb) {
  if (this._bufItems.length) {
    this._process(this._bufItems, () => {
      cb();
      this.emit('done');
    });
    this._bufItems = [];
  } else {
    cb();
    this.emit('done');
  }
}

PacedWorkStream.prototype._process = function(items, cb) {
  let promises;
  try {
    promises = items.map((item) => {
        return this._workPromise(item);
      });
  } catch (err) {
    cb(err, null);
    return;
  }

  const startTime = new Date().getTime();
  Promise.all(promises)
  .then((results) => {
    results.forEach((result) => { this.push(result) });

    const procMS = new Date().getTime() - startTime;
    if (procMS < this._workMS) {
      setTimeout(() => {
        cb();
      }, this._workMS - procMS);
    } else {
      cb();
    }
  })
  .catch((err) => {
    cb(err, null);
  });
}
PacedWorkStream.prototype._workPromise = function(item) {
  this.countTag('skip');
  return Promise.resolve(item);
}
PacedWorkStream.prototype.countTag = function(tag) {
  const tc = this.tagCounts;
  if (tag in tc) {
    tc[tag]++;
  } else {
    tc[tag] = 1;
  }
}

module.exports = PacedWorkStream;
