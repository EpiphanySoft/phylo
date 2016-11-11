'use strict';

const Fs = require('fs');
const OS = require('os');
const Path = require('path');
const ChildProcess = require('child_process');

const re = {
    slash: /\\/g,
    split: /[\/\\]/g
};

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
 *
 *      var absFile = file.absolutify();  // a File object
 *
 *      var absPath = file.absolutePath(); // a string
 *
 * ### Synchronous vs Asynchronous
 *
 * All async methods return promises and have names that look like `getFoo()`. For example,
 * the `stat` method is synchronous while the asynchronous version is `getStat`.
 *
 *      var st = file.stat();  // sync
 *
 *      file.getStat().then(st => {
 *          // async
 *      });
 */
class File {
    static access (f) {
        if (!f) {
            return null;
        }

        return File.from(f).access();
    }

    static cwd () {
        return new File(process.cwd());
    }

    static exists (f) {
        if (!f) {
            return false;
        }

        return File.from(f).exists();
    }

    static from (path) {
        var file = path || null;

        if (file && !file.$isFile) {
            file = new File(path);
        }

        return file;
    }

    static isDir (f) {
        if (!f) {
            return false;
        }

        return File.from(f).isDir();
    }

    static isFile (f) {
        if (!f) {
            return false;
        }

        return File.from(f).isFile();
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
    // Path calculation

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

    //-----------------------------------------------------------------
    // Path checks

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

    //-----------------------------------------------------------------
    // File system checks

    access () {
        var st = this.stat(true);

        if (st === null) {
            return null;
        }

        let mask = st.mode & File.RWX.mask;
        return ACCESS[mask];
    }

    exists () {
        var st = this.stat(true);
        return st !== null;
    }

    has (sub) {
        var f = this.join(sub);
        return f.exists();
    }

    hasDir (sub) {
        var f = this.join(sub);

        return f.isDir();
    }

    hasFile (sub) {
        var f = this.join(sub);

        return f.isFile();
    }

    stat (nothrow) {
        // if (File.WIN) {
        //     return Win.dir(this.path).then(stats => {
        //         console.log('stats:', stats);
        //         return stats[0];
        //     });
        // }

        if (nothrow) {
            try {
                return Fs.statSync(this.path);
            }
            catch (e) {
                return null;
            }
        }

        return Fs.statSync(this.path);
    }

    statLink (nothrow) {
        // if (File.WIN) {
        //     return Win.dir(this.path).then(stats => {
        //         console.log('stats:', stats);
        //         return stats[0];
        //     });
        // }

        if (nothrow) {
            try {
                return Fs.lstatSync(this.path);
            }
            catch (e) {
                return null;
            }
        }

        return Fs.lstatSync(this.path);
    }

    up (sub) {
        let p = this.parent;

        if (p && sub) {
            p = p.where(sub);
        }

        return p;
    }

    upDir (sub) {
        return this.up(parent => parent.hasDir(sub));
    }

    upFile (sub) {
        return this.up(parent => parent.hasFile(sub));
    }

    where (sub) {
        let test = (typeof sub === 'string') ? (p => p.has(sub)) : sub;

        for (let parent = this; parent; parent = parent.parent) {
            if (test(parent)) {
                return parent;
            }
        }

        return null;
    }

    whereDir (sub) {
        return this.where(parent => parent.hasDir(sub));
    }

    whereFile (sub) {
        return this.where(parent => parent.hasFile(sub));
    }

    //------------------------------------------------------------------
    // File system checks (async)

    getAccess () {
        return this.getStat(true).then(st => {
            if (st === null) {
                return null;
            }

            let mask = st.mode & File.RWX.mask;
            return ACCESS[mask];
        });
    }

    getExists () {
        return this.getStat(true).then(st => {
            return st !== null;
        });
    }

    getStat (noreject) {
        // if (File.WIN) {
        //     return Win.dir(this.path).then(stats => {
        //         console.log('stats:', stats);
        //         return stats[0];
        //     });
        // }

        return new Promise((resolve, reject) => {
            Fs.stat(this.path, (err, stats) => {
                if (!err) {
                    resolve(stats);
                }
                else if (noreject) {
                    resolve(null);
                }
                else {
                    reject(err);
                }
            });
        });
    }

    getStatLink (noreject) {
        // if (File.WIN) {
        //     return Win.dir(this.path).then(stats => {
        //         console.log('stats:', stats);
        //         return stats[0];
        //     });
        // }

        return new Promise((resolve, reject) => {
            Fs.lstat(this.path, (err, stats) => {
                if (!err) {
                    resolve(stats);
                }
                else if (noreject) {
                    resolve(null);
                }
                else {
                    reject(err);
                }
            });
        });
    }
}

const proto = File.prototype;

Object.assign(proto, {
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

File.isDirectory = File.isDir;
File.re = re;
File.separator = Path.sep;

//--------------------

const ACCESS = File.ACCESS = {
    rwx: {
        name: 'rwx',

        r: true,
        w: true,
        x: true,

        rw: true,
        rx: true,
        wx: true,

        rwx: true,

        mask: Fs.constants.R_OK | Fs.constants.W_OK | Fs.constants.X_OK
    }
};

ACCESS[ACCESS.rwx.mask] = ACCESS.RWX = File.RWX = ACCESS.rwx;

[Fs.constants.R_OK, Fs.constants.W_OK, Fs.constants.X_OK].forEach((mask, index, array) => {
    let c = 'rwx'[index];
    let obj = ACCESS[c] = ACCESS[c.toUpperCase()] = File[c.toUpperCase()] = {
        name: c,

        r: c === 'r',
        w: c === 'w',
        x: c === 'x',

        rw: false,
        rx: false,
        wx: false,

        rwx: false,

        mask: mask
    };

    ACCESS[obj.mask] = obj;
    Object.freeze(obj);

    for (let i = index + 1; i < array.length; ++i) {
        let c2 = 'rwx'[i];
        let key = c + c2; // rw, rx and wx
        let KEY = key.toUpperCase();
        let obj2 = ACCESS[key] = ACCESS[KEY] = File[KEY] = Object.assign({}, obj);

        obj2[c2] = obj2[key] = true;
        obj2.name = key;
        obj2.mask |= array[i];

        ACCESS[obj2.mask] = obj2;

        Object.freeze(obj2);
    }
});

Object.freeze(ACCESS.rwx);
Object.freeze(ACCESS);

//--------------------

function addTypeTest (name, statMethod, statMethodAsync) {
    const prop = '_' + name;

    statMethod = statMethod || 'stat';
    statMethodAsync = statMethodAsync || 'getStat';
    proto[prop] = null;

    proto['get' + name[0].toUpperCase() + name.substr(1)] = function () {
        let value = this[prop];

        if (value !== null) {
            return Promise.resolve(value);
        }

        return this[statMethodAsync](true).then(stat => {
            return this[prop] = (stat ? stat[name]() : false);
        });
    };

    return proto[name] = function () {
        let value = this[prop];

        if (value === null) {
            let stat = this[statMethod](true);

            this[prop] = value = (stat ? stat[name]() : false);
        }

        return value;
    };
}

addTypeTest('isSymbolicLink', 'statLink');

[
    'isBlockDevice', 'isCharacterDevice', 'isDirectory', 'isFile', 'isFIFO',
    'isSocket'
].forEach(fn => addTypeTest(fn));

proto.isDir = proto.isDirectory;
proto.isSymLink = proto.isSymbolicLink;
proto.getIsSymLink = proto.getIsSymbolicLink;

//------------------------------------------------------------

const dateParts = [
    'birthtime',
    'atime',
    'mtime'
];

class Win {
    static dir (path) {
        return Win.run('dir', path).then(lines => {
            let content = lines.filter(line => !!line);
            return content.map(Win.parseStat);
        });
    }

    static parseStat (text) {
        // attr/ctime/atime/mtime/size/name
        // [0]  [1]   [2]   [3]   [4]  [5]
        let parts = text.split('/');
        let stat = new Fs.Stats();

        for (let i = 0; i < dateParts.length; ++i) {
            let d = new Date();

            d.setTime(+parts[i+1] * 1000); // millisec

            stat[dateParts[i]] = d;
        }

        stat.attribs = parts[0];
        stat.ctime = stat.mtime;  // no ctime on Windows
        stat.path = parts[5];
        stat.size = +parts[4];

        return stat;
    }

    static run (...args) {
        return Win.spawn(Win.exe, ...args);
    }

    static spawn (cmd, ...args) {
        return new Promise(resolve => {
            var lines = '';
            var process = ChildProcess.spawn(cmd, args, { encoding: 'utf8' });

            process.stdout.on('data', data => {
                lines += data.toString();
                console.log('data:', data);
            });

            process.on('error', function(err) {
                console.log('error', err);
            });
            process.on('exit', function(err) {
                console.log('exit', err);
            });

            process.on('close', (code, signal) => {
                console.log(`${cmd} ${args.join(" ")}:`, lines, ` (exit ${process.exitCode})`);
                if (process.exitCode) {
                    resolve(process.exitCode);
                }
                else {
                    resolve(lines.trim().split('\r\n'));
                }
            });
        });
    }
}

if (File.WIN) {
    Win.exe = Path.resolve(__dirname, 'bin/phylo.exe');

    File.Win = Win;

    console.log(`File.Win.exe = ${Win.exe}`);
}

//------------------------------------------------------------

module.exports = File;

//------------------------------------------------------------

var f = File.cwd();

console.log(f);
console.log(f.exists());
console.log(f.access().name);

f = f.whereDir('.git');
console.log('Where is .git: ', f);
console.log(File.exists(f));
console.log(File.access(f));

//console.log('The stat: ', f.stat());
console.log(`is: file=${File.isFile(f)} dir=${File.isDirectory(f)}`);
