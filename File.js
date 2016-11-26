'use strict';

// TODO sanitize

const Fs = require('fs');
const OS = require('os');
const Path = require('path');

const platform = OS.platform();

const isWin = /^win\d\d$/i.test(platform);
const isMac = /^darwin$/i.test(platform);

// Do not require wrongly... fswin wrecks non-Windows platforms:
const fswin = isWin ? require('fswin') : null;

const json5  = require('json5');
const mkdirp = require('mkdirp');
const rimraf = require('rimraf');
const Tmp    = require('tmp');

const re = {
    abs: /^~{1,2}[\/\\]/,
    homey: /^~[\/\\]/,
    profile: /^~~[\/\\]/,
    slash: /\\/g,
    split: isWin ? /[\/\\]/g : /[\/]/g
};

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
 *      let absFile = file.absolutify();  // a File object
 *
 *      let absPath = file.absolutePath(); // a string
 *
 * ### Synchronous vs Asynchronous
 *
 * All async methods return promises and have names that look like `asyncFoo()`. For
 * example, the `stat` method is synchronous while the asynchronous version is
 * `asyncStat`.
 *
 *      let st = file.stat();  // sync
 *
 *      file.asyncStat().then(st => {
 *          // async
 *      });
 */
class File {
    //noinspection JSUnusedGlobalSymbols
    /**
     * Returns the `File.Access` object describing the access modes available for the
     * specified file. If an error is encountered determining the access (for example,
     * the file does not exist), the `error` property of the returned object will be
     * set accordingly.
     *
     * @param {String/File} filePath The `File` instance of path as a string.
     * @return {File.Access} The `File.Access` descriptor.
     */
    static access (filePath) {
        if (!filePath) {
            return Access.getError('ENOENT');
        }

        return File.from(filePath).access();
    }

