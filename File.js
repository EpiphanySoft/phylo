'use strict';

const Fs = require('fs');
const OS = require('os');
const Path = require('path');
const ChildProcess = require('child_process');

const platform = OS.platform();

const re = {
    slash: /\\/g,
    split: /[\/\\]/g
};

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
 *      if (file.access().rw) {
 *          // file is R and W
 *      }
 *      // else file is missing R and/or W
 *
 * Or:
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
    /**
     * Returns the `FileAccess` object describing the access modes available for the
     * specified file. This will be `null` if the file does not exist.
     *
     * @param {String/File} file The `File` instance of path as a string.
     * @return {FileAccess}
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
        return new File(process.cwd());
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
            file = new File(path);
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
        return new File(OS.homedir());
    }

    /**
     * Returns `true` if the specified path is a directory, `false` if not.
     * @param {String/File} file The `File` or path to test.
     * @return {Boolean}
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
     * @return {Boolean}
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

    /**
     * Returns the path as a string given a `File` or string.
     * @param {String/File} file
     * @return {String}
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
     * @return {File}
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

    /**
     * Splits the given `File` or path into an array of parts.
     * @param {String/File} filePath
     * @return {String[]}
     */
    static split (filePath) {
        let path = File.path(filePath);
        return path.split(re.split);
    }

    static sorter (file1, file2) {
        var a = File.from(file1);
        return a.compare(file2);
    }

    //-----------------------------------------------------------------

    /**
     * Initialize an instance by joining the given path fragments.
     * @param {File/String...} parts
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
     */
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

    /**
     * @property {String} extent
     * @readonly
     * The type of the file at the end of the path. For example, given "/foo/bar/baz.js",
     * the `extent` is "js".
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

    compare (other) {
        if (!other) {
            return 1;
        }

        other = File.from(other);

        if (this._stat && other._stat) {
            let p = this.parent;

            if (p.equals(other.parent)) {
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
        let b = other && other.unterminatedPath() || '';

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
        return p ? Path.isAbsolute(p) : false;
    }

    isRelative () {
        var p = this.path;
        return p ? !Path.isAbsolute(p) : false;
    }

    //-----------------------------------------------------------------
    // File system checks

    /**
     * Returns a `FileAccess` object describing the access available for this file. If the
     * file does not exist, `null` is returned.
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
     * @param {Boolean} [strict] Pass `true` to throw exceptions on failure.
     * @return {FileAccess}
     */
    access (strict) {
        var st = this.stat(strict);

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
     * Returns the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` but
     * ensures a fresh copy of the stats are fetched from the file-system.
     *
     * @param {Boolean} [cache] Pass `true` to retain a cached stat object after this
     * call.
     * @param {Boolean} [strict] Pass `true` to throw exceptions on failure.
     * @return {fs.Stats}
     */
    restat (cache, strict) {
        this._stat = null;

        let ret = this.stat(strict);

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
     * @param {Boolean} [strict] Pass `true` to throw exceptions on failure.
     * @return {fs.Stats}
     */
    restatLink (cache, strict) {
        this._stat = null;

        let ret = this.statLink(strict);

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
     * @param {Boolean} [strict] Pass `true` to throw exceptions on failure.
     * @param {Boolean} [skipAttr] (private) Pass `true` to skip Windows attributes.
     * @return {fs.Stats} The stats or `null` if the file does not exist.
     */
    stat (strict, skipAttr) {
        let ret = this._stat;

        if (!ret) {
            let path = this.path;

            if (strict) {
                ret = Fs.statSync(path);

                if (File.Win && !skipAttr) {
                    ret.attribs = Win.attrib(path)[0];
                }
            }
            else {
                try {
                    ret = Fs.statSync(path);

                    if (File.Win && !skipAttr) {
                        ret.attribs = Win.attrib(path)[0];
                    }
                }
                catch (e) {
                    // ignore
                }
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
     * @param {Boolean} [strict] Pass `true` to throw exceptions on failure.
     * @param {Boolean} [skipAttr] (private) Pass `true` to skip Windows attributes.
     * @return {fs.Stats} The stats or `null` if the file does not exist.
     */
    statLink (strict, skipAttr) {
        let ret = this._stat;

        if (!ret) {
            let path = this.path;

            if (strict) {
                ret = Fs.lstatSync(path);

                if (File.Win && !skipAttr) {
                    ret.attribs = Win.attrib(path)[0];
                }
            }
            else {
                try {
                    ret = Fs.lstatSync(path);

                    if (File.Win && !skipAttr) {
                        ret.attribs = Win.attrib(path)[0];
                    }
                }
                catch (e) {
                    // ignore
                }
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
     *      f = file.upDir('.git');
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
     *      f = file.upFile('package.json');
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
     * @param {Boolean} [strict] Pass `true` to throw exceptions on failure.
     * @return {Promise}
     */
    asyncAccess (strict) {
        return this.asyncStat(strict).then(st => {
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
     * Returns the `[fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)` but
     * ensures a fresh copy of the stats are fetched from the file-system.
     *
     * @param {Boolean} [cache] Pass `true` to retain a cached stat object after this
     * call.
     * @param {Boolean} [strict] Pass `true` to reject on failure.
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncRestat (cache, strict) {
        this._stat = null;

        let ret = this.asyncStat(strict);

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
     * @param {Boolean} [strict] Pass `true` to throw exceptions on failure.
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncRestatLink (cache, strict) {
        this._stat = null;

        let ret = this.asyncStatLink(strict);

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
     * @param {Boolean} [strict] Pass `true` to reject on failure.
     * @param {Boolean} [skipAttr] (private) Pass `true` to skip Windows attributes.
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncStat (strict, skipAttr) {
        if (this._stat) {
            return Promise.resolve(this._stat);
        }

        let path = this.path;

        return this._async('_asyncStat', () => {
            return new Promise((resolve, reject) => {
                Fs.stat(path, (err, stats) => {
                    if (err) {
                        if (strict) {
                            reject(err);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    else if (File.Win && !skipAttr) {
                        WinAsync.attrib(path).then(attr => {
                            stats.attribs = attr;
                            resolve(stats);
                        },
                        err => {
                            if (strict) {
                                reject(err);
                            }
                            else {
                                stats.attribs = '';
                                resolve(stats);
                            }
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
     * @param {Boolean} [strict] Pass `true` to reject on failure.
     * @param {Boolean} [skipAttr] (private) Pass `true` to skip Windows attributes.
     * @return {Promise<fs.Stats>} The stats or `null` if the file does not exist.
     */
    asyncStatLink (strict, skipAttr) {
        if (this._stat) {
            return Promise.resolve(this._stat);
        }

        let path = this.path;

        return this._async('_asyncStatLink', () => {
            return new Promise((resolve, reject) => {
                Fs.lstat(path, (err, stats) => {
                    if (err) {
                        if (strict) {
                            reject(err);
                        }
                        else {
                            resolve(null);
                        }
                    }
                    else if (File.Win && !skipAttr) {
                        WinAsync.attrib(path).then(attr => {
                            stats.attribs = attr;
                            resolve(stats);
                        },
                        err => {
                            if (strict) {
                                reject(err);
                            }
                            else {
                                stats.attribs = '';
                                resolve(stats);
                            }
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
    // Directory Listing

    _parseListMode (mode) {
        var options = this._parseMode({
            A: false,
            a: true,
            d: false,
            f: false,
            l: false,
            o: true,
            s: false,
            w: false
        }, mode);

        options.hideDots = File.Win ? !options.w : true;
        options.cachify = options.l || options.s;
        options.statify = options.s || options.f || options.d;

        if (!options.s && !options.l) {
            options.a = false;
        }

        if (File.Win && (!options.A || options.a)) {
            // To filter hidden files on Windows, we need attributes
            options.attribs = true;
        }

        return options;
    }

    _parseMode (flags, mode) {
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
        var options = this._parseListMode(mode);

        return new Promise((resolve, reject) => {
            var fail = e => {
                if (reject) {
                    reject(e);
                    reject = null;
                }
            };
            var finish = () => {
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

                        let attrib = attribMap && attribMap[name] || '';

                        return attrib.indexOf('H') < 0;
                    });
                }

                result.forEach(f => {
                    if (options.cachify) {
                        if (attribMap) {
                            f._stat.attribs = attribMap[f.name] || '';
                        }
                    }
                    else {
                        f._stat = null;
                    }
                });

                if (options.o) {
                    result.sort(File.sorter);
                }

                resolve(result);
            };

            var attribMap, result = [];

            Fs.readdir(this.path, (err, names) => {
                if (err) {
                    reject(err);
                    return;
                }

                var promises = [];

                if (options.attribs) {
                    promises.push(WinAsync.attribMap(this.join('*').path).then(a => {
                        attribMap = a;
                    },
                    fail));
                }

                names.forEach(name => {
                    let f = new File(this, name);

                    result.push(f);

                    if (options.l) {
                        promises.push(f.asyncStatLink(false, true).then(st => {
                            f._stat = st;
                        }));
                    }
                    else if (options.statify) {
                        promises.push(f.asyncStat(false, true).then(st => {
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
     *  - **a** Include Windows attribute information (e.g., 'HRA'). (default is `true`
     *   but only applies if **l** or **s** are enabled)
     *  - **d** List only directories. (default is `false`)
     *  - **f** List only files (non-directories). (default is `false`)
     *  - **l** Cache the result of `statLink` for each file. (default is `false`)
     *  - **o** Order the items by `sorter`. (default is `true`)
     *  - **s** Cache the result of `stat` for each file. (default is `false`)
     *  - **w** Indicates that Windows hidden flag alone determines hidden status
     *   (default is `false` so that files names starting with dots are hidden on all
     *   platforms).
     *
     * @param {String} mode A string containing the mode characters described above.
     * @return {File[]}
     */
    list (mode) {
        var options = this._parseListMode(mode);
        var names = Fs.readdirSync(this.path);
        var attribMap = options.attribs && Win.attribMap(this.join('*').path);
        var ret = [];

        for (let i = 0, n = names.length; i < n; ++i) {
            let name = names[i];
            let attrib = attribMap && attribMap[name] || '';

            if (!options.A) {
                if (options.hideDots && name[0] === '.') {
                    continue;
                }

                if (attrib.indexOf('H') > -1) {
                    continue;
                }
            }

            let f = new File(this, name);
            let st = options.l ? f.statLink(false, true) :
                        (options.statify ? f.stat(false, true) : null);

            if (st) {
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

                if (attribMap) {
                    st.attribs = attrib;
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

    //-----------------------------------------------------------------
    // File Loader

    asyncLoad (options) {
        let loader = this.getLoader(options);

        return loader.asyncLoad(this, options);
    }

    getLoader (options) {
        let loader;

        if (options) {
            if (options.type) {
                loader = File.loaders[options.type];
                if (!loader) {
                    throw new Error(`No such loader as "${options.type}"`);
                }
            }
        }

        if (!loader) {
            loader = File.loaders[this.extent] || File.loaders.text; // eg "json"
        }

        return loader;
    }

    load (options) {
        let loader = this.getLoader(options);

        return loader.load(this, options);
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
            let options = config.options;

            Object.assign(loader, config);

            if (options) {
                loader.options = this.getOptions(options);
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

    asyncLoad (filename, options) {
        options = this.getOptions(options);

        return this.asyncRead(filename, options).then(data => {
            return this._parse(filename, data, options);
        });
    }

    asyncRead (filename, options) {
        return new Promise((resolve, reject) => {
            Fs.readFile(File.path(filename), options, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
    }

    load (filename, options) {
        options = this.getOptions(options);

        var data = this.read(filename, options);

        return this._parse(filename, data, options);
    }

    parse (data) {
        var split = this.split;

        if (split) {
            data = data.split(split);
        }

        return data;
    }

    read (filename, options) {
        return Fs.readFileSync(File.path(filename), options);
    }

    _parse (filename, data, options) {
        try {
            return this.parse(data, options);
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
        return JSON.parse(data);
    }
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

//              attrib    ctime  atime  mtime  size   name
//              [1]       [2]    [3]    [4]    [5]    [6]
re.statLine = /^([A-Z]+)\t(\d+)\t(\d+)\t(\d+)\t(\d+)\t(.+)$/;

function Empty () {}
Empty.prototype = Object.create(null);

class Win {
    /**
     * Returns an array of attribute/name pairs. For example:
     *
     *      File.Win.attrib('C:\\*');
     *
     *      // [
     *      //     ['D', 'Program Files'],
     *      //     ['D', 'Users']
     *      // ]
     *
     * @param {String} path
     * @return {Array[]}
     */
    static attrib (path) {
        let lines = this.run('dir', path);

        return Win.parseAttribs(lines);
    }

    /**
     * Returns an object of attributes keyed by filename. For example:
     *
     *      File.Win.attrib('C:\\*');
     *
     *      // {
     *      //     'Program Files': 'D',
     *      //     'Users': 'D'
     *      // ]
     *
     * @param {String} path
     * @return {Object}
     */
    static attribMap (path) {
        let attribs = this.attrib(path);

        return Win.makeAttribMap(attribs);
    }

    static dir (path) {
        let lines = this.run('dir', path);

        return Win.parseStats(lines);
    }

    static makeAttribMap (attribs) {
        let map = new Empty();

        for (let i = 0, n = attribs.length; i < n; ++i) {
            let attr = attribs[i];
            let name = attr[1];

            if (name !== '__proto__') {
                map[name] = attr[0];
            }
        }

        return map;
    }

    static parseAttrib (text) {
        let parts = re.statLine.exec(text);

        if (parts) {
            return [ parts[1], parts[6] ];
        }

        return null;
    }

    static parseAttribs (lines) {
        let content = lines.filter(line => !!line);
        return content.map(Win.parseAttrib);
    }

    static parseStat (text) {
        let parts = re.statLine.exec(text);
        let stat = parts && new Fs.Stats();

        if (parts) {
            for (let i = 0; i < dateParts.length; ++i) {
                let d = new Date();

                d.setTime(+parts[i + 2] * 1000); // millisec

                stat[dateParts[i]] = d;
            }

            stat.nlink = 1;
            stat.ino = stat.uid = stat.gid = stat.rdev = 0;

            stat.attribs = parts[1];
            stat.ctime = stat.mtime;  // no ctime on Windows
            stat.path = parts[6];
            stat.size = +parts[5];
        }
/*
 dev: -760113522,
  mode: 16822,
  blksize: undefined,
  size: 0,
  blocks: undefined,
 */
        return stat;
    }

    static parseStats (lines) {
        let content = lines.filter(line => !!line);
        return content.map(Win.parseStat);
    }

    static run (...args) {
        return this.spawn(Win.exe, ...args);
    }

    static spawn (cmd, ...args) {
        var process = ChildProcess.spawnSync(cmd, args, { encoding: 'utf8' });

        if (process.error) {
            throw process.error;
        }

        if (process.status) {
            throw new Error(`Failed to perform "${args.join(" ")}" (code ${process.status})`);
        }

        let lines = process.stdout.toString().trim();

        lines = lines ? lines.split('\r\n') : [];

        return lines;
    }
}

class WinAsync extends Win {
    static attrib (path) {
        return this.run('dir', path).then(lines => Win.parseAttribs(lines));
    }

    static attribMap (path) {
        return this.attrib(path).then(attribs => Win.makeAttribMap(attribs));
    }

    static dir (path) {
        return this.run('dir', path).then(lines => Win.parseStats(lines));
    }

    static spawn (cmd, ...args) {
        return new Promise(resolve => {
            var lines = '';
            var process = ChildProcess.spawn(cmd, args, { encoding: 'utf8' });

            process.stdout.on('data', data => {
                lines += data.toString();
                //console.log('data:', data);
            });

            // process.on('error', function(err) {
            //     console.log('error', err);
            // });
            // process.on('exit', function(err) {
            //     console.log('exit', err);
            // });

            process.on('close', (code, signal) => {
                if (code) {
                    reject(new Error(`Failed to perform "${args.join(" ")}" (code ${code})`));
                }
                else if (signal) {
                    reject(new Error(`Failed to perform "${args.join(" ")}" (signal ${signal})`));
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
    File.WinAsync = WinAsync;

    console.log(`File.Win.exe = ${Win.exe}`);
}

//------------------------------------------------------------

module.exports = File;

//------------------------------------------------------------

var f = File.cwd();

console.log(`home: ${File.home()}`);
console.log(`profile: ${File.profile('Acme')}`);

//console.log('dir:', Win.dir(f.path));

console.log(f);
console.log(f.exists());
console.log(f.access().name);
//console.log(f.stat());
//f.list('s+o').forEach(f => console.log('dir: ', f.path));

f.asyncList('Asd').then(files => {
    files.forEach(f => console.log('dir: ', f.path));
});

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
