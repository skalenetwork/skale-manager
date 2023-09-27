#!/usr/bin/env node

import {parse} from 'path';
import {execFileSync} from 'child_process';

const baseDir = process.argv[2];
const PREFIX = "/technology/skale-manager/"

const files = execFileSync(
  'find', [baseDir, '-type', 'f'], {encoding: 'utf8'}
).split('\n').filter(s => s !== '');

const links = files.map((file) => {
  const doc = file.replace(baseDir + "/", '');
  const {dir, name} = parse(doc);
  return {
    title: name,
    link: `${PREFIX}${dir ? dir + '/' : ''}${name}`.toLowerCase(),
    links: []
  };
});

// Case-insensitive sort based on titles (so 'token/ERC20' gets sorted as 'erc20')
const sortedLinks = links.sort(function (a, b) {
  return a.title.toLowerCase().localeCompare(b.title.toLowerCase(), undefined, {numeric: true});
});

console.log(JSON.stringify(sortedLinks))
