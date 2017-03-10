const chai = require('chai');
const assert = chai.assert;
const WrapFuncPromiseAll = require('../lib/wrap_func_promise_all');

describe('WrapFuncPromiseAll', () => {
  describe('execute', () => {
    it('succeeds resolve all delaying', () => {
      const times = [];
      return new WrapFuncPromiseAll([
        function () {
          return new Promise((resolve) => {
            times.push(new Date().getTime());
            resolve(1);
          });
        },
        function () {
          return new Promise((resolve) => {
            times.push(new Date().getTime());
            resolve(2);
          });
        },
        function () {
          return new Promise((resolve) => {
            times.push(new Date().getTime());
            resolve(3);
          });
        }
      ])
      .execute(20)
      .then(results => {
        assert.deepEqual(results, [1, 2, 3]);
        assert.isAtLeast(times[1] - times[0], 20 * 0.8);
        assert.isAtLeast(times[2] - times[1], 20 * 0.8);
      });
    });

    it('succeeds reject', () => {
      const times = [];
      return new WrapFuncPromiseAll([
        function () {
          return new Promise((resolve) => {
            times.push(new Date().getTime());
            resolve(1);
          });
        },
        function () {
          return new Promise((resolve, reject) => {
            times.push(new Date().getTime());
            reject(new Error('dummy'));
          });
        },
        function () {
          return new Promise((resolve) => {
            resolve(3); // Not called
          });
        }
      ])
      .execute(25)
      .then(results => {
        assert.fail('Do not resolve');
      })
      .catch(err => {
        assert.equal(times.length, 2);
        assert.isAtLeast(times[1] - times[0], 25 * 0.8);
        assert.equal(err.message, 'dummy');
      });
    });
  });
});
