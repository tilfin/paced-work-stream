'use strict';

const chai = require('chai');
const assert = chai.assert;
const es = require('event-stream');
const PacedWorkStream = require('../lib/main');

describe('PacedWorkStream', () => {
  describe('piped readable stream', () => {
    const WORK_PROMISE = function(item) {
      return new Promise((resolve, reject) => {
          setTimeout(() => {
            this.countTag('workDone');
            resolve(item);
          }, 20);
        })
    };

    it('raises done event', (done) => {
      const pwStream = new PacedWorkStream({
          concurrency: 2,
          workMS: 0
        }, WORK_PROMISE)
        .on('done', function() {
          assert.deepEqual(this.tagCounts, { workDone: 4 });
          done();
        }).on('error', (err) => {
          assert.ifError(err);
          done();
        });

      const reader = es.readArray([11, 12, 21, 22])
      reader.pipe(pwStream);
    });

    it('raises done event with workPromise returns a function to return Promise', (done) => {
      const pwStream = new PacedWorkStream({
          concurrency: 2,
          workMS: 0
        }, function(item) {
          const self = this;
          return function() {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                  self.countTag('workDone');
                  resolve(item);
                }, 20);
              })
          };
        })
        .on('done', function() {
          assert.deepEqual(this.tagCounts, { workDone: 5 });
          done();
        }).on('error', (err) => {
          assert.ifError(err);
          done();
        });

      const reader = es.readArray([11, 12, 21, 22, 31])
      reader.pipe(pwStream);
    });

    it('raises done event with fraction', (done) => {
      const pwStream = new PacedWorkStream({
          concurrency: 2,
          workMS: 0
        }, WORK_PROMISE)
        .on('done', function() {
          assert.deepEqual(this.tagCounts, { workDone: 5 });
          done();
        }).on('error', (err) => {
          assert.ifError(err);
          done();
        });

      const reader = es.readArray([11, 12, 21, 22, 31])
      reader.pipe(pwStream);
    });

    context('error occurred in progress', () => {
      it('raises error event', (done) => {
        const abortError = new Error('Abort!');

        const pwStream = new PacedWorkStream({
            concurrency: 1,
            workMS: 50
          }, function(item) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                  if (item === 30) {
                    reject(abortError);
                  } else {
                    this.countTag('workDone');
                    resolve();
                  }
                }, 10);
              });
          })
          .on('done', function() {
            assert.isOk(false);
            done();
          }).on('error', function(err) {
            assert.equal(err, abortError);
            assert.deepEqual(this.tagCounts, { workDone: 2 });
            done();
          });

        const reader = es.readArray([10, 20, 30, 40])
        reader.pipe(pwStream);
      });
    });

    context('error occurred in creating Promise', () => {
      it('raises error event', (done) => {
        const abortError = new Error('Abort!');

        const pwStream = new PacedWorkStream({
            concurrency: 3,
            workMS: 10
          }, function(item) {
            throw abortError;
          })
          .on('done', function() {
            assert.isOk(false);
            done();
          }).on('error', function(err) {
            assert.equal(err, abortError);
            assert.deepEqual(this.tagCounts, {});
            done();
          });

        const reader = es.readArray(['a', 'b'])
        reader.pipe(pwStream);
      });
    });

    context('workPromise is not set', () => {
      it('raises error event', (done) => {
        const pwStream = new PacedWorkStream()
          .on('done', function() {
            assert.isOk(false);
            done();
          }).on('error', function(err) {
            assert.equal(err.message, 'Required workPromise');
            done();
          });

        const reader = es.readArray(['a', 'b'])
        reader.pipe(pwStream);
      });
    });

    context('called function', () => {
      it('OK', (done) => {
        const ITEMS = ['foo', 'bar'];
        const reader = es.readArray(ITEMS)
        const writer = es.writeArray(function(err, array) {
          assert.deepEqual(array, ITEMS);
          done();
        });

        reader
        .pipe(PacedWorkStream({}, WORK_PROMISE))
        .pipe(writer);
      });
    });

    context('when delay is true', () => {
      it('raises done event', (done) => {
        const times = [];
        const pwStream = new PacedWorkStream({
            concurrency: 4,
            workMS: 200,
            delay: true
          }, function(item) {
            return () => {
              this.countTag('foo', 3);
              times.push(new Date().getTime());
              return Promise.resolve(true);
            };
          })
          .on('done', function() {
            assert.deepEqual(this.tagCounts, { foo: 15 });
            for (let i = times.length - 1; i > 0; i--) {
              assert.isAtLeast(times[i] - times[i-1], 50 * 0.8);
            }
            done();
          }).on('error', (err) => {
            assert.ifError(err);
            done();
          });

        const reader = es.readArray([11, 12, 21, 22, 31])
        const writer = es.writeArray(function(err, array) {
          assert.deepEqual(array, [true, true, true, true, true]);
        });

        reader.pipe(pwStream).pipe(writer);
      });
    });
  });
});
