'use strict';

// TODO rm -rf
// TODO sanitize
// TODO temp (see tmp module)
// TODO write

const Fs = require('fs');
const OS = require('os');
const Path = require('path');
const json5 = require('json5');
const mkdirp = require('mkdirp');

let fswin;  // cannot load here or (boom) on non-Windows

const platform = OS.platform();

const re = {
    abs: /^~{1,2}[\/\\]/,
    homey: /^~[\/\\]/,
    profile: /^~~[\/\\]/,
    slash: /\\/g,
    split: /[\/]/g
};

function detildify (p) {
    if (p) {
        if (p === '~') {
            p = OS.homedir();
        }
        else if (p === '~~') {
            p = File.profile().path;
        }
        else if (re.homey.test(p)) {
            // if (p starts with "~/" or "~\\")
            p = Path.join(OS.homedir(), p.substr(1));
        }
        else if (re.profile.test(p)) {
            // if (p starts with "~~/" or "~~\\")
            p = File.profile().join(p.substr(2)).path;
        }
    }

    return p;
}

/**
 * @class FileAccess
 * This class contains useful boolean properties that categories file access. This makes
 * for shorter code then use of `fs.constants.R_OK` and related masks.
 *
 *      // path is a string path
 *
 *      let mode = fs.statSync(path).mode;
 *
 *      if (mode & fs.constants.R_OK && mode & fs.constants.W_OK) {
 *          // path is R and W
 *      }
 *      // else path is missing R and/or W
 *
 *      // or
 *
 *      try {
 *          fs.accessSync(path, fs.constants.R_OK | fs.constants.W_OK);
 *
 *          // path is R and W
 *      }
 *      catch (e) {
 *          // path is missing R and/or W
 *      }
 *
 * Or using `File`:
 *
 *      // file is a File instance
 *
 *      if (file.can('rw')) {
 *          // file is R and W
 *      }
 *      // else file is missing R and/or W
 */

/**
 * @property {Number} mask
 * @readonly
 * This property holds the bit-wise OR of the available access modes `fs.constants.R_OK`,
 *  `fs.constants.W_OK` and/or  `fs.constants.X_OK`.
 */
/**
 * @property {"r"/"rw"/"rwx"/"w"/"wx"/"x"} name
 * @readonly
 * This string holds the available access modes as single letters.
 */
/**
 * @property {Boolean} r
 * @readonly
 * This property is `true` if the file can be read.
 */
/**
 * @property {Boolean} rw
 * @readonly
 * This property is `true` if the file can be read and written.
 */
/**
 * @property {Boolean} rx
 * @readonly
 * This property is `true` if the file can be read and executed.
 */
/**
 * @property {Boolean} rwx
 * @readonly
 * This property is `true` if the file can be read, written and executed.
 */
/**
 * @property {Boolean} w
 * @readonly
 * This property is `true` if the file can be written.
 */
/**
 * @property {Boolean} wx
 * @readonly
 * This property is `true` if the file can be written and executed.
 */
/**
 * @property {Boolean} x
 * @readonly
 * This property is `true` if the file can be executed.
 */

//================================================================================

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
 * All async methods return promises and have names that look like `asyncFoo()`. For
 * example, the `stat` method is synchronous while the asynchronous version is
 * `asyncStat`.
 *
 *      var st = file.stat();  // sync
 *
 *      file.asyncStat().then(st => {
 *          // async
 *      });
 */
class File {
    //noinspection JSUnusedGlobalSymbols
    /**
     * Returns the `FileAccess` object describing the access modes available for the
     * specified file. This will be `null` if the file does not exist.
     *
     * @param {String/File} file The `File` instance of path as a string.
     * @return {FileAccess} The `FileAccess` descriptor.
     */
    static access (file) {
        if (!file) {
            return null;
        }

        return File.from(file).access();
    }

    /**
     * Returns the `process.cwd()` as a `File` instance.
     * @return {File} The `process.cwd()` as a `File` instance.
     */
    static cwd () {
        return new this(process.cwd());
    }

    /**
     * Returns `true` if the specified file exists, `false` if not.
     * @param {String/File} file The `File` or path to test for existence.
     * @return {Boolean} `true` if the file exists.
     */
    static exists (file) {
        if (!file) {
            return false;
        }

        return File.from(file).exists();
    }

    /**
     * Returns a `File` for the specified path (if it is not already a `File`).
     * @param {String/File} path The `File` or path to convert to a `File`.
     * @return {File} The `File` instance.
     */
    static from (path) {
        var file = path || null;

        if (file && !file.$isFile) {
            file = new this(path);
        }

        return file;
    }

    /**
     * Returns the `os.homedir()` as a `File` instance. On Windows, this is something
     * like `"C:\Users\Name"`.
     *
     * @return {File} The `os.homedir()` as a `File` instance.
     */
    static home () {
        return new this(OS.homedir());
    }

    /**
     * Returns `true` if the specified path is a directory, `false` if not.
     * @param {String/File} file The `File` or path to test.
     * @return {Boolean} Whether the file is a directory or not.
     */
    static isDir (file) {
        if (!file) {
            return false;
        }

        return File.from(file).isDir();
    }

    /**
     * Returns `true` if the specified path is a file, `false` if not.
     * @param {String/File} file The `File` or path to test.
     * @return {Boolean} Whether the file is a file or not (opposite of isDir).
     */
    static isFile (file) {
        if (!file) {
            return false;
        }

        return File.from(file).isFile();
    }

    /**
     * This method is the same as `join()` in the `path` module except that the items
     * can be `File` instances or `String` and a `File` instance is returned.
     * @param {File.../String...} parts Path pieces to join using `path.join()`.
     * @return {File} The `File` instance from the resulting path.
     */
    static join (...parts) {
        var f = File.joinPath(...parts);
        return new File(f);
    }

