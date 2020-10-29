const fs = require('fs');
const { JSDOM } = require('jsdom');
const path = require('path');

console.log('Fetching Wikipedia...');

JSDOM.fromURL('https://en.wikipedia.org/wiki/List_of_Wikipedias').then(
  (dom) => {
    console.log('Finished fetching Wikipedia!');
    const document = dom.window.document;

    const getPreviousElement = (el, tagName) => {
      if (!el) return null;
      if (el.tagName === tagName) {
        return el;
      }
      return getPreviousElement(el.previousElementSibling, tagName);
    };

    // find detailed list table
    const detailedListTable = [...document.getElementsByTagName('table')].find(
      (table) => {
        const h2 = getPreviousElement(table, 'H2');
        return h2 && h2.textContent.startsWith('Detailed list');
      }
    );

    const languages = [...detailedListTable.children[0].children]
      .slice(1)
      .map((tr) => ({
        lang: tr.children[2].textContent,
        label: tr.children[0].textContent,
        labelLocal: tr.children[1].textContent,
        articleCount: parseInt(
          tr.children[3].textContent.replace(/,/g, ''),
          10
        ),
      }));

    console.log(`Initial language count: ${languages.length}`);

    // remove closed languages
    console.log('Removing closed Wikipedias...');
    const listTable = [...document.getElementsByTagName('table')].find(
      (table) => {
        const h2 = getPreviousElement(table, 'H2');
        return h2 && h2.textContent.startsWith('List');
      }
    );
    [...listTable.children[0].children].forEach((tr) => {
      const wp = tr.children[3].textContent;
      const matches = /(\w+)\s*\(closed\)/.exec(wp);
      if (matches) {
        const lang = matches[1];
        console.log(`Removing closed language: ${lang}`);
        languages.splice(
          languages.findIndex((obj) => obj.lang === lang),
          1
        );
      }
    });

    console.log(`Final language count: ${languages.length}`);

    fs.writeFileSync(
      path.join(__dirname, 'lang.json'),
      JSON.stringify(languages),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(__dirname, 'lang.txt'),
      languages
        .map(
          (obj) =>
            `${obj.lang}\t${obj.label}\t${obj.labelLocal}\t${obj.articleCount}`
        )
        .join('\n'),
      'utf-8'
    );
  }
);
