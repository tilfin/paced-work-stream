'use strict';

const es = require('event-stream');
const devnull = require('dev-null');

const PacedWorkStream = require('../lib/main');

const pwStream = new PacedWorkStream({
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
  .on('done', function() {
    console.log(this.tagCounts);
  }).on('error', (err) => {
    console.error(err);
  });

const reader = es.readArray([11, 12, 21, 22, 31])
reader.pipe(pwStream).pipe(devnull({ objectMode: true }));