    /**
     * This method is the same as `join()` in the `path` module except that the items
     * can be `File` instances or `String`.
     * @param {File.../String...} parts Path pieces to join using `path.join()`.
     * @return {String} The resulting path.
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

    /**
     * Returns the path as a string given a `File` or string.
     * @param {String/File} file
     * @return {String} The path.
     */
    static path (file) {
        return ((file && file.$isFile) ? file.path : file) || '';
    }

    /**
     * Returns the folder into which applications should save data for their users. For
     * example, on Windows this would be `"C:\Users\Name\AppData\Roaming\Company"` where
     * "Name" is the user's name and "Company" is the owner of the data (typically the
     * name of the company producing the application).
     *
     * This location is platform-specific:
     *
     *  - Windows:  C:\Users\Name\AppData\Roaming\Company
     *  - Mac OS X: /Users/Name/Library/Application Support/Company
     *  - Linux:    /home/name/.local/share/data/company
     *  - Default:  /home/name/.company
     *
     * The set of recognized platforms for profile locations is found in `profilers`.
     *
     * @param {String} company The name of the application's producer.
     * @return {File} The `File` instance.
     */
    static profile (company) {
        company = company || File.COMPANY;

        if (!company) {
            throw new Error('Must provide company name to isolate profile data');
        }

        var fn = File.profilers[platform] || File.profilers.default;

        return fn(File.home(), company);
    }

    /**
     * This method is the same as `resolve()` in the `path` module except that the items
     * can be `File` instances or `String` and a `File` instance is returned.
     * @param {File.../String...} parts Path pieces to resolve using `path.resolve()`.
     * @return {File} The `File` instance.
     */
    static resolve (...parts) {
        var f = File.resolvePath(...parts);
        return new File(f);
    }

    /**
     * This method is the same as `resolve()` in the `path` module except that the items
     * can be `File` instances or `String`.
     * @param {File.../String...} parts Path pieces to resolve using `path.resolve()`.
     * @return {String} The resulting path.
     */
    static resolvePath (...parts) {
        for (let i = 0, n = parts.length; i < n; ++i) {
            let p = parts[i];

            if (p.$isFile) {
                p = p.path;
            }

            parts[i] = detildify(p);
        }

        return (parts && parts.length && Path.resolve(...parts)) || '';
    }

    /**
     * Splits the given `File` or path into an array of parts.
     * @param {String/File} filePath
     * @return {String[]} The path parts.
     */
    static split (filePath) {
        let path = File.path(filePath);
        return path.split(re.split);
    }

    /**
     * Compares two files using the `File` instances' `compare` method.
     * @param file1 A `File` instance.
     * @param file2 A `File` instance.
     * @return {Number}
     */
    static sorter (file1, file2) {
        var a = File.from(file1);
        return a.compare(file2);
    }

    //-----------------------------------------------------------------

    /**
     * Initialize an instance by joining the given path fragments.
     * @param {File/String...} parts The path fragments.
     */
    constructor (...parts) {
        this.path = File.joinPath(...parts);
    }

    //----------------------------
    // Properties

    /**
     * @property {String} name
     * @readonly
     * The name of the file at the end of the path. For example, given "/foo/bar/baz",
     * the `name` is "baz".
     * Typically known as `basename` on unix-like systems.
     */
    get name () {
        var name = this._name;

        if (name === undefined) {
            let index = this.lastSeparator();

            this._name = name = ((index > -1) && this.path.substr(index + 1)) || '';
        }

        return name;
    }

    /**
     * @property {File} parent
     * @readonly
     * The parent directory of this file. For example, for "/foo/bar/baz" the `parent` is
     * "/foo/bar". This is `null` for the file system root.
     * Typically known as `dirname` on unix-like systems.
     */
    get parent () {
        var parent = this._parent;

        if (parent === undefined) {
            let path = this.path;
            let sep = this.lastSeparator();
            let ret;

            if (sep < 0) {
                ret = File.resolvePath(path, '..');

                if (path === ret) {
                    ret = null;
                }
            }
            else {
                ret = path.substr(0, sep);
            }

            this._parent = parent = ret && new File(ret);
        }

        return parent;
    }

    /**
     * @property {String} extent
     * @readonly
     * The type of the file at the end of the path. For example, given "/foo/bar/baz.js",
     * the `extent` is "js". Returns `''` for files with no extension (e.g. README).
     */
    get extent () {
        var ext = this._extent;

        if (ext === undefined) {
            let name = this.name;
            let index = name.lastIndexOf('.');

            this._extent = ext = ((index > -1) && name.substr(index + 1)) || '';
        }

        return ext;
    }

    /**
     * @property {String} fspath
     * @readonly
     * The same as `path` property except resolved for `"~"` pseudo-roots and hence
     * useful for `fs` module calls.
     */
    get fspath () {
        return detildify(this.path);
    }

    //-----------------------------------------------------------------
    // Path calculation

    /**
     * Return absolute path to this file.
     * @return {String}
     */
    absolutePath () {
        return File.resolvePath(this.path);
    }

    //noinspection JSUnusedGlobalSymbols
    /**
     * Returns a `File` instance created from the `absolutePath`.
     * @return {File}
     */
    absolutify () {
        return File.from(this.absolutePath()); // null/blank handling
    }

    asyncCanonicalPath () {
        let path = this.absolutePath();

        return new Promise(resolve => {
            Fs.realpath(path, (err, result) => {
                if (err) {
                    resolve(null);
                }
                else {
                    resolve(result);
                }
            });
        })
    }

    asyncCanonicalize () {
        return this.asyncCanonicalPath().then(path => {
            return File.from(path);
        });
    }

    /**
     * Returns the canonical path to this file.
     * @return {String} The canonical path of this file or `null` if no file exists.
     */
    canonicalPath () {
        try {
            return Fs.realpathSync(this.absolutePath());
        } catch (e) {
            return null;
        }
    }

