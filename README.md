PacedWorkStream
===============

Node.js transform stream working at constant pace and concurrent for object mode

## Features

* Specify work time at once (opts.workMS)
* Specify concurrent workers (opts.concurrency)
* Fire `done` event after when all workers have finished asynchrous -processes
* Counting tag system to call `this.countTag(_tag_)` in `_workPromise`, you can get summarized results `tagCounts` grouped by tag.
* Node.js 4.2 or later

## Targets

* API client needs to handle the rate-limit
* DB client needs to handle the read/write capacity units like AWS DynamoDB

## Install

```
$ npm install -save paced-work-stream
```

## How to Use

```javascript
const es = require('event-stream');

const PacedWorkStream = require('paced-work-stream');

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
reader.pipe(pwStream);
```

* Pay attention to handling `done` event to get last `tagCounts` because workers haven't processed items on `finish` event.

### Console output

```
$ node example.js
2016-09-11T03:17:50.000Z Begin 11
2016-09-11T03:17:50.003Z Begin 12
2016-09-11T03:17:50.605Z End 11
2016-09-11T03:17:50.605Z End 12
2016-09-11T03:17:51.009Z Begin 21
2016-09-11T03:17:51.009Z Begin 22
2016-09-11T03:17:51.606Z End 21
2016-09-11T03:17:51.606Z End 22
2016-09-11T03:17:52.004Z Begin 31
2016-09-11T03:17:52.607Z End 31
{ workDone: 5 }
```

### License

MIT
