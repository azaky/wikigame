const fs = require('fs');
const es = require('event-stream');

const regex = /^(.*)\s+\[(\d+)\]\s*→\s*(\d+)\s*\((\d+)\s*\+\s*(\d+)\)$/;

let parsed = [];
let lineNumber = 0;

var s = fs
  .createReadStream('results.txt')
  .pipe(es.split())
  .pipe(
    es
      .mapSync((line) => {
        s.pause();
        lineNumber++;
        if (lineNumber % 100000 === 0) {
          console.log(`processed ${lineNumber} lines`);
        }

        const matches = regex.exec(line);
        if (!matches) {
          s.resume();
          return;
        }

        // for the sake of completeness, we store all data here
        // ultimately we only care about "linksDirect"
        const obj = {
          title: matches[1].replace(/\\/g, ''),
          namespace: matches[2],
          linksTotal: parseInt(matches[3]),
          linksDirect: parseInt(matches[4]),
          linksIndirect: parseInt(matches[5]),
        };
        parsed.push(obj);

        s.resume();
      })
      .on('error', function (err) {
        console.log('Error while reading file.', err);
      })
      .on('end', async function () {
        console.log('Finished reading results.txt');

        const n = parsed.length;
        console.log(`Records: ${n}`);

        parsed.sort((a, b) => b.linksDirect - a.linksDirect);
        console.log('Finished sorting');

        const jsonws = fs.createWriteStream('enwiki-links-10k.json');
        const txtws = fs.createWriteStream('enwiki-links-10k.txt');

        jsonws.write('[');

        for (let i = 0; i < Math.min(n, 10000); i++) {
          if (i) jsonws.write(',');
          if (
            !jsonws.write(
              JSON.stringify({
                title: parsed[i].title,
                links: parsed[i].linksDirect,
              })
            )
          ) {
            await new Promise((resolve) => jsonws.once('drain', resolve));
          }
          if (!txtws.write(`${parsed[i].title}\t${parsed[i].linksDirect}\n`)) {
            await new Promise((resolve) => txtws.once('drain', resolve));
          }
          if ((i + 1) % 1000 === 0) {
            console.log(`written ${i + 1} records`);
          }
        }

        jsonws.write(']');
        jsonws.close();
        txtws.close();
        console.log('Finished writing');
      })
  );