    /**
     * Creates a temporary directory and returns a Promise to its path as a `File`.
     *
     * When no arguments are passed the first result is cached (since one temp dir is
     * often sufficient for a process).
     *
     *      let temp;
     *      let temp2;
     *      let temp3;
     *
     *      File.asyncTemp().then(t => temp = t);   // generates temp dir
     *      File.asyncTemp().then(t => temp2 = t);  // same dir (temp2 === temp)
     *
     *      File.asyncTemp(null).then(t => temp3 = t);  // new call to tmp.dir()
     *
     * Because only the first call to `temp()` does any real work, it is generally safe
     * to use `temp()` (instead of `asyncTemp()`) when no options are passed and the one
     * temporary folder is sufficient.
     *
     * @param {Object} [options] Options for `dir()` from the `tmp` module.
     * @return {Promise<File>}
     */
    static asyncTemp (options) {
        let cached = File._temp;
        let useCache = (options === undefined);

        if (cached && useCache) {
            return Promise.resolve(cached);
        }

        return new Promise((resolve, reject) => {
            Tmp.dir(options, (err, name) => {
                if (err) {
                    reject(err);
                }
                else {
                    let f = File.from(name);

                    if (useCache) {
                        // If we are after the shared temp, make sure it wasn't
                        // created during our async trip... If not, store this
                        // as the cached temp.
                        f = File._temp || (File._temp = f);
                    }

                    resolve(f);
                }
            });
        });
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
     * @param {String/File} filePath The `File` or path to test for existence.
     * @return {Boolean} `true` if the file exists.
     */
    static exists (filePath) {
        let st = File.stat(filePath);

        return !st.error;
    }

    /**
     * Returns a `File` for the specified path (if it is not already a `File`).
     * @param {String/File} filePath The `File` or path to convert to a `File`.
     * @return {File} The `File` instance.
     */
    static from (filePath) {
        let file = filePath || null;

        if (file && !file.$isFile) {
            file = new this(filePath);
        }

        return file;
    }

    /**
     * Returns the path as a string given a `File` or string.
     * @param {String/File} filePath
     * @return {String} The path.
     */
    static fspath (filePath) {
        return ((filePath && filePath.$isFile) ? filePath.fspath : filePath) || '';
    }

    /**
     * Converts a file-system "glob" pattern into a `RegExp` instance.
     *
     * For example:
     *
     *      glob('*.txt')
     *      glob('** /*.txt")
     *
     * See `File.Globber` for more details on `options`.
     *
     * @param {String} pattern The glob pattern to convert.
     * @param {String} [options=null] Pass `"E"` to enable "extended" globs like
     * in Bash. Pass "S" to treat "*" as simple (shell-like) wildcards. This will which
     * matches `"/"` characters with a `"*"`. By default, only `"**"` matches `"/"`.
     * Other options are passed along a `RegExp` flags (e.g., "i" and "g").
     * @return {RegExp}
     */
    static glob (pattern, options) {
        return Globber.get(options || '').compile(pattern);
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
     * @param {String/File} filePath The `File` or path to test.
     * @return {Boolean} Whether the file is a directory or not.
     */
    static isDir (filePath) {
        if (!filePath) {
            return false;
        }

        return File.from(filePath).isDir();
    }

    /**
     * Returns `true` if the specified path is a file, `false` if not.
     * @param {String/File} filePath The `File` or path to test.
     * @return {Boolean} Whether the file is a file or not (opposite of isDir).
     */
    static isFile (filePath) {
        if (!filePath) {
            return false;
        }

        return File.from(filePath).isFile();
    }

    /**
     * This method is the same as `join()` in the `path` module except that the items
     * can be `File` instances or `String` and a `File` instance is returned.
     * @param {File.../String...} parts Name fragments to join using `path.join()`.
     * @return {File} The `File` instance from the resulting path.
     */
    static join (...parts) {
        let f = File.joinPath(...parts);
        return new File(f);
    }

    /**
     * This method is the same as `join()` in the `path` module except that the items
     * can be `File` instances or `String`.
     * @param {File.../String...} parts Name fragments to join using `path.join()`.
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

        let ret = (n === 1) ? parts[0] : (n && File._p.join(...parts));

        return ret || '';
    }

    /**
     * Returns the path as a string given a `File` or string.
     * @param {String/File} filePath
     * @return {String} The path.
     */
    static path (filePath) {
        return ((filePath && filePath.$isFile) ? filePath.path : filePath) || '';
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

        let fn = File.profilers[platform] || File.profilers.default;

        return fn(File.home(), company);
    }

    /**
     * This method is the same as `resolve()` in the `path` module except that the items
     * can be `File` instances or `String` and a `File` instance is returned.
     * @param {File.../String...} parts Name fragments to resolve using `path.resolve()`.
     * @return {File} The `File` instance.
     */
    static resolve (...parts) {
        let f = File.resolvePath(...parts);
        return new File(f);
    }

    /**
     * This method is the same as `resolve()` in the `path` module except that the items
     * can be `File` instances or `String`.
     * @param {File.../String...} parts Name fragments to resolve using `path.resolve()`.
     * @return {String} The resulting path.
     */
    static resolvePath (...parts) {
        for (let i = 0, n = parts.length; i < n; ++i) {
            let p = parts[i];

            if (p.$isFile) {
                p = p.path;
            }

            parts[i] = File._detildify(p);
        }

        return (parts && parts.length && File._p.resolve(...parts)) || '';
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
     * Compares two files using the `File` instances' `compare('d')` method to sort
     * folder before files (each group being sorted by name).
     * @param filePath1 A `File` instance or string path.
     * @param filePath2 A `File` instance or string path.
     * @return {Number}
     */
    static sorter (filePath1, filePath2) {
        let a = File.from(filePath1);
        return a.compare(filePath2, 'd');
    }

    /**
     * Compares two files using the `File` instances' `compare('f')` method to sort
     * files before folders (each group being sorted by name).
     * @param filePath1 A `File` instance or string path.
     * @param filePath2 A `File` instance or string path.
     * @return {Number}
     */
    static sorterFilesFirst (filePath1, filePath2) {
        let a = File.from(filePath1);
        return a.compare(filePath2, 'f');
    }

    /**
     * Compares two files using the `File` instances' `compare(false)` method to sort
     * files and folder together by name.
     * @param filePath1 A `File` instance or string path.
     * @param filePath2 A `File` instance or string path.
     * @return {Number}
     */
    static sorterByPath (filePath1, filePath2) {
        let a = File.from(filePath1);
        return a.compare(filePath2, false);
    }

    /**
     * Returns the `fs.Stats` for the specified `File` or path. If the file does not
     * exist, or an error is encountered determining the stats, the `error` property
     * will be set accordingly.
     *
     * @param {String/File} filePath
     * @return {fs.Stats}
     */
    static stat (filePath) {
        let f = File.from(filePath);

        if (!f) {
            return Stat.getError('ENOENT');
        }

        return f.stat();
    }

    /**
     * Creates a temporary directory and returns its path as a `File`.
     *
     * When no arguments are passed the first result is cached (since one temp dir is
     * often sufficient for a process).
     *
     *      let temp = File.temp();  // generates temp dir
     *
     *      let temp2 = File.temp();  // === temp
     *
     *      let temp3 = File.temp(null);  // new call to tmp.dirSync()
     *
     * @param {Object} [options] Options for `dirSync()` from the `tmp` module.
     * @return {File}
     */
    static temp (options) {
        let result = File._temp;
        let useCache = (options === undefined);

        if (!result || !useCache) {
            result = Tmp.dirSync(options);
            result = File.from(result.name);

            if (useCache) {
                File._temp = result;
            }
        }

        return result;
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
        let name = this._name;

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
        let parent = this._parent;

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
        let ext = this._extent;

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
        return File._detildify(this.path);
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
        let path = this.path,
            i = path.lastIndexOf('/');

        if (File.Win) {
            // Windows respects both / and \ as path separators
            i = Math.max(i, path.lastIndexOf('\\'));
        }

        return i;
    }

    nativePath (separator) {
        let p = this.path;

        return p && p.replace(re.split, separator || File.separator);
    }

    nativize (separator) {
        return File.from(this.nativePath(separator));
    }

    normalize () {
        return File.from(this.normalizedPath());
    }

    normalizedPath () {
        let p = this.path;
        return p && File._p.normalize(p);
    }

    relativePath (path) {
        if (path.$isFile) {
            path = path.absolutePath();
        }

        let p = this.absolutePath();

        return p && path && File._p.relative(p, path);
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

    /**
     * Compare this `File` to the other `File` or path and return -1, 0 or 1 if this
     * file is less-then, equal to or great then the `other`.
     * @param {File/String} other The file or path to which to compare this `File`.
     * @param {'d'/'f'/false} [first='d'] Pass `'d'` to group directories before files,
     * `'f'` to group files before directories or `false` to sort only by path.
     * @return {Number} -1, 0 or 1 if this file is, respectively, less-than, equal to
     * or great-than the `other`.
     */
    compare (other, first) {
        other = File.from(other);

        if (!other) {
            return 1;
        }

        if (this._stat && other._stat) {
            let p = this.parent;

            first = (first === false) ? 0 : (first || 'd');

            if (first && p && p.equals(other.parent)) {
                // Two files in the same parent folder both w/stats
                let d1 = this._stat.isDirectory();
                let d2 = other._stat.isDirectory();

                if (d1 !== d2) {
                    let c = d1 ? -1 : 1;
                    if (first === 'f') {
                        c = -c;
                    }
                    return c;
                }
            }
        }

        // Treat "/foo/bar" and "/foo/bar/" as equal (by stripping trailing delimiters)
        let a = this.unterminatedPath();
        let b = other.unterminatedPath();

        // If the platform has case-insensitive file names, ignore case...
        if (File.NOCASE) {
            a = a.toLocaleLowerCase();
            b = b.toLocaleLowerCase();
        }

        return (a < b) ? -1 : ((b < a) ? 1 : 0);
    }

    equals (other) {
        let c = this.compare(other);

        return c === 0;
    }

    isAbsolute () {
        let p = this.path;
        return p ? re.abs.test(p) || File._p.isAbsolute(p) : false;
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

            if (File.NOCASE) {
                a = a.toLocaleLowerCase();
                b = b.toLocaleLowerCase();
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
     * Returns a `File.Access` object describing the access available for this file. If
     * the file does not exist, or some other error is encountered, the `error` property
     * will be set.
     *
     *      let acc = File.from(s).access();
     *
     *      if (acc.rw) {
     *          // file at location s has R and W permission
     *      }
     *      else if (acc.error === 'ENOENT') {
     *          // no file ...
     *      }
     *      else if (acc.error) {
     *          // some other error
     *      }
     *
     * Alternatively:
     *
     *      if (File.from(s).can('rw')) {
     *          // file at location s has R and W permission
     *      }
     *
     * @return {File.Access}
     */
    access () {
        let st = this.stat();

        if (st.error) {
            return Access.getError(st.error);
        }

        return Access[st.mode & Access.rwx.mask];
    }

    /**
     * Returns `true` if the desired access is available for this file.
     * @param {"r"/"rw"/"rx"/"rwx"/"w"/"wx"/"x"} mode
     * @return {Boolean}
     */
    can (mode) {
        let acc = this.access();

        return acc[mode];
    }

    /**
     * Returns `true` if this file exists, `false` if not.
     * @return {Boolean}
     */
    exists () {
        let st = this.stat();
        return !st.error;
    }

    /**
     * Returns `true` if the specified path exists relative to this path.
     * @param {String} rel A path relative to this path.
     * @return {Boolean}
     */
    has (rel) {
        let f = this.resolve(rel);
        return f.exists();
    }

    /**
     * Returns `true` if the specified directory exists relative to this path.
     * @param {String} rel A path relative to this path.
     * @return {Boolean}
     */
    hasDir (rel) {
        let f = this.resolve(rel);

        return f.isDir();
    }

    /**
     * Returns `true` if the specified file exists relative to this path.
     * @param {String} rel A path relative to this path.
     * @return {Boolean}
     */
    hasFile (rel) {
        let f = this.join(rel);

        return f.isFile();
    }

    /**
     * Returns `true` if this file is a hidden file.
     * @param {Boolean} [asNative] Pass `true` to match native Explorer/Finder meaning
     * of hidden state.
     * @return {Boolean}
     */
    isHidden (asNative) {
        if (!File.Win || !asNative) {
            let name = this.name || '';

            if (name[0] === '.') {
                return true;
            }
        }

        if (File.Win) {
            let st = this.stat();

            return st.attrib.H; // if we got an error, H will be false
        }

        return false;
    }

    /**
     * Returns the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` but
     * ensures a fresh copy of the stats are fetched from the file-system.
     *
     * @return {fs.Stats}
     */
    restat () {
        this._stat = null;

        return this.stat();
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link but ensures a fresh copy of the stats are fetched
     * from the file-system.
     *
     * @return {fs.Stats}
     */
    restatLink () {
        this._lstat = null;

        return this.statLink();
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)`.
     *
     *      let st = File.from(s).stat();
     *
     *      if (st) {
     *          // file exists...
     *      }
     *
     * If the file does not exist, or some other error is encountered determining the
     * stats, the `error` property is set accordingly.
     *
     * The stat object is cached on this instance. Use `restat` to ensure a fresh stat
     * from the file-system. This cached stat object is shared with `asyncStat()` and
     * `asyncRestat()` methods. The `statLink()` family uses a separately cached object.
     *
     * @return {fs.Stats} The stats or `null` if the file does not exist.
     */
    stat () {
        let st = this._stat;

        if (!st) {
            let path = this.fspath;

            try {
                st = Fs.statSync(path);

                st.attrib = File.Win ? Win.attrib(path) : Attribute.NULL;
            }
            catch (e) {
                st = Stat.getError(e);
            }

            this._stat = st;
        }

        return st;
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link.
     *
     * If the file does not exist, or some other error is encountered determining the
     * stats, the `error` property is set accordingly.
     *
     * The stat object is cached on this instance. Use `restatLink` to ensure a fresh stat
     * from the file-system. This cached stat object is shared with `asyncStatLink()` and
     * `asyncRestatLink()` methods. The `stat()` family uses a separately cached object.
     *
     * @return {fs.Stats} The stats or `null` if the file does not exist.
     */
    statLink () {
        let st = this._lstat;

        if (!st) {
            let path = this.fspath;

            try {
                st = Fs.lstatSync(path);

                st.attrib = File.Win ? Win.attrib(path) : Attribute.NULL;
            }
            catch (e) {
                st = Stat.getError(e);
            }

            this._lstat = st;
        }

        return st;
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
     * Returns a `File.Access` object describing the access available for this file. If
     * the file does not exist, or some other error is encountered, the `error` property
     * is set accordingly.
     *
     *      File.from(s).asyncAccess().then(acc => {
     *          if (acc.rw) {
     *              // file at location s has R and W permission
     *          }
     *          else if (acc.error === 'ENOENT') {
     *              // no file ...
     *          }
     *          else if (acc.error) {
     *              // some other error
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
            if (st.error) {
                return Access.getError(st.error);
            }

            return Access[st.mode & Access.rwx.mask];
        });
    }

    asyncCan (mode) {
        return this.asyncAccess().then(acc => {
            return acc[mode];
        });
    }

    asyncExists () {
        return this.asyncStat().then(st => {
            return !st.error;
        });
    }

    /**
     * Returns a Promise that resolves to `true` if this file is a hidden file.
     * @param {Boolean} [asNative] Pass `true` to match native Explorer/Finder meaning
     * of hidden state.
     * @return {Promise<Boolean>}
     */
    asyncIsHidden (asNative) {
        if (!File.Win || !asNative) {
            let name = this.name || '';

            if (name[0] === '.') {
                return Promise.resolve(true);
            }
        }

        if (File.Win) {
            return this.asyncStat().then(st => {
                return st.attrib.H;  // if we got an error, H will be false
            });
        }

        return Promise.resolve(false);
    }

    /**
     * Returns the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` but
     * ensures a fresh copy of the stats are fetched from the file-system.
     *
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncRestat () {
        this._stat = null;

        return this.asyncStat();
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link but ensures a fresh copy of the stats are fetched
     * from the file-system.
     *
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncRestatLink () {
        this._lstat = null;

        return this.asyncStatLink();
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)`.
     *
     * If the file does not exist, or some other error is encountered determining the
     * stats, the `error` property is set accordingly.
     *
     *      File.from(s).asyncStat().then(st => {
     *          if (!st.error) {
     *              // file exists...
     *          }
     *      });
     *
     * The stat object is cached on this instance. Use `asyncRestat` to ensure a fresh
     * stat from the file-system. This cached stat object is shared with `stat()` and
     * `restat()` methods. The `statLink` family uses a separately cached object.
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
                Fs.stat(path, (err, st) => {
                    if (err) {
                        resolve(Stat.getError(err));
                    }
                    else {
                        st.attrib = Attribute.NULL;
                        this._stat = st;

                        if (File.Win) {
                            Win.asyncAttrib(path).then(attr => {
                                    st.attrib = attr;
                                    resolve(st);
                                },
                                e => {
                                    resolve(st);
                                });
                        }
                        else {
                            resolve(st);
                        }
                    }
                });
            });
        });
    }

    /**
     * Return the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` for a
     * (potentially) symbolic link.
     *
     * If the file does not exist, or some other error is encountered determining the
     * stats, the `error` property is set accordingly.
     *
     *      File.from(s).asyncStatLink().then(st => {
     *          if (!st.error) {
     *              // file exists...
     *          }
     *      });
     *
     * The stat object is cached on this instance. Use `asyncRestatLink` to ensure a fresh
     * stat from the file-system. This cached stat object is shared with `statLink()` and
     * `restatLink()` methods. The `stat()` family uses a separately cached object.
     *
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncStatLink () {
        if (this._lstat) {
            return Promise.resolve(this._lstat);
        }

        let path = this.fspath;

        return this._async('_asyncStatLink', () => {
            return new Promise(resolve => {
                Fs.lstat(path, (err, st) => {
                    if (err) {
                        resolve(Stat.getError(err));
                    }
                    else {
                        st.attrib = Attribute.NULL;
                        this._lstat = st;

                        if (File.Win) {
                            Win.asyncAttrib(path).then(attr => {
                                    st.attrib = attr;
                                    resolve(st);
                                },
                                e => {
                                    resolve(st);
                                });
                        }
                        else {
                            resolve(st);
                        }
                    }
                });
            });
        });
    }

    //-----------------------------------------------------------------
    // Directory Operations

    /**
     * This is the asynchronous version of the `list` method.
     *
     * @param {String} [mode] A string containing the mode characters described above.
     * @param {String/RegExp/Function} matcher Either a wildcard/glob (e.g., '*.txt'),
     * a `RegExp` or a function that accepts two arguments (the file name (a String) and
     * the `File` instance) and returns `true` to include the file.
     * @param {String} matcher.name The name of the file.
     * @param {File} matcher.file The `File` instance.
     * @return {Promise<File[]>}
     */
    asyncList (mode, matcher) {
        if (typeof mode !== 'string') {
            matcher = mode;
            mode = '';
        }

        let listMode = ListMode.get(mode);

        // If matcher is a String, we'll get a default globber compile. If it is a
        // RegExp or a Function, those things are already baked in. In all cases, we
        // have null or a function that takes a File.
        let test = Globber.from(matcher);

        return new Promise((resolve, reject) => {
            let fail = e => {
                if (listMode.T) {
                    if (reject) {
                        reject(e);
                    }
                }
                else if (resolve) {
                    resolve(null);
                }

                reject = resolve = null;
            };

            let finish = () => {
                if (!resolve) {
                    return;
                }

                reject = null;

                let statType = listMode.l ? '_lstat' : '_stat';

                if (listMode.f) {
                    result = result.filter(f => !f[statType].isDirectory());
                }
                else if (listMode.d) {
                    result = result.filter(f => f[statType].isDirectory());
                }

                if (!listMode.A) {
                    result = result.filter(f => {
                        if (listMode.hideDots && f.name[0] === '.') {
                            return false;
                        }

                        return !f[statType].attrib.H;
                    });
                }

                if (test) {
                    result  = result.filter(f => test(f.name, f));
                }

                if (listMode.o) {
                    result.sort(File.sorter);
                }

                resolve(result);
                resolve = null;
            };

            let result = [];

            Fs.readdir(this.fspath, (err, names) => {
                if (err) {
                    if (listMode.T) {
                        reject(err);
                    }
                    else {
                        resolve(null);
                    }
                    return;
                }

                let promises = [];

                names.forEach(name => {
                    let f = new File(this, name);
                    let promise;

                    f._parent = this;

                    if (test) {
                        if (listMode.l) {
                            promise = f.asyncStatLink();

                            if (listMode.s) {
                                promise = Promise.all([ promise, f.asyncStat() ]);
                            }
                        }
                        else if (listMode.s) {
                            promise = f.asyncStat();
                        }

                        if (promise) {
                            promise = promise.then(() => {
                                return test(name, f);
                            });
                        }
                        else {
                            promise = Promise.resolve(test(name, f));
                        }

                        promises.push(promise.then(keep => {
                            if (keep) {
                                result.push(f);
                            }
                        }));
                    }
                    else {
                        result.push(f);

                        // The user may have asked to cache both types of stats...
                        if (listMode.l) {
                            promises.push(f.asyncStatLink());
                        }
                        if (listMode.s) {
                            promises.push(f.asyncStat());
                        }
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
     * Generates a temporary file name in this directory and returns a Promise to its
     * path as a `File`.
     * @param {Object} [options] Options for `tmpName()` from the `tmp` module.
     * @return {Promise<File>}
     */
    asyncTemp (options) {
        options = Object.assign({
            dir: this.fspath
        }, options);

        return new Promise((resolve, reject) => {
            Tmp.tmpName(options, (err, name) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(File.from(name));
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
     * You can also pass a 2nd argument to more arbitrarily restrict the matching files:
     *
     *      // List non-hidden files with "txt" extension:
     *      dir.list('', '*.txt');
     *
     *      // List all files with name ending in ".txt":
     *      dir.list('A', /\.txt$/i);
     *
     *      // Return all ".js" files with the Windows "A" (archive) attribute:
     *      dir.list('f', (name, f) => {
     *          return name.endsWith('.js') && f.stat().attrib.A;
     *      });
     *
     * The valid options are:
     *
     *  - **A** All files are listed, even hidden files. (default is `false`)
     *  - **d** List only directories. (default is `false`)
     *  - **f** List only files (non-directories). (default is `false`)
     *  - **l** Cache the result of `statLink` for each file. (default is `false`)
     *  - **o** Order the items by `sorter`. (default is `true`)
     *  - **O** Order the items by `sorterFilesFirst`. (default is `false`)
     *  - **s** Cache the result of `stat` for each file. (default is `false`)
     *  - **w** Indicates that Windows hidden flag alone determines hidden status
     *   (default is `false` so that files names starting with dots are hidden on all
     *   platforms).
     *  - **T** Throw on failure instead of return `null`.
     *
     * @param {String} [mode] A string containing the mode characters described above.
     * @param {String/RegExp/Function} matcher Either a wildcard/glob (e.g., '*.txt'),
     * a `RegExp` or a function that accepts two arguments (the file name (a String) and
     * the `File` instance) and returns `true` to include the file.
     * @param {String} matcher.name The name of the file.
     * @param {File} matcher.file The `File` instance.
     * @return {File[]}
     */
    list (mode, matcher) {
        if (typeof mode !== 'string') {
            matcher = mode;
            mode = '';
        }

        let listMode = ListMode.get(mode);
        let ret = [];
        let names;

        if (listMode.T) {
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

        // If matcher is a String, we'll get a default globber compile. If it is a
        // RegExp or a Function, those things are already baked in. In all cases, we
        // have null or a function that takes a File.
        let test = Globber.from(matcher);

        for (let i = 0, n = names.length; i < n; ++i) {
            let name = names[i];

            if (listMode.hideDots && name[0] === '.') {
                continue;
            }

            let f = new File(this, name);
            let st = listMode.l ? f.statLink() : (listMode.s ? f.stat() : null);

            if (listMode.l && listMode.s) {
                f.stat(); // cache these but use statLink() result
            }

            if (listMode.A || !st.attrib.H) {
                if (listMode.f && st.isDirectory()) {
                    continue;
                }
                if (listMode.d && !st.isDirectory()) {
                    continue;
                }

                f._parent = this;

                if (!test || test(name, f)) {
                    ret.push(f);
                }
            }
        }

        if (listMode.O) {
            ret.sort(File.sorterFilesFirst);
        }
        else if (listMode.o) {
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

    /**
     * Asynchronously removes this file or directory.
     * @param {String} [options] Remove options (currently only "r" for recursive).
     * @return {Promise<File>} this
     */
    asyncRemove (options) {
        let opt = RemoveOptions.get(options);

        return this.asyncStatLink().then(st => {
            if (st.error) {
                throw new Error(st.error);
            }

            return new Promise((resolve, reject) => {
                let callback = err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this);
                    }
                };

                if (opt.r) {
                    rimraf(this.fspath, callback);
                }
                else if (st.isDirectory()) {
                    Fs.rmdir(this.fspath, callback);
                }
                else {
                    Fs.unlink(this.fspath, callback);
                }
            });
        });
    }

    /**
     * Removes this file or directory.
     * @param {String} [options] Remove options (currently only "r" for recursive).
     * @return {File} this
     * @chainable
     */
    remove (options) {
        let opt = RemoveOptions.get(options);

        if (this.exists()) {
            if (opt.r) {
                rimraf.sync(this.fspath);
            }
            else if (this.isDir()) {
                Fs.rmdirSync(this.fspath);
            }
            else {
                Fs.unlinkSync(this.fspath);
            }
        }

        return this;
    }

    /**
     * Generates a temporary file name in this directory and returns its path.
     * @param {Object} [options] Options for `tmpNameSync()` from the `tmp` module.
     * @return {File}
     */
    temp (options) {
        options = Object.assign({
            dir: this.fspath
        }, options);

        let result = Tmp.tmpNameSync(options);

        return File.from(result);
    }

    //-----------------------------------------------------------------
    // File Reader / Writer

    _getDriver (drivers, kind, options) {
        let driver, opts, type;

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
                driver = drivers[type];
                if (!driver) {
                    throw new Error(`No such ${kind} as "${type}"`);
                }
            }
        }

        if (!driver) {
            driver = drivers[this.extent] || drivers.text; // eg extent="json"
        }

        if (opts) {
            driver = driver.extend(opts);
        }

        return driver;
    }

    _getReader (options) {
        return this._getDriver(File.readers, 'reader', options);
    }

    _getWriter (options) {
        return this._getDriver(File.writers, 'writer', options);
    }

    asyncLoad (options) {
        let reader = this._getReader(options);

        return reader.asyncLoad(this);
    }

    asyncSave (data, options) {
        let writer = this._getWriter(options);

        return writer.asyncSave(this, data);
    }

    /**
     * For example:
     *
     *      file.load();  // default reader based on file ext
     *
     *      file.load('binary');  // use binary reader
     *
     *      file.load('text');  // use text reader
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
     *          encoding: 'utf16'  // encoding can be on reader config
     *      });
     *
     *      file.load({
     *          type: 'text',
     *          options: {  // raw fs options
     *              encoding: 'utf16'
     *          }
     *      });
     *
     * @param {File.Reader} [options] Reader options
     * @return {*}
     */
    load (options) {
        let reader = this._getReader(options);

        return reader.load(this);
    }

    /**
     * Saves the given `data` to this file.
     *
     * For example:
     *
     *      file.save(data);  // default writer based on file ext
     *
     *      file.save(data, 'binary');  // use binary writer
     *
     *      file.save(data, 'text');  // use text writer
     *
     *      file.save(data, {
     *          join: '\n'
     *      });
     *
     *      file.save(data, {
     *          type: 'text',
     *          join: '\n'
     *      });
     *
     *      file.save(data, {
     *          type: 'text',
     *          encoding: 'utf16'  // encoding can be on writer config
     *      });
     *
     *      file.save({
     *          type: 'text',
     *          options: {  // raw fs options
     *              mode: 0o777
     *          }
     *      });
     *
     * @param {String/Object} data The data to save
     * @param {File.Writer} [options] Writer options
     * @return {File} this
     * @chainable
     */
    save (data, options) {
        let writer = this._getWriter(options);

        return writer.save(this, data);
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
     * @param {File.Walker} test.state The current directory traversal state object.
     * @param {Boolean} test.return Return `true` for a match to include the `file` and
     * avoid descent into the directory.
     * @return {File[]} The files that passed the `test`.
     */
    asyncTips (mode, test) {
        if (!test) {
            test = mode;
            mode = '';
        }

        let fn = (typeof test === 'string') ? f => f.has(test) : test;
        let ret = [];

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
     * Asynchronously descends the file-system starting with the current location,
     * calling
     * the provided `before` for each file or folder.
     *
     * @param {String} [mode] The directory `list` mode string to control the traversal.
     * @param {String/RegExp} [matcher]
     * @param {Function} before A function that will be called for each file/folder
     * starting with this instance. This is the same `before` provided to the `walk`
     * method except that this function can return a Promise.
     * @param {File} before.file The file object referencing the current file or folder
     * to examine.
     * @param {File.Walker} before.state The state object tracking the traversal.
     * @param {Promise<Boolean>} before.return Return `false` to not descend into a
     * folder. Can be a Promise to this boolean result.
     * @param {Function} after A function that will be called after a folder has been
     * descended.
     * @param {File} after.file The file object referencing the current folder to
     * examine.
     * @param {File.Walker} after.state The state object tracking the traversal.
     * @param {Promise<Boolean>} after.return Can return a Promise to process before
     * continuing.
     * @return {Promise<File.Walker>} A promise that resolves to the `state` object
     * once the traversal is complete.
     */
    asyncWalk (mode, matcher, before, after) {
        let state = new File.Walker(this, mode, matcher, before, after);

        return state.asyncDescend(this).then(() => state);
    }

    /**
     * This method descends the file-system starting with this folder checking for folders
     * that match the specified `test`. When a folder matches, it is accumulated into the
     * result array that is returned and the sub-tree is descended no further (that is the
     * "tip" of a matching sub-tree).
     *
     * For example:
     *
     *      let packageDirs = dir.tips('package.json');
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
     * @param {File.Walker} test.state The current directory traversal state object.
     * @param {Boolean} test.return Return `true` for a match to include the `file` and
     * avoid descent into the directory.
     * @return {File[]} The files that passed the `test`.
     */
    tips (mode, test) {
        if (!test) {
            test = mode;
            mode = '';
        }

        let fn = (typeof test === 'string') ? f => f.has(test) : test;
        let ret = [];

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
     * `before` for processing. The `before` should return `false` to not recurse into
     * a directory.
     *
     *      dir.walk(f => {
     *      });
     *
     *      dir.walk('A', f => {
     *      });
     *
     *      dir.walk('A', '*.js', f => {
     *      });
     *
     * @param {String} [mode] The directory `list` mode string to control the traversal.
     * @param {String/RegExp} [matcher]
     * @param {Function} before A function that will be called for each file/folder
     * starting with this instance.
     * @param {File} before.file The file object referencing the current file or folder
     * to examine.
     * @param {File.Walker} before.state The state object tracking the traversal.
     * @param {Boolean} before.return Return `false` to not descend into a folder.
     * @param {Function} after A function that will be called after each folder has been
     * descended.
     * @param {File} after.file The file object referencing the current folder to examine.
     * @param {File.Walker} after.state The state object tracking the traversal.
     * @return {File.Walker} The `state` object used for the traversal.
     */
    walk (mode, matcher, before, after) {
        let state = new File.Walker(this, mode, matcher, before, after);

        state.descend(this);

        return state;
    }

    //------------------------------------------------------------------------

    _async (name, fn) {
        let pending = this[name];

        if (!pending) {
            this[name] = pending = fn().then(result => {
                this[name] = null;
                return result;
            });
        }

        return pending;
    }

    static _detildify (p) {
        if (p) {
            if (p === '~') {
                p = OS.homedir();
            }
            else if (p === '~~') {
                p = File.profile().path;
            }
            else if (re.homey.test(p)) {
                // if (p starts with "~/" or "~\\")
                p = File._p.join(OS.homedir(), p.substr(1));
            }
            else if (re.profile.test(p)) {
                // if (p starts with "~~/" or "~~\\")
                p = File.profile().join(p.substr(2)).path;
            }
        }

        return p;
    }

} // class File
const proto = File.prototype;

Object.assign(proto, {
    $isFile: true,
    _stat: null,

    _extent: undefined,
    _name: undefined,
    _parent: undefined
});

File.WIN = isWin;
File.MAC = isMac;
File.NOCASE = isWin || isMac;

File.isDirectory = File.isDir;
File.re = re;

File.separator = Path.sep;

// These are the only pieces of the path module that we use so we copy them to the
// File constructor so they can be replaced:
File._p = {
    join: Path.join,
    relative: Path.relative,
    resolve: Path.resolve,
    normalize: Path.normalize,
    isAbsolute: Path.isAbsolute
};

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

const _statModes = {
    l: {
        asyncStat: 'asyncStatLink',
        stat: 'statLink'
    },
    '': {
        asyncStat: 'asyncStat',
        stat: 'stat'
    }
};

function addTypeTest (name, statModes) {
    proto['async' + name[0].toUpperCase() + name.substr(1)] = function (mode) {
        let fn = statModes[mode || ''];
        return this[fn.asyncStat]().then(stat => {
            return !stat.error && stat[name]();
        });
    };

    return proto[name] = function (mode) {
        let fn = statModes[mode || ''];
        let stat = this[fn.stat]();

        return !stat.error && stat[name]();
    };
}

addTypeTest('isSymbolicLink', { l: _statModes.l, '': _statModes.l });

/**
 * This method will potentially use cached stats (of the specified type) for the file.
 * If this is not desired, use `stat().isBlockDevice()` instead.
 * @method isBlockDevice
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Boolean}
 */
/**
 * This is the asynchronous equivalent of `isBlockDevice()`.
 * @method asyncIsBlockDevice
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Promise<Boolean>}
 */
/**
 * This method will potentially use cached stats (of the specified type) for the file.
 * If this is not desired, use `stat().isCharacterDevice()` instead.
 * @method isCharacterDevice
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Boolean}
 */
/**
 * This is the asynchronous equivalent of `isCharacterDevice()`.
 * @method asyncIsCharacterDevice
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Promise<Boolean>}
 */
/**
 * This method will potentially use cached stats (of the specified type) for the file.
 * If this is not desired, use `stat().isDirectory()` instead.
 * @method isDirectory
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Boolean}
 */
/**
 * This is the asynchronous equivalent of `isDirectory()`.
 * @method asyncIsDirectory
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Promise<Boolean>}
 */
/**
 * This method will potentially use cached stats (of the specified type) for the file.
 * If this is not desired, use `stat().isFile()` instead.
 * @method isFile
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Boolean}
 */
/**
 * This is the asynchronous equivalent of `isFile()`.
 * @method asyncIsFile
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Promise<Boolean>}
 */
/**
 * This method will potentially use cached stats (of the specified type) for the file.
 * If this is not desired, use `stat().isFIFO()` instead.
 * @method isFIFO
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Boolean}
 */
/**
 * This is the asynchronous equivalent of `isFIFO()`.
 * @method asyncIsFIFO
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Promise<Boolean>}
 */
/**
 * This method will potentially use cached stats (of the specified type) for the file.
 * If this is not desired, use `stat().isSocket()` instead.
 * @method isSocket
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Boolean}
 */
/**
 * This is the asynchronous equivalent of `isSocket()`.
 * @method asyncIsSocket
 * @param {"l"} [mode=null] An optional mode setting for the type of stats to use for
 * the determination. By default `stat()` is used. Pass `'l'` (lowercase-L) to enable
 * `statLink()` mode.
 * @return {Promise<Boolean>}
 */
[
    'isBlockDevice', 'isCharacterDevice', 'isDirectory', 'isFile', 'isFIFO', 'isSocket'
].forEach(fn => addTypeTest(fn, _statModes));

proto.isDir = proto.isDirectory;
proto.asyncIsDir = proto.asyncIsDirectory;
proto.isSymLink = proto.isSymbolicLink;
proto.asyncIsSymLink = proto.asyncIsSymbolicLink;

//--------------------

/**
 * @class File.Access
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
 *      if (file.access().rw) {
 *          // file exists and has R and W access
 *      }
 *
 * NOTE: Instances of this class are created automatically and not be user code.
 */
class Access {
    static getError (error) {
        return Access[error] || new Access('', error);
    }

    constructor (name, error) {
        /**
         * @property {Boolean} r
         * @readonly
         * This property is `true` if the file can be read.
         */
        this.r = name.indexOf('r') > -1;

        /**
         * @property {Boolean} w
         * @readonly
         * This property is `true` if the file can be written.
         */
        this.w = name.indexOf('w') > -1;

        /**
         * @property {Boolean} x
         * @readonly
         * This property is `true` if the file can be executed.
         */
        this.x = name.indexOf('x') > -1;

        /**
         * @property {Boolean} rw
         * @readonly
         * This property is `true` if the file can be read and written.
         */
        this.rw = this.r && this.w;

        /**
         * @property {Boolean} rx
         * @readonly
         * This property is `true` if the file can be read and executed.
         */
        this.rx = this.r && this.x;

        /**
         * @property {Boolean} wx
         * @readonly
         * This property is `true` if the file can be written and executed.
         */
        this.wx = this.w && this.x;

        /**
         * @property {Boolean} rwx
         * @readonly
         * This property is `true` if the file can be read, written and executed.
         */
        this.rwx = this.r && this.w && this.x;

        /**
         * @property {String} error
         * @readonly
         * The error encountered determining the file's access. This is `null` if the
         * file's access was determined.
         */
        this.error = error || null;

        /**
         * @property {Number} mask
         * @readonly
         * This property holds the bit-wise OR of the available access modes
         * `fs.constants.R_OK`, `fs.constants.W_OK` and/or  `fs.constants.X_OK`.
         */
        this.mask = (this.r ? Fs.constants.R_OK : 0) |
                    (this.w ? Fs.constants.W_OK : 0) |
                    (this.x ? Fs.constants.X_OK : 0);

        /**
         * @property {"r"/"rw"/"rwx"/"w"/"wx"/"x"} name
         * @readonly
         * This string holds the available access modes as lowercase single letters.
         */
        this.name = name;

        /**
         * @property {"R"/"RW"/"RWX"/"W"/"WX"/"X"} nameUpper
         * @readonly
         * This string holds the available access modes as uppercase single letters.
         */
        this.nameUpper = name.toUpperCase();

        if (error) {
            Access[error] = this;
        }
        else if (name) {
            Access[name] = Access[this.mask] = Access[this.nameUpper] = this;
        }

        Object.freeze(this);
    }
}

File.Access = Access;

Access.NULL = Access['0'] = new Access('');

new Access('r');
new Access('w');
new Access('x');
new Access('rw');
new Access('rx');
new Access('wx');
new Access('rwx');

//--------------------

class Attribute {
    static get (attr) {
        let all = Attribute.all;
        let attrMap = Attribute.map;
        let cache = Attribute.cache;
        let mask = 0;
        let c, i, ret, text;

        if (typeof attr === 'string') {
            if (!(ret = (cache[attr] || cache[attr.toLowerCase()]))) {
                text = attr;

                // Turn string into a bitmask ('HCA' === 16+2+1 === 19)
                for (i = 0; i < attr.length; ++i) {
                    c = attr[i];

                    if (!attrMap[c]) {
                        throw new Error(`Invalid attribute code "${c}"`);
                    }

                    mask |= attrMap[c];
                }
            }
        }
        else {
            // Convert fswin attribute object to a mask
            for (i = all.length; i-- > 0; ) {
                if (attr[all[i][0]]) {
                    mask |= 1 << i;
                }
            }
        }

        if (!ret && !(ret = cache[mask])) {
            ret = new Attribute(mask);

            if (text) {
                // user may have passed out-of-order string, so store the attrib
                // by that key as well
                cache[text] = ret;
            }
        }

        return ret;
    }

    constructor (mask) {
        let all = Attribute.all,
            cache = Attribute.cache,
            text = '',
            c, i;

        // Build the text in canonical order while we set the appropriate flags:
        for (i = 0; i < all.length; ++i) {
            c = all[i][1];

            if (mask & (1 << i)) {
                text += c;
                this[c] = true;
            } else {
                this[c] = false;
            }
        }

        this.text = text;
        this.textLower = text.toLowerCase();

        cache[text] = cache[this.textLower] = cache[mask] = this;
    }
}

File.Attribute = Attribute;

Attribute.cache = {};
Attribute.map = {};

Attribute.all = [
    //IS_DEVICE
    //IS_DIRECTORY
    //IS_NOT_CONTENT_INDEXED
    //IS_SPARSE_FILE
    //IS_TEMPORARY
    //IS_INTEGRITY_STREAM
    //IS_NO_SCRUB_DATA
    //IS_REPARSE_POINT

    [ 'IS_ARCHIVED',    'A' ], // 1
    [ 'IS_COMPRESSED',  'C' ], // 2
    [ 'IS_ENCRYPTED',   'E' ], // 4
    [ 'IS_HIDDEN',      'H' ], // 8
    [ 'IS_OFFLINE',     'O' ], // 16
    [ 'IS_READ_ONLY',   'R' ], // 32
    [ 'IS_SYSTEM',      'S' ]  // 64
];

Attribute.NULL = Attribute.cache.null = new Attribute(0);

Attribute.all.forEach((pair, index) => {
    let c = pair[1];
    let b = 1 << index;

    Attribute.map[c] = b;
    Attribute.map[b] = c;
});

//--------------------

class Options {
    static get (mode) {
        if (mode && mode.isOptions) {
            return mode;
        }

        let cache = this.cache;
        let ret = cache[mode];

        if (!ret) {
            cache[mode] = ret = new this(mode);
            Object.freeze(ret);
        }

        return ret;
    }

    constructor (mode) {
        let defaults = this.constructor.defaults;
        let enable = null;

        Object.assign(this, defaults);

        for (let i = 0, n = mode && mode.length; i < n; ++i) {
            let c = mode[i];

            if (c === '-' || c === '+') {
                if (enable === null) {
                    enable = c === '+';
                }
                else {
                    throw new Error(`Invalid option modifier "${mode.substr(i-1)}"`);
                }
            }
            else if (c in defaults) {
                this[c] = enable !== false;
                enable = null;
            }
            else {
                this.unknownOption(c);
            }
        }
    }

    unknownOption (c) {
        throw new Error(`Invalid option flag "${c}"`);
    }
}

Options.prototype.isOptions = true;

/**
 * @class File.Globber
 *
 * This class converts "globs" (file-system wildcard expressions like "*.txt") into
 * equivalent `RegExp` instances. Normally, instances are created by `File.glob()`
 * method:
 *
 *      // Basic mode:
 *      let txtRe = File.glob('*.txt');
 *
 *      let wwwJsOrHtml = File.glob('* /www/{*.js,*.html}');
 *
 *      // With paths:
 *      let allTxtRe = File.glob('** /*.txt');
 *
 *      // Greedy wildcards and simple globs:
 *      let allTxtRe = File.glob('* /*.txt', 'GS');
 *
 * ## Case-Sensitivity ("C")
 *
 * By default, the `RegExp` is case-sensitive on platforms where file names are also
 * case-sensitive, and vise-versa. That means, on Windows and Mac OS X, the `RegExp`
 * is created with the "i" flag.
 *
 * Setting this option means that the "i" flag can be provided manually (or not) by the
 * caller.
 *
 * ## Greedy Wildcards ('G')
 *
 * When `deep` is _true_ , `'/foo/*'` is translated to a `RegExp` like `'^\/foo\/.*$'`
 * which will match any string beginning with `'/foo/'`.
 *
 * When `deep` is _false_ (the default), `'/foo/*'` is translated to a `RegExp` like
 * `'^\/foo\/[^/]*$'` which will match any string beginning with `'/foo/'` BUT which does
 * not have a '/' to the right of it.
 *
 * For example,  with `'/foo/*'` these will match: `'/foo/bar'`, `'/foo/bar.txt'` but
 * these will not `'/foo/bar/baz'`, `'/foo/bar/baz.txt'`.
 *
 * Lastly, when `deep` is _false_, `'/foo/**'` is equivalent to `'/foo/*'` with
 * `deep` set to _true_.
 *
 * ## Simple Globs ("S")
 * To disable matching so called "extended" globs (like bash) and single character
 * matching, matching ranges of characters, group matching, etc., set the "S" option.
 *
 * *NOTE*: This is shamelessly borrowed from: [glob-to-regexp](https://www.npmjs.com/package/glob-to-regexp)
 * but adjusted for better support for Windows paths.
 */
class Globber extends Options {
    static from (matcher) {
        return matcher ? Globber.DEFAULT.from(matcher) : null;
    }

    /**
     * Accepts a string of `Globber` options ("C", "G" and "S") and `RegExp` flags (all
     * other characters).
     * @param {String} options
     */
    constructor (options) {
        super(options);

        // If the user didn't support 'C' then default in 'i' according to platform:
        if (!this.C && File.NOCASE && this.flags.indexOf('i') < 0) {
            this.flags += 'i';
        }

        this.global = this.flags.indexOf('g') > -1;
    }

    compile (glob) {
        let str = String(glob);
        let inGroup = false; // true when in a group (eg {*.html,*.js})
        let reStr = "";
        let a, c, prevChar, starCount, nextChar, isGlobstar;

        for (let i = 0, len = str.length; i < len; i++) {
            c = str[i];

            if (!this.S) {
                a = 0;

                switch (c) {
                    case '?':
                        a = '.';
                        break;

                    case '[': case ']':
                        a = c;
                        break;

                    case '{':
                        inGroup = true;
                        a = '(';
                        break;

                    case '}':
                        inGroup = false;
                        a = ')';
                        break;
                }

                if (a) {
                    reStr += a;
                    continue;
                }
            }

            switch (c) {
                case '\\': // escape
                    reStr += '\\' + ((++i < len) ? str[i] : c);
                    break;

                case '$': case '^': case '+': case '.':
                case '(': case ')': case '=': case '!': case '|':
                    reStr += '\\' + c;
                    break;

                case '/':
                    reStr += File.WIN ? '[\\\\/]' : '\\/';
                    break;

                case ',':
                    if (inGroup) {
                        reStr += '|';
                        break;
                    }
                    reStr += '\\' + c;
                    break;

                case '*':
                    // Move over all consecutive '*''s.
                    // Also store the previous and next characters
                    prevChar = str[i - 1];
                    starCount = 1;

                    while (str[i + 1] === '*') {
                        starCount++;
                        i++;
                    }

                    nextChar = str[i + 1];

                    if (this.G) {
                        // simple mode so treat any number of '*' as one
                        reStr += '.*';
                    }
                    else {
                        // This is a globstar segment if we have...
                        // multiple '*''s
                        isGlobstar = starCount > 1
                            // from the start of the segment
                            && (prevChar === '/' || prevChar === undefined)
                            // to the end of the segment
                            && (nextChar === '/' || nextChar === undefined);

                        if (isGlobstar) {
                            // it's a globstar, so match zero or more path segments
                            reStr += File.WIN ? '(?:[^\\\\/]*(?:[\\\\/]|$))*'
                                              : '(?:[^/]*(?:\\/|$))*';
                            i++; // move over the '/'
                        }
                        else {
                            // it's not a globstar, so only match one path segment
                            reStr += File.WIN ? '[^\\\\/]*'
                                              : '[^/]*';
                        }
                    }
                    break;

                default:
                    reStr += c;
            }
        }

        // When regexp 'g' flag is specified don't constrain the regex with ^/$
        if (!this.global) {
            reStr = '^' + reStr + '$';
        }

        return new RegExp(reStr, this.flags);
    }
    
    from (matcher) {
        let type = typeof matcher;
        
        if (type === 'function') {
            return matcher;
        }

        if (type === 'string') {
            matcher = this.compile(matcher);
        }

        return function (path) {
            return matcher.test(path);
        };
    }

    unknownOption (c) {
        this.flags += c;
    }
}

Globber.cache = {};
Globber.defaults = {
    C: false,
    G: false,
    S: false
};

Globber.prototype.flags = '';

Globber.DEFAULT = Globber.get('');

File.Globber = Globber;

//--------------------

class ListMode extends Options {
    constructor (mode) {
        super(mode);

        // If we aren't going with 'l' but we are going to need stats, set 's'
        if (!this.l && (this.f || this.d || !this.A)) {
            this.s = true;
        }

        // showDots on Windows when options.w is true:
        this.hideDots = !this.A && !(File.Win && this.w); // = !showDots
    }
}

ListMode.cache = {};
ListMode.defaults = {
    A: false,
    d: false,
    f: false,
    l: false,
    o: true,
    O: false,
    s: false,
    w: false,
    T: false
};

ListMode.prototype.isListMode = true;

File.ListMode = ListMode;

//--------------------

class RemoveOptions extends Options {
    constructor (mode) {
        super(mode);

        this.r = this.r || this.R;  // r and R are equivalent
    }
}

RemoveOptions.cache = {};
RemoveOptions.defaults = {
    r: false,
    R: false
};

RemoveOptions.prototype.isRemoveOptions = true;

File.RemoveOptions = RemoveOptions;

//--------------------

const zeroDate = new Date();
zeroDate.setTime(0);

Object.freeze(zeroDate);

// mimics an fs.Stats instance:
class Stat {
    static getError (error) {
        let code = error.code || error;
        let ret = Stat[code];

        if (!ret) {
            ret = new Stat(code);
        }

        return ret;
    }

    constructor (error) {
        this.error = error;

        this.birthtime = this.atime = this.mtime = this.ctime = zeroDate;
        this.size = 0;
        this.attrib = Attribute.NULL;

        Stat[error] = this;

        Object.freeze(this);
    }
}

File.Stat = Stat;

//------------------------------------------------------------------------

/**
 * @class File.Walker
 */
class Walker {
    constructor (root, mode, matcher, before, after) {
        this.matcher = this.test = null;

        if (typeof mode === 'function') {
            // walk(f => {}, ...);
            after = matcher;
            before = mode;
            mode = '';
        }
        else if (typeof typeof matcher === 'function') {
            // walk('A', f => {}, ...);
            after = before;
            before = matcher;
        }
        else {
            // walk('A', '*.txt', f => {}, ...);
            let fn = Globber.from(matcher); // fn(string, File)

            // For descending, we need to list directories
            this.matcher = (name, file) => {
                return file.isDirectory() || this.test(file);
            };
            // But the user's before/after should only be called on matches
            this.test = file => {
                let rel = this.root.relativePath(file);
                return fn(rel, file);
            }
        }

        this.before = before;
        this.after = after;
        this.listMode = ListMode.get('Os' + (mode || ''));

        /**
         * @property {File} at
         * The current `File` instance.
         * @readonly
         */
        this.at = null;

        /**
         * @property {File} root
         * The `File` instance used to start the descent.
         * @readonly
         */
        this.root = root;

        /**
         * @property {File[]} stack
         * The traversal stack of `File` objects from the starting instance to the current
         * folder.
         * @readonly
         */
        this.stack = [];

        /**
         * @property {Boolean} stop
         * Set this property to `true` to abort the traversal.
         */
        this.stop = false;
    }

    _after (at) {
        if (!this.after || (this.test && !this.test(at))) {
            return true;
        }

        return this.after(at, this);
    }

    _before (at) {
        this.at = at;

        if (!this.before || (this.test && !this.test(at))) {
            return true;
        }

        return this.before(at, this);
    }

    asyncDescend (at) {
        try {
            let result = Promise.resolve(this._before(at));

            return result.then(r => {
                if (r === false || this.stop) {
                    return;
                }

                return at.asyncIsDir().then(isDir => {
                    if (isDir) {
                        return at.asyncList(this.listMode, this.matcher).then(children => {
                            let sequence = Promise.resolve();

                            this.stack.push(at);

                            children.forEach(c => {
                                sequence = sequence.then(() => {
                                    if (!this.stop) {
                                        return this.asyncDescend(c);
                                    }
                                });
                            });

                            if (this.after) {
                                sequence = sequence.then(() => {
                                    return this._after(at);
                                });
                            }

                            return sequence.then(() => {
                                this.stack.pop();
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

    descend (at) {
        let ret = this._before(at);

        if (ret === false || this.stop) {
            return;
        }

        if (at.isDir()) {
            this.stack.push(at);

            let children = at.list(this.listMode, this.matcher);

            for (let i = 0; !this.stop && i < children.length; ++i) {
                this.descend(children[i]);
            }

            this._after(at);

            this.stack.pop();
        }
    }
}

File.Walker = Walker;

//------------------------------------------------------------------------

File.Driver = class {
    constructor (config) {
        Object.assign(this, config);

        if (!this.options) {
            this.options = {};
        }
    }

    extend (config) {
        let ret = Object.create(this);

        if (config) {
            Object.assign(ret, config);

            ret.options = this.getOptions(config.options || {});

            if (!config.options) {
                // If the user didn't supply specific fs options, see about encoding
                if (config.encoding) {
                    // "options" is always a safe copy we can adjust...
                    ret.options.encoding = config.encoding;
                }
            }
        }

        return ret;
    }

    getOptions (options) {
        let ret = this.options;

        if (options) {
            ret = Object.assign(Object.assign({}, ret), options);
            delete ret.type;
        }

        return ret;
    }
};

/**
 * @class File.Reader
 */
File.Reader = class extends File.Driver {
    /**
     * @cfg {String} encoding
     * The file encoding (e.g. 'utf8').
     */

    /**
     * @cfg {Object} options
     * An object that is passed to the `fs.readFile()` or `fs.readFileSync()` method.
     * This is typically where `encoding` is placed but `encoding` can also be given
     * as a direct reader config.
     */

    asyncLoad (filename) {
        return this.asyncRead(filename).then(data => {
            return this._parse(filename, data);
        });
    }

    asyncRead (filename) {
        return new Promise((resolve, reject) => {
            Fs.readFile(File.fspath(filename), this.options, (err, data) => {
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
        let data = this.read(filename);

        return this._parse(filename, data);
    }

    parse (data) {
        let split = this.split;

        if (split) {
            data = data.split(split);
        }

        return data;
    }

    read (filename) {
        return Fs.readFileSync(File.fspath(filename), this.options);
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

Object.assign(File.Reader.prototype, {
    /**
     * @cfg {String} split
     * A string to use to split lines in the default `parse()` method.
     */
    split: null
});

File.readers = {
    binary: new File.Reader(),

    text: new File.Reader({
        options: {
            encoding: 'utf8'
        }
    })
};

File.readers.bin = File.readers.binary;
File.readers.txt = File.readers.text;

File.readers.json = File.readers.text.extend({
    parse (data) {
        // Handles comments, single-quoted strings, unquoted object keys etc.. In
        // general, JSON5 is a very relaxed form of JSON that accepts all valid JSON
        // files and goes beyond to a nearly proper JavaScript-subset. All w/o eval
        // so it is secure.
        return json5.parse(data);
    }
});

File.readers['json:strict'] = File.readers.text.extend({
    parse (data) {
        return JSON.parse(data);
    }
});

//------------------------------------------------------------------------------

/**
 * @class File.Writer
 */
File.Writer = class extends File.Driver {
    /**
     * @cfg {String} encoding
     * The file encoding (e.g. 'utf8').
     */

    /**
     * @cfg {Object} options
     * An object that is passed to the `fs.writeFile()` or `fs.writeFileSync()` method.
     * This is typically where `encoding` is placed but `encoding` can also be given
     * as a direct writer config.
     */

    asyncSave (filename, data) {
        let abs = File.from(filename).absolutify();

        // wrap this.serialize in Promise.resolve() to allow it to be a value or
        // a promise (maybe serialization needs to be async)...
        Promise.resolve(this._serialize(data)).then(content => {
            return abs.parent.asyncMkdir(this.dirmode).then(() => {
                return this.asyncWrite(abs.path, content);
            })
        });
    }

    asyncWrite (filename, data) {
        let path = File.fspath(filename);

        return new Promise((resolve, reject) => {
            Fs.writeFile(path, data, this.options, err => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }

    serialize (data) {
        let join = this.join;

        if (join != null && Array.isArray(data)) {
            data = data.join(join);
        }

        return data;
    }

    _serialize (data) {
        return this.serialize(data, this); // serialize() can be replaced
    }

    save (filename, data) {
        let content = this._serialize(data);

        this.write(filename, content);
    }

    write (filename, data) {
        let abs = File.from(filename).absolutify();

        abs.parent.mkdir(this.dirmode);

        Fs.writeFileSync(abs.path, data, this.options);
    }
};

Object.assign(File.Writer.prototype, {
    /**
     * @cfg {Number} dirmode
     * The `mode` parameter to use for `mkdir()` when creating folders.
     */
    dirmode: undefined,

    /**
     * @cfg {String} join
     * A string to use to join lines in the default `serialize()` method.
     */
    join: null
});

File.writers = {
    binary: new File.Writer(),

    text: new File.Writer({
        options: {
            encoding: 'utf8'
        }
    })
};

File.writers.bin = File.writers.binary;
File.writers.txt = File.writers.text;

File.writers.json = File.writers.text.extend({
    /**
     * @cfg {String} [indent='    ']
     * The `space` parameter to pass to `JSON.stringify()`.
     *
     * Applies only to the `json` writer.
     */
    indent: '    ',

    /**
     * @cfg {Function} [replacer]
     * The `replacer` parameter to pass to `JSON.stringify()`.
     *
     * Applies only to the `json` writer.
     */
    replacer: null,

    serialize (data) {
        return JSON.stringify(data, this.replacer, this.indent);
    }
});

File.writers.json5 = File.writers.json.extend({
    serialize (data) {
        return json5.stringify(data, this.replacer, this.indent);
    }
});

['js','ts','coffee'].forEach(ext => {
    File.readers[ext] = File.readers.text.extend();
    File.writers[ext] = File.writers.text.extend();
});

//-----------------------------------------------------------------------------

class Win {
    static asyncAttrib (path) {
        return new Promise(resolve => {
            let process = results => {
                if (results) {
                    resolve(Attribute.get(results));
                }
                else {
                    //reject(new Error(`Cannot get attributes for ${path}`));
                    resolve(Attribute.NULL);
                }
            };

            if (!fswin.getAttributes(path, process)) {
                //reject(new Error(`Cannot get attributes for ${path}`));
                resolve(Attribute.NULL);
            }
        })
    }

    static attrib (path) {
        try {
            let attr = fswin.getAttributesSync(path);
            return Attribute.get(attr);
        }
        catch (e) {
            return Attribute.NULL;
        }
    }
}

File.Win = isWin && Win;

//-----------------------------------------------------------------------------

module.exports = File;