    /**
     * Returns a `File` instance created from the canonical path
     * @return {File} The `File` with the canonical path or `null` if no file exists.
     */
    canonicalize () {
        return File.from(this.canonicalPath()); // null/blank handling
    }

    joinPath (...parts) {
        return File.joinPath(this, ...parts);
    }

    join (...parts) {
        return File.join(this, ...parts);
    }

    lastSeparator () {
        var path = this.path,
            i = path.lastIndexOf('/');

        if (File.Win) {
            // Windows respects both / and \ as path separators
            i = Math.max(i, path.lastIndexOf('\\'));
        }

        return i;
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
            path = path.absolutePath();
        }

        let p = this.absolutePath();

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

    compare (other) {
        other = File.from(other);

        if (!other) {
            return 1;
        }

        if (this._stat && other._stat) {
            let p = this.parent;

            if (p && p.equals(other.parent)) {
                // Two files in the same parent folder both w/stats
                let d1 = this._stat.isDirectory();
                let d2 = other._stat.isDirectory();

                if (d1 !== d2) {
                    return d1 ? -1 : 1;
                }
            }
        }

        // Treat "/foo/bar" and "/foo/bar/" as equal (by stripping trailing delimiters)
        let a = this.unterminatedPath();
        let b = other.unterminatedPath();

        // TODO locale

        // If the platform has case-insensitive file names, ignore case...
        if (!File.CASE) {
            a = a.toLowerCase();
            b = b.toLowerCase();
        }

        return (a < b) ? -1 : ((b < a) ? 1 : 0);
    }

    equals (other) {
        let c = this.compare(other);

        return c === 0;
    }

    isAbsolute () {
        var p = this.path;
        return p ? re.abs.test(p) || Path.isAbsolute(p) : false;
    }

    isRelative () {
        return this.path ? !this.isAbsolute() : false;
    }

    prefixes (subPath) {
        subPath = File.from(subPath);

        if (subPath) {
            // Ensure we don't have trailing slashes ("/foo/bar/" => "/foo/bar")
            let a = this.slashify().unterminatedPath();
            let b = subPath.slashifiedPath();

            if (!File.CASE) {
                a = a.toLowerCase();
                b = b.toLowerCase();
            }

            if (a.startsWith(b)) {
                // a = "/foo/bar"
                // b = "/foo/bar/zip" ==> true
                // b = "/foo/barf"    ==> false
                return b[a.length] === '/';
            }
        }

        return false;
    }

    //-----------------------------------------------------------------
    // File system checks

    /**
     * Returns a `FileAccess` object describing the access available for this file. If
     * the file does not exist, `null` is returned.
     *
     *      var acc = File.from(s).access();
     *
     *      if (!acc) {
     *          // no file ...
     *      }
     *      else if (acc.rw) {
     *          // file at location s has R and W permission
     *      }
     *
     * Alternatively:
     *
     *      if (File.from(s).can('rw')) {
     *          // file at location s has R and W permission
     *      }
     *
     * @return {FileAccess}
     */
    access () {
        var st = this.stat();

        if (st === null) {
            return null;
        }

        let mask = st.mode & File.RWX.mask;
        return ACCESS[mask] || null;
    }

    /**
     * Returns `true` if the desired access is available for this file.
     * @param {"r"/"rw"/"rx"/"rwx"/"w"/"wx"/"x"} mode
     * @return {Boolean}
     */
    can (mode) {
        var acc = this.access();

        return acc ? acc[mode] : false;
    }

    /**
     * Returns `true` if this file exists, `false` if not.
     * @return {Boolean}
     */
    exists () {
        var st = this.stat();
        return st !== null;
    }

    /**
     * Returns `true` if the specified path exists relative to this path.
     * @param {String} rel A path relative to this path.
     * @return {Boolean}
     */
    has (rel) {
        var f = this.resolve(rel);
        return f.exists();
    }

    /**
     * Returns `true` if the specified directory exists relative to this path.
     * @param {String} rel A path relative to this path.
     * @return {Boolean}
     */
    hasDir (rel) {
        var f = this.resolve(rel);

        return f.isDir();
    }

    /**
     * Returns `true` if the specified file exists relative to this path.
     * @param {String} rel A path relative to this path.
     * @return {Boolean}
     */
    hasFile (rel) {
        var f = this.join(rel);

        return f.isFile();
    }

    /**
     * Returns `true` if this file is a hidden file.
     * @param {Boolean} [strict] Pass `true` to match native Explorer/Finder meaning
     * of hidden state.
     * @return {Boolean}
     */
    isHidden (strict) {
        if (!File.Win || !strict) {
            let name = this.name || '';

            if (name[0] === '.') {
                return true;
            }
        }

        if (File.Win) {
            var st = this.stat();

            if (st.attribs && st.attribs.indexOf('H') > -1) {
                return true;
            }
        }

        return false;
    }

