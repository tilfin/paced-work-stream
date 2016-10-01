'use strict';

const es = require('event-stream');
const PromisedLife = require('promised-lifestream');

const PacedWorkStream = require('../lib/main');

const pacedWorker = new PacedWorkStream({
    concurrency: 2,
    workMS: 1000
  }, function(item) {
    console.log(new Date().toISOString(), 'Begin', item);

    return new Promise((resolve, reject) => {
        setTimeout(() => {
          this.countTag('workDone');
          console.log(new Date().toISOString(), 'End', item);
          resolve();
        }, 600); // workMS contains the time.
      })
  })

PromisedLife([
  es.readArray([11, 12, 21, 22, 31]),
  pacedWorker
])
.then(() => {
  console.log(pacedWorker.tagCounts);
})
.catch(err => {
  console.error(err);
});
