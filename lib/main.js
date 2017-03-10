'use strict';

const Transform = require('stream').Transform;
const util = require('util');


/**
 * PacedWorkStream
 *
 * @param {Number} opts.concurrency - number of concurrent process, default is 10
 * @param {number} opts.workMS - work-time millseconds at once, default is 0 (no wait)
 * @param {Promise|[Promise]} workPromise - work-function returns a Promise callwed with an item `function (item)`
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
  this._bufPrmss = [];
  if (workPromise) {
    this._workPromise = workPromise;
  }

  opts_.objectMode = true;
  Transform.call(this, opts_);
}
util.inherits(PacedWorkStream, Transform);

PacedWorkStream.prototype._transform = function(data, encoding, cb) {
  this._bufItems.push(data);

  if (this._bufPrmss.length >= this._concurrency) {
    const doPromises = this._bufPrmss.splice(0, this._concurrency);
    this._process(doPromises, cb);
    return;
  }

  if (this._bufItems.length < this._concurrency) {
    cb();
    return;
  }

  const items = this._bufItems.splice(0, this._concurrency);
  try {
    this._bufPrmss = this._bufPrmss.concat(this._toPromises(items));
    const doPromises = this._bufPrmss.splice(0, this._concurrency);
    this._process(doPromises, cb);
  } catch (err) {
    cb(err);
  }
}
PacedWorkStream.prototype._flush = function(cb) {
  const restItems = this._bufItems;
  if (restItems.length) {
    try {
      this._bufPrmss = this._bufPrmss.concat(this._toPromises(restItems));
    } catch (err) {
      cb(err);
      return;
    }
  }

  this._flushPromises(cb);
}

PacedWorkStream.prototype._flushPromises = function(cb) {
  if (this._bufPrmss.length === 0) {
    cb();
    this.emit('done');
    return;
  }

  const doPromises = this._bufPrmss.splice(0, this._concurrency);
  this._process(doPromises, (err) => {
    if (err) {
      cb(err);
    } else {
      this._flushPromises(cb);
    }
  });
}
PacedWorkStream.prototype._toPromises = function(items) {
  let promises = [];
  items.forEach((item) => {
    const pr = this._workPromise(item);
    if (pr) {
      promises = promises.concat(pr);
    }
  });
  return promises;
}
PacedWorkStream.prototype._process = function(promises, cb) {
  const doPromises = promises.map((pr) => {
    return (typeof pr.then === 'function') ? pr : pr();
  });

  const startTime = new Date().getTime();
  Promise.all(doPromises)
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
  /* this.countTag('skip');
     return Promise.resolve(item); */
  throw new Error('Required workPromise');
}
PacedWorkStream.prototype.countTag = function(tag, num) {
  const n = num || 1;
  const tc = this.tagCounts;
  if (tag in tc) {
    tc[tag] += n;
  } else {
    tc[tag] = n;
  }
}

module.exports = PacedWorkStream;
