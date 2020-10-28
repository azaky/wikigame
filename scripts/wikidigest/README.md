# Wikidigest: 10k most linked Wikipedia articles

This script will find 10k most linked English Wikipedia articles (i.e. the number of other articles that have links to it). It uses [wikidigest-link-count](https://github.com/adrian5/wikidigest-link-count).

Here's the preview of the top 10k articles (as of October 2020):

```
Geographic coordinate system	1130807
United States	456979
Wikidata	434342
Time zone	415348
Taxonomy (biology)	409374

... 9990 lines

Physical characteristics of the Buddha	2005
Robert Redford	2005
Nasal consonant	2004
Negro league baseball	2004
Lombards	2004
```

## Running

First, download `page`, `pagelinks`, and `redirect` data from Wikimedia dumps. Total data will be about ~8.5G.

```
export WIKIMEDIA_DUMPS_DATE=20201020 # alternatively, "latest" may be used
wget "https://dumps.wikimedia.org/enwiki/$WIKIMEDIA_DUMPS_DATE/enwiki-$WIKIMEDIA_DUMPS_DATE-page.sql.gz"
wget "https://dumps.wikimedia.org/enwiki/$WIKIMEDIA_DUMPS_DATE/enwiki-$WIKIMEDIA_DUMPS_DATE-pagelinks.sql.gz"
wget "https://dumps.wikimedia.org/enwiki/$WIKIMEDIA_DUMPS_DATE/enwiki-$WIKIMEDIA_DUMPS_DATE-redirect.sql.gz"
```

Then, run `wikidigest-link-count`:

```
./wikidigest-link-count -p "enwiki-$WIKIMEDIA_DUMPS_DATE-page.sql.gz" -r "enwiki-$WIKIMEDIA_DUMPS_DATE-redirect.sql.gz" -l "enwiki-$WIKIMEDIA_DUMPS_DATE-pagelinks.sql.gz" -c 1
```

The parameter `-c 1` is the minimum links for an article to be processed. So, using `-c 1` means this will process all articles that has at least one other article linking them.

It will generate `results.txt` file.

Then, run our script to sort based on _direct_ links, and then pick top 10k of them.

```
npm i
# if using -c 1 above, you may want to increase the memory limit
node --max-old-space-size=8192 wikidigest.js
```
