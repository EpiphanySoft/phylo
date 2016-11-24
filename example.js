'use strict';

// Appease syntax highlight and inspections
let console = {
    log() {}
};
function require(){}

    const File = require('phylo');

    let root = File.cwd().up('.git');
    if (root) {
        console.log(`Root: ${root}`);
    }

    let pkgFile = File.cwd().upToFile('package.json');
    if (pkgFile) {
        let pkg = pkgFile.load();
        console.log(`Package ${pkg.name} found at ${pkgFile}`);
    }

