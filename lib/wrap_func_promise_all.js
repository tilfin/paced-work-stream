'use strict';

class WrapFuncPromiseAll {
  constructor(promises) {
    this._prmses = promises;
    this._count = promises.length;
  }

  execute(delayMS) {
    if (this._prmses.length === 0) {
      return Promise.resolve([]);
    }

    this._delay = delayMS || 0;
    return new Promise((resolve, reject) => {
      this._runNext(this._wrapResolve(resolve), this._wrapReject(reject));
    });
  }

  _runNext(resolve, reject) {
    if (this._prmses.length === 0) return;

    const target = this._prmses.shift();
    target()
    .then(result => {
      resolve(result);
    })
    .catch(err => {
      reject(err);
    });

    setTimeout(() => {
      this._runNext(resolve, reject);
    }, this._delay);
  }

  _wrapResolve(resolve) {
    const results = [];
    return (result) => {
      results.push(result);
      if (results.length === this._count) {
        resolve(results);
      }
    };
  }

  _wrapReject(reject) {
    let firstErr = null;
    return (err) => {
      if (!firstErr) {
        firstErr = err;
        reject(err);
      }
    };
  }
}

module.exports = WrapFuncPromiseAll