    /**
     * Returns the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` but
     * ensures a fresh copy of the stats are fetched from the file-system.
     *
     * @param {Boolean} [cache] Pass `true` to retain a cached stat object after this
     * call.
     * @return {fs.Stats}
     */
    restat (cache) {
        this._stat = null;

        let ret = this.stat();

        if (cache) {
            this._stat = ret;
        }

        return ret;
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link but ensures a fresh copy of the stats are fetched
     * from the file-system.
     *
     * @param {Boolean} [cache] Pass `true` to retain a cached stat object after this
     * call.
     * @return {fs.Stats}
     */
    restatLink (cache) {
        this._stat = null;

        let ret = this.statLink();

        if (cache) {
            this._stat = ret;
        }

        return ret;
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)`.
     *
     *      var st = File.from(s).stat();
     *
     *      if (st) {
     *          // file exists...
     *      }
     *
     * In cases where details of the failure are desired, pass `true` to enable `strict`
     * processing:
     *
     *      var st = File.from(s).stat(true);
     *
     *      // will throw if file does not exist or is inaccessible, etc..
     *
     * Note that in some cases (e.g., a directory listing created the instance), a stat
     * object may be cached on this instance. If so, that object will always be returned.
     * Use `restat` to ensure a fresh stat from the file-system.
     *
     * @return {fs.Stats} The stats or `null` if the file does not exist.
     */
    stat () {
        let ret = this._stat;

        if (!ret) {
            let path = this.fspath;

            try {
                ret = Fs.statSync(path);

                if (File.Win) {
                    ret.attribs = Win.attrib(path);
                }
            }
            catch (e) {
                // ignore
            }
        }

        return ret;
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link.
     *
     * Note that in some cases (e.g., a directory listing created the instance), a stat
     * object may be cached on this instance. If so, that object will always be returned.
     * Use `restatLink` to ensure a fresh stat from the file-system.
     *
     * @return {fs.Stats} The stats or `null` if the file does not exist.
     */
    statLink () {
        let ret = this._stat;

        if (!ret) {
            let path = this.fspath;

            try {
                ret = Fs.lstatSync(path);

                if (File.Win) {
                    ret.attribs = Win.attrib(path);
                }
            }
            catch (e) {
                // ignore
            }
        }

        return ret;
    }

    /**
     * Starting at this location, searches upwards for a location that passes the provided
     * `test` function. If `test` is a string, it will match any item (file or folder).
     *
     *      // climb until a folder has a ".git" item (file or folder)
     *      f = file.up('.git');
     *
     *      // f references the folder that contains the ".git" folder.
     *
     *      // Climb until a folder has a ".git" sub-folder.
     *      f = file.up(p => p.join('.git').isDirectory());
     *
     * The above is equivalent to:
     *
     *      f = file.upDir('.git');
     *
     *      // f references the folder that contains the ".git" folder.
     *
     * @param {String/Function} test If a string is passed, the string is passed to the
     * `has` method. Otherwise, the `test` function is called with the candidate and
     * should return `true` to indicate a match.
     * @return {File}
     */
    up (test) {
        let fn = (typeof test === 'string') ? (p => p.has(test)) : test;

        for (let parent = this; parent; parent = parent.parent) {
            if (fn(parent)) {
                return parent;
            }
        }

        return null;
    }

    /**
     * Searches upwards for a folder that has the specified sub-directory.
     *
     *      f = file.upDir('.git');
     *
     *      // f references the folder that contains the ".git" folder.
     *
     * @param {String} dir The sub-directory that the desired parent must contain.
     * @return {File}
     */
    upDir (dir) {
        return this.up(parent => parent.hasDir(dir));
    }

    /**
     * Searches upwards for a folder that has the specified file.
     *
     *      f = file.upFile('package.json');
     *
     *      // f references the folder that contains the "package.json" file.
     *
     * @param {String} file The file that the desired parent must contain.
     * @return {File}
     */
    upFile (file) {
        return this.up(parent => parent.hasFile(file));
    }

    /**
     * Starting at this location, searches upwards for a location that contains the given
     * item and returns a `File` describing the item.
     *
     *      // climb until a folder has a ".git" item (file or folder)
     *      f = file.upTo('.git');
     *
     *      // f references the ".git" folder.
     *
     * The above is equivalent to:
     *
     *      f = file.upToDir('.git');
     *
     *      // f references the ".git" folder.
     *
     * @param {String} name A name passed to the `has` method.
     * @return {File}
     */
    upTo (name) {
        let ret = this.up(name);

        if (ret) {
            ret = ret.join(name);
        }

        return ret;
    }

    /**
     * Searches upwards for a folder that has the specified sub-directory and returns a
     * `File` describing the sub-directory.
     *
     *      f = file.upToDir('.git');
     *
     *      // f references the ".git" folder.
     *
     * @param {String} dir The sub-directory that the desired parent must contain.
     * @return {File}
     */
    upToDir (dir) {
        let ret = this.upDir(dir);

        if (ret) {
            ret = ret.join(dir);
        }

        return ret;
    }

    /**
     * Searches upwards for a folder that has the specified file.
     *
     *      f = file.upToFile('package.json');
     *
     *      // f references the ".git" folder.
     *
     * @param {String} file The file that the desired parent must contain.
     * @return {File}
     */
    upToFile (file) {
        let ret = this.upFile(file);

        if (ret) {
            ret = ret.join(file);
        }

        return ret;
    }

    //------------------------------------------------------------------
    // File system checks (async)

    /**
     * Returns a `FileAccess` object describing the access available for this file. If the
     * file does not exist, `null` is returned.
     *
     *      File.from(s).asyncAccess().then(acc => {
     *          if (!acc) {
     *              // no file ...
     *          }
     *          else if (acc.rw) {
     *              // file at location s has R and W permission
     *          }
     *      });
     *
     * Alternatively:
     *
     *      File.from(s).asyncCan('rw').then(can => {
     *          if (can) {
     *              // file at location s has R and W permission
     *          }
     *      });
     *
     * @return {Promise}
     */
    asyncAccess () {
        return this.asyncStat().then(st => {
            if (st === null) {
                return null;
            }

            let mask = st.mode & File.RWX.mask;
            return ACCESS[mask];
        });
    }

    asyncCan (mode) {
        return this.asyncAccess().then(acc => {
            if (acc === null) {
                return false;
            }

            return acc[mode] || false;
        });
    }

    asyncExists () {
        return this.asyncStat().then(st => {
            return st !== null;
        });
    }

    /**
     * Returns a Promise that resolves to `true` if this file is a hidden file.
     * @param {Boolean} [strict] Pass `true` to match native Explorer/Finder meaning
     * of hidden state.
     * @return {Promise<Boolean>}
     */
    asyncIsHidden (strict) {
        if (!File.Win || !strict) {
            let name = this.name || '';

            if (name[0] === '.') {
                return Promise.resolve(true);
            }
        }

        if (File.Win) {
            return this.asyncStat().then(st => {
                return st.attribs ? st.attribs.indexOf('H') > -1 : false;
            });
        }

        return Promise.resolve(false);
    }

    /**
     * Returns the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` but
     * ensures a fresh copy of the stats are fetched from the file-system.
     *
     * @param {Boolean} [cache] Pass `true` to retain a cached stat object after this
     * call.
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncRestat (cache) {
        this._stat = null;

        let ret = this.asyncStat();

        if (cache) {
            ret = ret.then(st => {
                return this._stat = st;
            });
        }

        return ret;
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link but ensures a fresh copy of the stats are fetched
     * from the file-system.
     *
     * @param {Boolean} [cache] Pass `true` to retain a cached stat object after this
     * call.
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncRestatLink (cache) {
        this._stat = null;

        let ret = this.asyncStatLink();

        if (cache) {
            ret = ret.then(st => {
                return this._stat = st;
            });
        }

        return ret;
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)`.
     *
     *      File.from(s).asyncStat().then(st => {
     *          if (st) {
     *              // file exists...
     *          }
     *      });
     *
     * In cases where details of the failure are desired, pass `true` to enable `strict`
     * processing:
     *
     *      File.from(s).asyncStat(true).then(st => {
     *          // file exists...
     *      },
     *      err => {
     *          // file does not exist or is inaccessible, etc..
     *      });
     *
     * Note that in some cases (e.g., a directory listing created the instance), a stat
     * object may be cached on this instance. If so, that object will always be returned.
     * Use `asyncRestat` to ensure a fresh stat from the file-system.
     *
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncStat () {
        if (this._stat) {
            return Promise.resolve(this._stat);
        }

        let path = this.fspath;

        return this._async('_asyncStat', () => {
            return new Promise(resolve => {
                Fs.stat(path, (err, stats) => {
                    if (err) {
                        resolve(null);
                    }
                    else if (File.Win) {
                        Win.asyncAttrib(path).then(attr => {
                            stats.attribs = attr;
                            resolve(stats);
                        },
                        e => {
                            stats.attribs = '';
                            resolve(stats);
                        });
                    }
                    else {
                        resolve(stats);
                    }
                });
            });
        });
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link.
     *
     *      File.from(s).asyncStatLink().then(st => {
     *          if (st) {
     *              // file exists...
     *          }
     *      });
     *
     * Note that in some cases (e.g., a directory listing created the instance), a stat
     * object may be cached on this instance. If so, that object will always be returned.
     * Use `asyncRestatLink` to ensure a fresh stat from the file-system.
     *
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncStatLink () {
        if (this._stat) {
            return Promise.resolve(this._stat);
        }

        let path = this.fspath;

        return this._async('_asyncStatLink', () => {
            return new Promise(resolve => {
                Fs.lstat(path, (err, stats) => {
                    if (err) {
                        resolve(null);
                    }
                    else if (File.Win) {
                        Win.asyncAttrib(path).then(attr => {
                            stats.attribs = attr;
                            resolve(stats);
                        },
                        e => {
                            stats.attribs = '';
                            resolve(stats);
                        });
                    }
                    else {
                        resolve(stats);
                    }
                });
            });
        });
    }

    //-----------------------------------------------------------------
    // Directory Operations

    static _parseListMode (mode) {
        if (mode && mode.constructor === Object) {
            return mode;
        }

        var options = File._parseMode({
            A: false,
            d: false,
            f: false,
            l: false,
            o: true,
            s: false,
            w: false,
            T: false
        }, mode);

        options.hideDots = File.Win ? !options.w : true;
        options.cachify = options.l || options.s;
        options.statify = options.s || options.f || options.d;

        return options;
    }

    static _parseMode (flags, mode) {
        let enable = null;

        for (let i = 0, n = mode && mode.length; i < n; ++i) {
            let c = mode[i];

            if (c === '-' || c === '+') {
                if (enable === null) {
                    enable = c === '+';
                }
                else {
                    throw new Error(`Invalid mode modifier "${mode.substr(i-1)}"`);
                }
            }
            else if (!(c in flags)) {
                throw new Error(`Invalid mode flag "${c}"`);
            }
            else {
                flags[c] = enable !== false;
                enable = null;
            }
        }

        return flags;
    }

    asyncList (mode) {
        var options = File._parseListMode(mode);

        return new Promise((resolve, reject) => {
            var fail = e => {
                if (options.T) {
                    if (reject) {
                        reject(e);
                    }
                }
                else if (resolve) {
                    resolve(null);
                }

                reject = resolve = null;
            };

            var finish = () => {
                if (!resolve) {
                    return;
                }

                reject = null;

                if (options.f) {
                    result = result.filter(f => !f._stat.isDirectory());
                }
                else if (options.d) {
                    result = result.filter(f => f._stat.isDirectory());
                }

                if (!options.A) {
                    result = result.filter(f => {
                        let name = f.name;

                        if (options.hideDots && name[0] === '.') {
                            return false;
                        }

                        let attrib = f._stat.attribs || '';

                        return attrib.indexOf('H') < 0;
                    });
                }

                if (!options.cachify) {
                    result.forEach(f => {
                        f._stat = null;
                    });
                }

                if (options.o) {
                    result.sort(File.sorter);
                }

                resolve(result);
                resolve = null;
            };

            var result = [];

            Fs.readdir(this.fspath, (err, names) => {
                if (err) {
                    if (options.T) {
                        reject(err);
                    }
                    else {
                        resolve(null);
                    }
                    return;
                }

                var promises = [];

                names.forEach(name => {
                    let f = new File(this, name);
                    f._parent = this;

                    result.push(f);

                    if (options.l) {
                        promises.push(f.asyncStatLink().then(st => {
                            f._stat = st;
                        }));
                    }
                    else if (options.statify) {
                        promises.push(f.asyncStat().then(st => {
                            f._stat = st;
                        }));
                    }
                });

                if (promises.length) {
                    Promise.all(promises).then(finish, fail);
                }
                else {
                    finish();
                }
            });
        });
    }

    /**
     * Returns a listing of items in this directory. The `mode` parameter can be used
     * to adjust what is reported.
     *
     * The `mode` string contains character codes with optional "+" or "-" prefixes to
     * indicate enabled or disabled. When no prefix is provided, the option is enabled.
     *
     * For example:
     *
     *      // List non-hidden files:
     *      dir.list();
     *
     *      // lists all items (including hidden):
     *      dir.list('A');
     *
     *      // lists non-hidden files and cache stat info:
     *      dir.list('s');
     *
     *      // lists all files and cache stat info:
     *      dir.list('As');
     *
     *      // lists all files and cache stat info but do not sort:
     *      dir.list('As-o');
     *
     * The valid options are:
     *
     *  - **A** All files are listed, even hidden files. (default is `false`)
     *  - **d** List only directories. (default is `false`)
     *  - **f** List only files (non-directories). (default is `false`)
     *  - **l** Cache the result of `statLink` for each file. (default is `false`)
     *  - **o** Order the items by `sorter`. (default is `true`)
     *  - **s** Cache the result of `stat` for each file. (default is `false`)
     *  - **w** Indicates that Windows hidden flag alone determines hidden status
     *   (default is `false` so that files names starting with dots are hidden on all
     *   platforms).
     *  - **T** Throw on failure instead of return `null`.
     *
     * @param {String} mode A string containing the mode characters described above.
     * @return {File[]}
     */
    list (mode) {
        var options = File._parseListMode(mode);
        var ret = [];
        var names;

        if (options.T) {
            names = Fs.readdirSync(this.fspath);
        }
        else {
            try {
                names = Fs.readdirSync(this.fspath);
            }
            catch (e) {
                return null;
            }
        }

        for (let i = 0, n = names.length; i < n; ++i) {
            let name = names[i];

            if (!options.A && options.hideDots && name[0] === '.') {
                continue;
            }

            let f = new File(this, name);
            f._parent = this;

            let st = options.l ? f.statLink() : (options.statify ? f.stat() : null);

            if (st) {
                if (!options.A && st.attribs && st.attribs.indexOf('H') > -1) {
                    continue;
                }
                if (options.f) {
                    if (st.isDirectory()) {
                        continue;
                    }
                }
                if (options.d) {
                    if (!st.isDirectory()) {
                        continue;
                    }
                }

                if (options.cachify) {
                    f._stat = st;
                }
            }

            ret.push(f);
        }

        if (options.o) {
            ret.sort(File.sorter);
        }

        return ret;
    }

    /**
     * Ensures this directory exists, creating any directories in this path as needed.
     *
     * Though there is no assurance it will always do so, this method uses the `mkdirp`
     * module to perform this operation.
     * @param {Number} mode The access mode as defined by `fs.mkdir`.
     * @return {File} This file instance
     * @chainable
     */
    mkdir (mode) {
        mkdirp.sync(this.fspath, {
            mode: mode
        });

        return this;
    }

    /**
     * Ensures this directory exists, creating any directories in this path as needed.
     *
     * Though there is no assurance it will always do so, this method uses the `mkdirp`
     * module to perform this operation.
     * @param {Number} mode The access mode as defined by `fs.mkdir`.
     * @return {Promise<File>} A Promise to this file instance.
     */
    asyncMkdir (mode) {
        return new Promise((resolve, reject) => {
            mkdirp(this.fspath, { mode: mode }, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(this);
                }
            });
        })
    }

    //-----------------------------------------------------------------
    // File Loader

    asyncLoad (options) {
        let loader = this.getLoader(options);

        return loader.asyncLoad(this);
    }

    getLoader (options) {
        let loader, opts, type;

        if (options) {
            if (typeof options === 'string') {
                type = options;
            }
            else {
                type = options.type;
                opts = options;

                if (type) {
                    opts = Object.assign({}, options);
                    delete opts.type;
                }
            }

            if (type) {
                loader = File.loaders[type];
                if (!loader) {
                    throw new Error(`No such loader as "${type}"`);
                }
            }
        }

        if (!loader) {
            loader = File.loaders[this.extent] || File.loaders.text; // eg extent="json"
        }

        if (opts) {
            loader = loader.extend(opts);
        }

        return loader;
    }

    /**
     * For example:
     *
     *      file.load();  // default loader
     *
     *      file.load('binary');  // use binary loader
     *
     *      file.load('text');  // use text loader
     *
     *      file.load({
     *          split: /\n/g  // default type but w/split config
     *      });
     *
     *      file.load({
     *          type: 'text',
     *          split: /\n/g
     *      });
     *
     *      file.load({
     *          type: 'text',
     *          encoding: 'utf16'  // encoding can be on loader config
     *      });
     *
     *      file.load({
     *          type: 'text',
     *          options: {  // raw fs options
     *              encoding: 'utf16'
     *          }
     *      });
     *
     * @param {String/Object} [options]
     * @return {*}
     */
    load (options) {
        let loader = this.getLoader(options);

        return loader.load(this);
    }

    //------------------------------------------------------------------------
    // File System Walking

    /**
     * This method asynchronously descends the file-system starting with this folder
     * checking for folders that match the specified `test`. See `tips` for details.
     *
     * @param {String} [mode] The `list` mode that controls directory listings.
     * @param {String/Function} test The test function to call or the string to pass to
     * `has`. If a function, the meaning is the same as with `tips` except that this
     * function can return a Promise.
     * @param {File} test.file The file object referencing the current file or folder
     * to examine.
     * @param {Object} test.state The current directory traversal state object. See
     * `walk`.
     * @param {Boolean} test.return Return `true` for a match to include the `file` and
     * avoid descent into the directory.
     * @return {File[]} The files that passed the `test`.
     */
    asyncTips (mode, test) {
        if (!test) {
            test = mode;
            mode = '';
        }

        var fn = (typeof test === 'string') ? f => f.has(test) : test;
        var ret = [];

        return this.asyncWalk(mode, (f, state) => {
            // If fn throws that is OK since asyncWalk has a try/catch to map it
            // to a Promise rejection...
            return Promise.resolve(fn(f, state)).then(r => {
                if (r) {
                    ret.push(f);
                    return false;  // don't descend
                }
            });
        }).then(() => ret);
    }

    /**
     * Asynchronously descends the file-system starting with the current location, calling
     * the provided `handler` for each file or folder.
     *
     * @param {String} [mode] The directory `list` mode string to control the traversal.
     * @param {Function} handler A function that will be called for each file/folder
     * starting with this instance. This is the same `handler` provided to the `walk`
     * method except that this function can return a Promise.
     * @param {File} handler.file The file object referencing the current file or folder
     * to examine.
     * @param {Object} handler.state The state object tracking the traversal.
     * @param {File} handler.state.at The current `file` instance.
     * @param {File} handler.state.previous The file instance passed to the `handler` on
     * the previous call.
     * @param {File[]} handler.state.stack The traversal stack of file objects from the
     * starting instance to the current folder.
     * @param {Boolean} handler.state.stop Set to `true` to abort the traversal.
     * @param {Promise<Boolean>} handler.return Return `false` to not descend into a folder.
     * @return {Promise<Object>} A promise that resolves to the `state` object after the
     * traversal is complete.
     */
    asyncWalk (mode, handler) {
        if (!handler) {
            handler = mode;
            mode = '';
        }

        // we need _stat to recurse on directories...
        var options = File._parseListMode('s' + (mode || ''));
        var state = {
            at: null,
            previous: null,
            stack: [],
            stop: false
        };

        function descend (f) {
            state.previous = state.at;
            state.at = f;

            try {
                let result = Promise.resolve(handler(f, state));

                return result.then(r => {
                    if (r === false || state.stop) {
                        return;
                    }

                    return f.asyncIsDir().then(isDir => {
                        if (isDir) {
                            return f.asyncList(options).then(children => {
                                let sequence = Promise.resolve();

                                state.stack.push(f);

                                children.forEach(c => {
                                    sequence = sequence.then(() => {
                                        if (!state.stop) {
                                            return descend(c);
                                        }
                                    });
                                });

                                return sequence.then(() => {
                                    state.stack.pop();
                                });
                            });
                        }
                    });
                });
            }
            catch (e) {
                return Promise.reject(e);
            }
        }

        return descend(this).then(r => state);
    }

    /**
     * This method descends the file-system starting with this folder checking for folders
     * that match the specified `test`. When a folder matches, it is accumulated into the
     * result array that is returned and the sub-tree is descended no further (that is the
     * "tip" of a matching sub-tree).
     *
     * For example:
     *
     *      var packageDirs = dir.tips('package.json');
     *
     * Finds all folders at "dir" or below that matches `has('package.json')`. When such
     * folders are found, no further descent is performed. In this case that will avoid
     * the "node_modules" sub-folder of such folders.
     *
     * @param {String} [mode] The `list` mode that controls directory listings.
     * @param {String/Function} test The test function to call or the string to pass to
     * `has`.
     * @param {File} test.file The file object referencing the current file or folder
     * to examine.
     * @param {Object} test.state The current directory traversal state object. See
     * `walk`.
     * @param {Boolean} test.return Return `true` for a match to include the `file` and
     * avoid descent into the directory.
     * @return {File[]} The files that passed the `test`.
     */
    tips (mode, test) {
        if (!test) {
            test = mode;
            mode = '';
        }

        var fn = (typeof test === 'string') ? f => f.has(test) : test;
        var ret = [];

        this.walk(mode, (f, state) => {
            if (fn(f, state)) {
                ret.push(f);
                return false;  // don't descend
            }
        });

        return ret;
    }

    /**
     * Synchronously processes the current file and (if it is a directory) all child
     * files or folders. Each `file` is passed along with a `state` object to the given
     * `handler` for processing. The `handler` should return `false` to not recurse into
     * a directory.
     *
     * @param {String} [mode] The directory `list` mode string to control the traversal.
     * @param {Function} handler A function that will be called for each file/folder
     * starting with this instance.
     * @param {File} handler.file The file object referencing the current file or folder
     * to examine.
     * @param {Object} handler.state The state object tracking the traversal.
     * @param {File} handler.state.at The current `file` instance.
     * @param {File} handler.state.previous The file instance passed to the `handler` on
     * the previous call.
     * @param {File[]} handler.state.stack The traversal stack of file objects from the
     * starting instance to the current folder.
     * @param {Boolean} handler.state.stop Set to `true` to abort the traversal.
     * @param {Boolean} handler.return Return `false` to not descend into a folder.
     * @return {Object} The state object used for the traversal.
     */
    walk (mode, handler) {
        if (!handler) {
            handler = mode;
            mode = '';
        }

        // we need _stat to recurse on directories...
        var options = File._parseListMode('s' + (mode || ''));
        var state = {
            at: null,
            previous: null,
            stack: [],
            stop: false
        };

        function descend (f) {
            state.previous = state.at;
            state.at = f;

            let ret = handler(f, state);

            if (ret === false || state.stop) {
                return;
            }

            if (f.isDir()) {
                state.stack.push(f);

                let children = f.list(options);
                for (let i = 0; !state.stop && i < children.length; ++i) {
                    descend(children[i]);
                }

                state.stack.pop();
            }
        }

        descend(this);
        return state;
    }

    //------------------------------------------------------------------------

    _async (name, fn) {
        var pending = this[name];

        if (!pending) {
            this[name] = pending = fn().then(result => {
                this[name] = null;
                return result;
            });
        }

        return pending;
    }

} // class File

//------------------------------------------------------------------------

File.Loader = class {
    constructor (config) {
        Object.assign(this, config);

        if (!this.options) {
            this.options = {};
        }
    }

    extend (config) {
        var loader = Object.create(this);

        if (config) {
            Object.assign(loader, config);

            loader.options = this.getOptions(config.options || {});

            if (!config.options) {
                // If the user didn't supply specific fs options, see about encoding
                if (config.encoding) {
                    // loader.options is always a safe copy we can adjust...
                    loader.options.encoding = config.encoding;
                }
            }
        }

        return loader;
    }

    getOptions (options) {
        var ret = this.options;

        if (options) {
            ret = Object.assign(Object.assign({}, ret), options);
            delete ret.type;
        }

        return ret;
    }

    asyncLoad (filename) {
        return this.asyncRead(filename).then(data => {
            return this._parse(filename, data);
        });
    }

    asyncRead (filename) {
        return new Promise((resolve, reject) => {
            Fs.readFile(File.from(filename).fspath, this.options, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }

    load (filename) {
        var data = this.read(filename);

        return this._parse(filename, data);
    }

    parse (data) {
        var split = this.split;

        if (split) {
            data = data.split(split);
        }

        return data;
    }

    read (filename) {
        return Fs.readFileSync(File.from(filename).fspath, this.options);
    }

    _parse (filename, data) {
        try {
            return this.parse(data, this);
        }
        catch (e) {
            e.message = `Cannot parse ${filename}: ${e.message}`;
            throw e;
        }
    }
};

File.loaders = {
    binary: new File.Loader(),

    text: new File.Loader({
        options: {
            encoding: 'utf8'
        }
    })
};

File.loaders.bin = File.loaders.binary;
File.loaders.txt = File.loaders.text;

File.loaders.json = File.loaders.text.extend({
    parse (data) {
        // Handles comments, single-quoted strings, unquoted object keys etc.. In
        // general, JSON5 is a very relaxed form of JSON that accepts all valid JSON
        // files and goes beyond to a nearly proper JavaScript-subset. All w/o eval
        // so it is secure.
        return json5.parse(data);
    }
});

['js','ts','coffee'].forEach(ext => {
    File.loaders[ext] = File.loaders.text.extend();
});

const proto = File.prototype;

Object.assign(proto, {
    $isFile: true,
    _re: re,
    _stat: null,

    _extent: undefined,
    _name: undefined,
    _parent: undefined
});

File.WIN = /^win\d\d$/i.test(platform);
File.MAC = /^darwin$/i.test(platform);

File.CASE = !File.WIN && !File.MAC;

File.isDirectory = File.isDir;
File.re = re;
File.separator = Path.sep;

File.profilers = {
    default (home, company) {
        return home.join(`.${company.toLowerCase()}`);
    },

    darwin (home, company) {
        return home.join(`Library/Application Support/${company}`);
    },

    linux (home, company) {
        return home.join(`.local/share/data/${company.toLowerCase()}`);
    },

    win32 (home, company) {
        return File.join(process.env.APPDATA || process.env.LOCALAPPDATA ||
                         home.join('AppData\\Roaming'), `${company}`);

    }
};

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
    statMethodAsync = statMethodAsync || 'asyncStat';
    proto[prop] = null;

    proto['async' + name[0].toUpperCase() + name.substr(1)] = function () {
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

addTypeTest('isSymbolicLink', 'statLink', 'asyncStatLink');

[
    'isBlockDevice', 'isCharacterDevice', 'isDirectory', 'isFile', 'isFIFO',
    'isSocket'
].forEach(fn => addTypeTest(fn));

proto.isDir = proto.isDirectory;
proto.asyncIsDir = proto.asyncIsDirectory;
proto.isSymLink = proto.isSymbolicLink;
proto.asyncIsSymLink = proto.asyncIsSymbolicLink;

//------------------------------------------------------------

class Win {
    static asyncAttrib (path) {
        return new Promise((resolve, reject) => {
            var process = results => {
                if (results) {
                    resolve(Win.convertAttr(results));
                }
                else {
                    reject(new Error(`Cannot get attributes for ${path}`));
                }
            };

            if (!fswin.getAttributes(path, process)) {
                reject(new Error(`Cannot get attributes for ${path}`));
            }
        })
    }

    static attrib (path) {
        var attr = fswin.getAttributesSync(path);
        return Win.convertAttr(attr);
    }

    static convertAttr (attr) {
        var ret = '';

        for (let i = 0, n = Win.attributes.length; i < n; ++i) {
            let a = Win.attributes[i];
            if (attr[a[0]]) {
                ret += a[1];
            }
        }

        return ret;
    }
}

Win.attributes = [
    //IS_DEVICE
    //IS_NOT_CONTENT_INDEXED
    //IS_SPARSE_FILE
    //IS_TEMPORARY
    //IS_INTEGRITY_STREAM
    //IS_NO_SCRUB_DATA
    //IS_REPARSE_POINT

    [ 'IS_ARCHIVED',    'A' ],
    [ 'IS_COMPRESSED',  'C' ],
    [ 'IS_DIRECTORY',   'D' ],
    [ 'IS_ENCRYPTED',   'E' ],
    [ 'IS_HIDDEN',      'H' ],
    [ 'IS_OFFLINE',     'O' ],
    [ 'IS_READ_ONLY',   'R' ],
    [ 'IS_SYSTEM',      'S' ]
];

if (File.WIN) {
    // Cannot require at file-scope since it wrecks non-Windows platforms:
    fswin = require('fswin');
    
    File.Win = Win;

    re.split = /[\/\\]/g;
}

//------------------------------------------------------------

module.exports = File;
