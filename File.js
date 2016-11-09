'use strict';

const Fs = require('fs');
const OS = require('os');
const Path = require('path');
const ChildProcess = require('child_process');

const re = {
    slash: /\\/g,
    split: /[\/\\]/g
};

const dateParts = [
    'birthtime',
    'atime',
    'mtime'
];

/**
 * This class wraps a path to a file or directory and provides methods to ease processing
 * and operating on that path.
 *
 * ## Naming Conventions
 *
 * Since it can be confusing when a string is returned or a `File` instance, a naming
 * convention is used throughout. Any method that ends with "Path" returns a string,
 * while all other methods return a `File`. Methods often come in pairs: one that returns
 * the string form and one that returns a `File`. In general, it is safest/best to stay
 * in the realm of `File` objects so their names are more concise.
 */
class File {
    static run (cmd, ...args) {
        return new Promise(resolve => {
            var lines = "";
            var process = ChildProcess.spawn(cmd, args, { encoding: 'utf8' });

            process.stdout.on('data', data => {
                lines += data.toString();
            });

            // process.on('error', function(err) {
            // });

            process.on('close', (code, signal) => {
                if (process.exitCode) {
                    resolve(process.exitCode);
                }
                else {
                    resolve(lines.trim().split('\r\n'));
                }
            });
        });
    }

    static winDir (path) {
        return File.winRun('dir', path).then(lines => {
            let content = lines.filter(line => !!line);
            return content.map(File.winParseStat);
        });
    }

    static winParseStat (text) {
        // attr/ctime/atime/mtime/size/name
        // [0]  [1]   [2]   [3]   [4]  [5]
        let parts = text.split('/');
        let stat = new Fs.Stats();

        for (let i = 0; i < dateParts.length; ++i) {
            let d = new Date();

            d.setTime(+parts[i+1] * 1000); // millisec

            stat[dateParts[i]] = d;
        }
    }

    static winRun (...args) {
        return File.run(File.winExe, ...args);
    }

    static from (path) {
        var file = path || null;

        if (file && !file.$isFile) {
            file = new File(path);
        }

        return file;
    }

    /**
     * This method is the same as `join()` in the `path` module except that the items
     * can be `File` instances or `String` and a `File` instance is returned.
     * @param {File/String...} parts Path pieces to join using `path.join()`.
     * @return {File}
     */
    static join (...parts) {
        var f = File.joinPath(...parts);
        return new File(f);
    }

    /**
     * This method is the same as `join()` in the `path` module except that the items
     * can be `File` instances or `String`.
     * @param {File/String...} parts Path pieces to join using `path.join()`.
     * @return {String}
     */
    static joinPath (...parts) {
        let n = parts && parts.length || 0;

        for (let i = 0; i < n; ++i) {
            let p = parts[i];

            if (p.$isFile) {
                parts[i] = p.path;
            }
        }

        let ret = (n === 1) ? parts[0] : (n && Path.join(...parts));

        return ret || '';
    }

    static path (file) {
        return ((file && file.$isFile) ? file.path : file) || '';
    }

    /**
     * This method is the same as `resolve()` in the `path` module except that the items
     * can be `File` instances or `String` and a `File` instance is returned.
     * @param {File/String...} parts Path pieces to resolve using `path.resolve()`.
     * @return {File}
     */
    static resolve (...parts) {
        var f = File.resolvePath(...parts);
        return new File(f);
    }

    /**
     * This method is the same as `resolve()` in the `path` module except that the items
     * can be `File` instances or `String`.
     * @param {File/String...} parts Path pieces to resolve using `path.resolve()`.
     * @return {String}
     */
    static resolvePath (...parts) {
        for (let i = 0, n = parts.length; i < n; ++i) {
            let p = parts[i];

            if (p.$isFile) {
                parts[i] = p.path;
            }
        }

        return (parts && parts.length && Path.resolve(...parts)) || '';
    }

    static split (filePath) {
        let path = File.path(filePath);
        return path.split(re.split);
    }

    constructor (...parts) {
        this.path = File.joinPath(...parts);
    }

    //-----------------------------------------------------------------
    // Properties

    get name () {
        var name = this._name;

        if (name === undefined) {
            let index = this.lastSeparator();

            this._name = name = ((index > -1) && this.path.substr(index + 1)) || '';
        }

        return name;
    }

    get parent () {
        var parent = this._parent;

        if (parent === undefined) {
            let path = this.path;
            let ret = Path.resolve(path, '..');

            if (path === ret) {
                ret = null;
            }

            this._parent = parent = ret && new File(ret);
        }

        return parent;
    }

    get extent () {
        var ext = this._extent;

        if (ext === undefined) {
            let name = this.name;
            let index = name.lastIndexOf('.');

            this._extent = ext = ((index > -1) && name.substr(index + 1)) || '';
        }

        return ext;
    }

