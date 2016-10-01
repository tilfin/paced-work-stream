'use strict';

const chai = require('chai');
const assert = chai.assert;
const es = require('event-stream');
const devnull = require('dev-null');

const PacedWorkStream = require('../lib/main');

describe('PacedWorkStream', () => {
  context('workPromise returns promises greater than 1', () => {
    it('raises done event', (done) => {
      const pwStream = new PacedWorkStream({
          concurrency: 2,
          workMS: 0
        }, function(item) {
          if (item === 21) {
            return [
              Promise.resolve('21-1').then(() => { this.countTag('workDone') }),
              Promise.resolve('21-2').then(() => { this.countTag('workDone') })
            ];
          } else {
            return Promise.resolve(item.toString()).then(() => { this.countTag('workDone') });
          }
        })
        .on('done', function() {
          assert.deepEqual(this.tagCounts, { workDone: 6 });
          done();
        }).on('error', (err) => {
          assert.ifError(err);
          done();
        });

      const reader = es.readArray([11, 12, 21, 22, 31])
      reader.pipe(pwStream).pipe(devnull({ objectMode: true }));
    });

    it('raises done event', (done) => {
      const pwStream = new PacedWorkStream({
          concurrency: 3,
          workMS: 0
        }, function(item) {
          if (item % 10 === 2) {
            const prmss = [];
            for (let i = 1; i <= 5; i++) {
              prmss.push(Promise.resolve(`${item}-${i}`)
                         .then((r) => { this.countTag('workDone'); return r; }));
            }
            return prmss;
          } else {
            return Promise.resolve(item.toString())
                    .then((r) => { this.countTag('workDone'); return r; });
          }
        })
        .on('done', function() {
          assert.deepEqual(this.tagCounts, { workDone: 13 });
          done();
        }).on('error', (err) => {
          assert.ifError(err);
          done();
        });

      const reader = es.readArray([11, 12, 21, 22, 31])
      const writer = es.writeArray(function(err, array) {
        assert.deepEqual(array, ['11', '12-1', '12-2', '12-3', '12-4', '12-5',
            '21', '22-1', '22-2', '22-3', '22-4', '22-5', '31']);
      });

      reader.pipe(pwStream).pipe(writer);
    });
  });

  context('workPromise returns no promises sometimes', () => {
    it('raises done event', (done) => {
      const pwStream = new PacedWorkStream({
          concurrency: 3,
          workMS: 0
        }, function(item) {
          if (item % 10 === 2) {
            return Promise.resolve(item.toString())
                    .then((r) => { this.countTag('workDone'); return r; });
          }
        })
        .on('done', function() {
          assert.deepEqual(this.tagCounts, { workDone: 2 });
          done();
        }).on('error', (err) => {
          assert.ifError(err);
          done();
        });

      const reader = es.readArray([11, 12, 21, 22, 31])
      const writer = es.writeArray(function(err, array) {
        assert.deepEqual(array, ['12', '22']);
      });

      reader.pipe(pwStream).pipe(writer);
    });
  });

  context('workPromise does not return promises at all', () => {
    it('raises done event', (done) => {
      const pwStream = new PacedWorkStream({
          concurrency: 3,
          workMS: 0
        }, function(item) {
          return;
        })
        .on('done', function() {
          assert.deepEqual(this.tagCounts, {});
          done();
        }).on('error', (err) => {
          assert.ifError(err);
          done();
        });

      const reader = es.readArray([11, 12, 21, 22, 31])
      const writer = es.writeArray(function(err, array) {
        assert.deepEqual(array, []);
      });

      reader.pipe(pwStream).pipe(writer);
    });
  });
});
