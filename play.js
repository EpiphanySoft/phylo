'use strict';

const File = require('./File');
const Globber = File.Globber;

File.COMPANY = 'Foobar';

var gg = Globber.get('i');
console.log(gg);

var re = gg.compile('**/*.txt');
console.log(re);
console.log('match:', re.exec('C:\\Program Files/foo.txt'));

var f = File.temp();

console.log(`home: ${File.home()}`);
console.log(`profile: ${File.profile('Acme')}`);
console.log(`profile: ${File.profile()}`);
//console.log(`profile.stat: `, File.profile().stat());
//console.log(`profile.access: `, File.profile().access());

File.asyncTemp().then(t => {
    console.log(`asyncTemp: ${t}`);
});

console.log(`temp: ${f}`);
console.log(`File.temp: ${File.temp()}`);
console.log(`tempFile: ${f.temp().absolutePath()}`);

File.asyncTemp().then(t => {
    console.log(`asyncTemp: ${t}`);
});

let pkg = File.cwd().upTo('package.json').load();
console.log(`package ${pkg.name}`);

f.asyncTemp().then(ff => {
    console.log(`ff: ${ff}`);
});

try {
    File.from('C:\\Windows\\foobar.txt').save(pkg);
}
catch (e) {
    console.log(`error: ${e.code} - ${e.message}`);
}

// f.join('foo.json').save(pkg, {
//     indent: '\t'
// });
//
// f.list().forEach(ff => {
//     console.log(`ff: ${ff.path}`);
// });

// f = new File('~/.sencha');
//
// console.log(`f: ${f}`);
// console.log(`f.absolute: ${f.absolutePath()}`);
// console.log(`f.canonical: ${f.canonicalPath()}`);
// console.log(`f.native: ${f.nativePath()}`);
// console.log(`f.normalized: ${f.normalizedPath()}`);
// console.log(`f.slashified: ${f.slashifiedPath()}`);
// console.log(`f.join: ${f.join('foo')}`);
// console.log(`f.parent: ${f.parent}`);
// console.log(`f.parent.join: ${f.parent.join('foo')}`);
// console.log(`f.parent.parent: ${f.parent.parent}`);

f = File.cwd();
f.list('A', '*.js').forEach(ff => {
    console.log(`ff: ${ff} ==> ${ff.name}`);
});
// f.list('A', (name, f2) => { console.log('f2',f2); return name.endsWith('.js'); }).forEach(ff => {
//     console.log(`ff: ${ff} ==> ${ff.name}`);
// });

f.walk('A', '**/*.{js,json}', ff => {
    console.log(`walk: ${ff}`)
});

// f = new File('~~/.sencha');
// console.log(`f: ${f}`);
// console.log(`f.absolute: ${f.absolutePath()}`);
// //console.log(`f.canonical: ${f.canonicalPath()}`);
// console.log(`f.native: ${f.nativePath()}`);
// console.log(`f.normalized: ${f.normalizedPath()}`);
// console.log(`f.slashified: ${f.slashifiedPath()}`);
// console.log(`f.join: ${f.join('foo')}`);
// console.log(`f.parent: ${f.parent}`);
// console.log(`f.parent.join: ${f.parent.join('foo')}`);
// console.log(`f.parent.parent: ${f.parent.parent}`);

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

// f = File.cwd();
// f.asyncWalk('', (item, state) => {
//     //let c = item.isDirectory() ? '>' : ' ';
//     //console.log(`${c} ${' '.repeat(state.stack.length * 4)}${item.name} - ${item._stat ? item._stat.attribs : ''}`);
// }, (item, state) => {
//     console.log(`< ${' '.repeat(state.stack.length * 4)}${item.name} - ${item.stat().attrib.text}`);
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
