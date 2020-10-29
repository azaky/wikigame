# Languages: get all Wikipedia languages

This script parses [List of Wikipedias page](https://en.wikipedia.org/wiki/List_of_Wikipedias) to get all active Wikipedia languages. As of October 2020, there are 303 active Wikipedia languages.

This script will collect:

- `lang`: WP code (subdomain below wikipedia.org)
- `label`: English name of the language
- `labelLocal`: Local name of the language
- `articleCount`: Article count

## Running

```
npm i && node lang.js
```