    //-----------------------------------------------------------------
    // Methods

    absolutePath () {
        return Path.resolve(this.path);
    }

    absolutify () {
        return File.from(this.absolutePath());
    }

    canonicalPath () {
        return Fs.realpathSync(Path.resolve(this.path));
    }

    canonicalize () {
        return File.from(this.canonicalPath());
    }

    contains (subPath) {
        subPath = File.from(subPath);

        if (subPath) {
            // Ensure we don't have trailing slashes ("/foo/bar/" => "/foo/bar")
            let a = this.slashify().unterminatedPath();
            let b = subPath.slashifiedPath();

            if (a.startsWith(b)) {
                // a = "/foo/bar"
                // b = "/foo/bar/zip" ==> true
                // b = "/foo/barf"    ==> false
                return b[a.length] === '/';
            }
        }

        return false;
    }

    equals (other) {
        other = File.from(other);

        // Treat "/foo/bar" and "/foo/bar/" as equal (by stripping trailing delimiters)
        let a = this.unterminatedPath();
        let b = other && other.unterminatedPath() || '';

        // If the platform has case-insensitive file names, ignore case...
        if (!File.CASE) {
            a = a.toLowerCase();
            b = b.toLowerCase();
        }

        return a === b;
    }
    
    isAbsolute () {
        var p = this.path;
        return p && Path.isAbsolute(p);
    }
    
    isRelative () {
        var p = this.path;
        return p && !Path.isAbsolute(p);
    }

    joinPath (...parts) {
        return File.joinPath(this, ...parts);
    }

    join (...parts) {
        return File.join(this, ...parts);
    }

    lastSeparator () {
        var path = this.path,
            i = path.lastIndexOf('/'),
            j = path.lastIndexOf('\\');

        return (i > j) ? i : j;
    }

    nativePath (separator) {
        var p = this.path;

        return p && p.replace(re.split, separator || File.separator);
    }

    nativize (separator) {
        return File.from(this.nativePath(separator));
    }

    normalize () {
        return File.from(this.normalizedPath());
    }

    normalizedPath () {
        var p = this.path;
        return p && Path.normalize(p);
    }

    relativePath (path) {
        if (path.$isFile) {
            path = path.getCanonicalPath();
        }

        let p = this.canonicalPath();

        return p && path && Path.relative(p, path);
    }

    relativize (path) {
        return File.from(this.relativePath(path));
    }

    resolvePath (...parts) {
        return File.resolvePath(this, ...parts);
    }

    resolve (...parts) {
        return File.resolve(this, ...parts);
    }

    slashifiedPath () {
        return this.path.replace(re.slash, '/');
    }

    /**
     * Replace forward/backward slashes with forward slashes.
     * @return {String}
     */
    slashify () {
        return File.from(this.slashifiedPath());
    }

    split () {
        return File.split(this);
    }

    stat () {
        if (File.winExe) {
            return File.winDir(this.path).then(lines => {
                //
            });
        }

        return new Promise((resolve, reject) => {
            Fs.stat(this.path, (err, stats) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(stats);
                }
            });
        });
    }

    toString () {
        return this.path;
    }

    terminatedPath (separator) {
        if (separator == null || separator === true) {
            separator = File.separator;
        }

        let p = this.path;

        if (p && p.length) {
            let n = p.length - 1;
            let c = p[n];

            if (separator) {
                if (c !== separator) {
                    p += separator;
                }
            }
            else {
                while (n >= 0 && (c === '/' || c === '\\')) {
                    p = p.substr(0, n--);
                    c = p[n];
                }
            }
        }

        return p || '';
    }

    terminate (separator) {
        return File.from(this.terminatedPath(separator));
    }

    unterminatedPath () {
        return this.terminatedPath(false);
    }

    unterminate () {
        return File.from(this.unterminatedPath());
    }
}

Object.assign(File.prototype, {
    $isFile: true,
    _re: re,

    _extent: undefined,
    _name: undefined,
    _parent: undefined
});

const platform = OS.platform();

File.WIN = /^win\d\d$/i.test(platform);
File.MAC = /^darwin$/i.test(platform);

File.CASE = !File.WIN && !File.MAC;

File.re = re;
File.separator = Path.sep;

File.winExe = File.WIN ? Path.resolve(__dirname, 'bin/phylo.exe') : null;

console.log(`File.winExe = ${File.winExe}`);

module.exports = File;

var f = File.from(process.cwd());
f = File.from('/foo/bar/baz');
//f = File.from('C:/foo//bar');
console.log(f.path);

let p = f.parent;
console.log(p.path);

p = p.parent;
console.log(p.path);

p = p.parent;
console.log(p);
console.log(p === null);

console.log(['a','','b'].filter(a => !!a).map(a => a.toUpperCase()));
