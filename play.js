'use strict';

const File = require('./File');
File.COMPANY = 'Foobar';

var f;

console.log(`home: ${File.home()}`);
console.log(`profile: ${File.profile('Acme')}`);

f = File.cwd().upTo('package.json').load();
console.log(`package ${f.name}`);

f = new File('~/.sencha');

console.log(`f: ${f}`);
console.log(`f.abssolute: ${f.absolutePath()}`);
console.log(`f.canonical: ${f.canonicalPath()}`);
console.log(`f.native: ${f.nativePath()}`);
console.log(`f.normalized: ${f.normalizedPath()}`);
console.log(`f.slashified: ${f.slashifiedPath()}`);
console.log(`f.join: ${f.join('foo')}`);
console.log(`f.parent: ${f.parent}`);
console.log(`f.parent.join: ${f.parent.join('foo')}`);
console.log(`f.parent.parent: ${f.parent.parent}`);

f.list('A').forEach(ff => {
    console.log(`ff: ${ff} ==> ${ff.name}`);
});

f = new File('~~/.sencha');
console.log(`f: ${f}`);
console.log(`f.abssolute: ${f.absolutePath()}`);
//console.log(`f.canonical: ${f.canonicalPath()}`);
console.log(`f.native: ${f.nativePath()}`);
console.log(`f.normalized: ${f.normalizedPath()}`);
console.log(`f.slashified: ${f.slashifiedPath()}`);
console.log(`f.join: ${f.join('foo')}`);
console.log(`f.parent: ${f.parent}`);
console.log(`f.parent.join: ${f.parent.join('foo')}`);
console.log(`f.parent.parent: ${f.parent.parent}`);

//console.log(`load: ${f.join('don.license').load()}`);

//console.log('dir:', Win.dir(f.path));

// console.log(f);
// console.log(f.exists());
// console.log(f.access().name);

//console.log('fsattr: ', fswin.getAttributesSync(f.join('.git').path));

// console.log(f.join('.idea').stat());
// console.log(f.join('.git').stat());

//console.log(f.stat());
//f.list('s+o').forEach(f => console.log('dir: ', f.path));

// f.asyncList('Asd').then(files => {
//     files.forEach(f => console.log('dir: ', f.path));
// });

// f.asyncWalk('Ad', (item, state) => {
//     console.log(`${' '.repeat(state.stack.length * 4)}${item.name} - ${item._stat ? item._stat.attribs : ''}`);
// }).then(() => {
//     console.log('done');
// });

// let pkg = f.upToFile('package.json');
// console.log(`package ${pkg}`);
// console.log(pkg.load());
// pkg.asyncLoad().then(data => {
//     console.log('async pkg: ', data);
// });

// f = f.upDir('.git');
// console.log('Where is .git: ', f);
// console.log(File.exists(f));
// console.log(File.access(f));

//console.log('The stat: ', f.stat());
//console.log(`is: file=${File.isFile(f)} dir=${File.isDirectory(f)}`);
