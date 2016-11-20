# phylo

Phylo (pronounced "File-o") is a File operations class designed for maximum
convenience and clarity of expression. The primary export of `phylo` is the
`File` class which is used to wrap a file-system path string.

Consider some examples:

    const File = require('phylo');
    
    // Starting in cwd, climb up as needed until a directory
    // containing "package.json" is found and then load that
    // file to return an object.
    
    var pkg = File.cwd().upToFile('package.json').load();
    
    // Starting in cwd, climb up as needed to find the Git
    // VCS root directory (not the ".git" folder itself):
    
    var root = File.cwd().up('.git');

If you like infinite loops, try this on Windows:

    var path = require('path');
    
    for (var dir = process.cwd(); dir; dir = path.resolve(dir, '..')) {
        // climb up...
    }

This innocent loops works on Linux/Mac because `path.resolve('/', '..')` returns
a falsey value. On Windows, however, `path.resolve('C:\\', '..')` returns... well
`"C:\\"`.

Compare to `File`:

    for (var dir = File.cwd(); dir; dir = dir.parent) {
        // climb up...
    }

## Conventions

It is intended that a `File` instance immutably describes a single path. What is
(or is not) on disk at that location can change of course, but the description is
constant.

The `File` API strives to be purely consistent on these points:

 - Methods that take path parameters accept `String` or `File` instances.
 - Methods that end in `Path` return a `String`. Otherwise they return a `File`
  instance (when paths are involved).
 - Asynchronous methods are named with the "async" prefix and return a Promise.
 - Callbacks passed to async methods can return immediate results or Promises.
 - As much as possible, exceptions and `null` return values are avoided. For
  example, `stat()` returns an object in all cases but that object may have an
  `error` property.
 - Where reasonable, objects are cached to avoid GC pressure. For example, things
  like access masks, file attributes, status errors, directory list modes, etc. are
  lazily cached as immutable (`Object.freeze()` enforced) instances and reused as
  needed.

## Path Manipulation

Much of the functionality provided by the `File` class is in the form of "lexical"
path manipulation. These are only provided in synchronous form since they operate on
path strings (like the `path` module).

### Properties

Instances of `File` provide these **readonly** properties:

 - `path` - The path to the file as a `String` (passed to the `constructor`).
 - `extent` - The file's type as a `String` (e.g., "json").
 - `name` - The file's name as a `String` (e.g., "package.json").
 - `parent` - The `File` for the parent directory (`null` at root).
 - `fspath` - The `path` string resolved for "~" (usable by `fs` or `path` modules)

### Methods

The methods that perform work on the path text and return `File` instances as a
result are:

 - `absolutify()` - Calls `path.resolve(this.path)`
 - `join()` - Joins all arguments using `path.join()`
 - `nativize()` - Make all separators native (`'\'` on Windows, `'/'` elsewhere)
 - `normalize()`- Calls `path.normalize(this.path)`
 - `relativize()`- Calls `path.relative()`
 - `resolve()`- Calls `path.resolve()` on all the arguments
 - `slashify()`- Make all separators `'/'` (Windows does understand them)
 - `terminate()` - Ensure there is a trailing separator
 - `unterminate()` - Ensure there is no trailing separator

To retrieve strings as a result, you can use these methods:

 - `absolutePath()` - Same as `absolutify` but returns a string
 - `joinPath()` - Same as `join` but returns a string
 - `nativePath()` - Same as `nativize` but returns a string
 - `normalizedPath()` - Same as `normalize` but returns a string
 - `relativePath()` - Same as `relativize` but returns a string
 - `resolvePath()` - Same as `resolve` but returns a string
 - `slashifiedPath()` - Same as `slashify` but returns a string
 - `terminatedPath()` - Same as `terminate` but returns a string
 - `unterminatedPath()` - Same as `unterminate` but returns a string

Some path operations perform I/O to the file-system and so provide both synchronous
and asynchronous versions.

 - `canonicalize()` - Calls `fs.realpathSync(this.path)` and returns a `File`
 - `canonicalPath()` - Same as `canonicalize` but returns a `String`

In asynchronous form:

 - `asyncCanonicalize()` - Same as `canonicalize` but Promises a `File`
 - `asyncCanonicalPath()` - Same as `asyncCanonicalize` but Promises a `String`

Canonicalization will result in `null` if there is no real file.

## Path Info and Comparison

You can compare two paths in a few different ways:

 - `compare(o)` - Returns -1, 0 or 1 if `this` is less, equal or greater than `o`
 - `equals(o)` - Returns `true` if `this` is equal to `o` (`compare(o) === 0`)
 - `prefixes(o)` - Returns `true` if `this` is a path prefix of `o`. It is
  recommended to use `absolutify()` on both instances first to avoid confusion with
  `..` segments.

File name comparisons are case-insensitive on Windows and Mac OS X, so we have

    var f1 = File.from('abc');
    var f2 = File.from('ABC');
    
    console.log(f1.equals(f2));
    
    > true   (on Windows and Mac)
    > false  (on Linux)

Some useful information about a file path:

 - `isAbsolute()` - Returns `true` if the file an absolute path (`path.isAbsolute()`)
 - `isRelative()` - Returns `true` if the file a relative path (`path.isRelative()`)

## File-System Information

To get information about the file on disk:

 - `access()` - Returns a `File.Access` object. If the file does not exist (or some
  other error is encountered), this object will have an `error` property.
 - `can(mode)` - Returns `true` if this exists with the desired access (`mode` is "r",
  "rw", "rwx", "w", "wx" or "x").
 - `exists()` - Returns `true` if the file exists.
 - `has(rel)` - Returns `true` if a file or folder exists at the `rel` path from this file.
 - `hasDir(rel)` - Returns `true` if a folder exists at the `rel` path from this file.
 - `hasFile(rel)` - Returns `true` if a file exists at the `rel` path from this file.
 - `isHidden()` - Returns `true` if this file does not exist or is hidden. Note that on
  Windows, hidden state is not based on a file name convention (".hidden") but is a bit
  stored in the file-system (see below).
 - `stat()` / `restat()` - Returns `fs.statSync(this.path)` (an `fs.Stats`). If the
  file does not exist (or some other error is encountered), this object will have an
  `error` property.
 - `statLink()` / `restatLink()` - Returns `fs.lstatSync(this.path)` (an `fs.Stats`). If
  the file does not exist (or some other error is encountered), this object will have an
  `error` property.

The `error` property will be a value like `"ENOENT"` (for file/folder not found), and
`"EACCES"` or `"EPERM"` for permission denied. These codes come directly from the
underlying API.

In asynchronous form:

 - `asyncAccess()` - Promises a `File.Access`
 - `asyncCan(mode)` - Promises `true` or `false`.
 - `asyncExists()` - Promises `true` or `false`.
 - `asyncHas(rel)` - TODO
 - `asyncHasDir(rel)` - TODO
 - `asyncHasFile(rel)` - TODO
 - `asyncIsHidden()` - Promises `true` or `false`
 - `asyncStat()` / `asyncRestat()` - Promises an `fs.Stats` via `fs.stat()`
 - `asyncStatLink()` / `asyncRestatLink()` - Promises an `fs.Stats` via `fs.lstat()`

### File Status

The `[fs.Stat](https://nodejs.org/api/fs.html#fs_class_fs_stats)` structure is augmented
with an `attrib` property. This is an instance of `File.Attribute` and will have these
boolean properties:

 - `A` - Archive
 - `C` - Compressed
 - `E` - Encrypted
 - `H` - Hidden
 - `O` - Offline
 - `R` - Readonly
 - `S` - System

The `[fswin](https://www.npmjs.com/package/fswin)` module is used to retrieve this
information on Windows. On other platforms, this object contains `false` values for all
of the above properties.

An `fs.Stat` object is cached on the `File` instance by the `stat()` family of methods
and a separate instance is cached on by the `statLink()` family. These are lazily
retrieved and then stored for future use. To get fresh copies, use the `restat()` family
of methods.

### File.Access

`File.Access` objects are succinct descriptions of read, write and execute permission
masks. These replace the use of `fs.constants.R_OK`, `fs.constants.W_OK` and
`fs.constants.X_OK`. For example:

    try {
        let mode = fs.statSync(file).mode;
        
        if (mode & fs.constants.R_OK && mode & fs.constants.W_OK) {
            // file exists and is R and W
        }
    }
    catch (e) {
        // ignore... file does not exist
    }

Or using `File` and `File.Access`:

    if (file.access().rw) {
        // file exists and is R & W
    }

Alternatively, there is the `can()` method:

    if (file.can('rw')) {
        // file exists and is R & W
    }

When the file does not exist, or an error is encountered, the object returned by the
`access()` method will have an `error` property. Since the access bits are all `false`
in this case, this distinction if often unimportant (as above).

To check for errors:

    var acc = file.accecss();
    
    if (acc.rw) {
        // file exists and has R/W access
    }
    else if (acc.error === 'ENOENT') {
        // file does not exist...
    }
    else if (acc.error === 'EACCES' || acc.error === 'EPERM') {
        // access or permission error...
    }
    ...

There are a fixed set of immutable `File.Access` objects, one for each combination of
R, W and X permissions: `r`, `rw`, `rx`, `rwx`, `w`, `wx`, `x`. Each instance also has
these same properties as boolean values. The full set of properties is a bit larger:

 - `r` - True if `R_OK` is set.
 - `rw` - True if `R_OK` and `W_OK` are both set.
 - `rx` - True if `R_OK` and `X_OK` are both set.
 - `rwx` - True if `R_OK`, `W_OK` and `X_OK` are all set.
 - `w` - True if `W_OK` is set.
 - `wx` - True if `W_OK` and `X_OK` are both set.
 - `x` - True if `X_OK` is set.
 - `mask` - The combination of `fs.constants` flags `R_OK`, `W_OK` and/or `X_OK`
 - `name` - The string "r", "rw", "rx", "rwx", "w", "wx" or "x"

### Classification

It is often important to know if a file is a directory or other type of entity. This
information is fundamentally the business of the `stat()` family but for convenience is
also provided on the `File` instance:

 - `isDirectory(mode)`
 - `isFile(mode)`
 - `isBlockDevice(mode)`
 - `isCharacterDevice(mode)`
 - `isFIFO(mode)`
 - `isSocket(mode)`
 - `isSymbolicLink(mode)`

In addition, the following shorthand methods are also available:

 - `isDir(mode)` (alias for `isDirectory()`)
 - `isSymLink(mode)` (alias for `isSymbolicLink()`)

These are also available as async methods:

 - `asyncIsDir(mode)`
 - `asyncIsDirectory(mode)`
 - `asyncIsFile(mode)`
 - `asyncIsBlockDevice(mode)`
 - `asyncIsCharacterDevice(mode)`
 - `asyncIsFIFO(mode)`
 - `asyncIsSocket(mode)`
 - `asyncIsSymLink(mode)`
 - `asyncIsSymbolicLink(mode)`

The optional `mode` parameter can be `'l'` (lowercase-L) to use the `statLink()` (or
`asyncStatLink()`) method to determine the result.

Since the nature of a file seldom changes on a whim, these methods use the `stat()`
methods and their cached information. If this is undesired, these results can be
refreshed using the `restat()` family of methods.

## Directory Listing

You can get a directory listing of `File` objects using:

 - `list(mode)`
 - `asyncList(mode)`

The `mode` parameter is a string that consists of the following single letter codes
with the described meaning:

 - `A` - All files are listed, even hidden files. (default is `false`)
 - `d` - List only directories. (default is `false`)
 - `f` - List only files (non-directories). (default is `false`)
 - `l` - Cache the result of `statLink` for each file. (default is `false`)
 - `o` - Order the items by `sorter`. (default is `true`)
 - `s` - Cache the result of `stat` for each file. (default is `false`)
 - `w` - Indicates that Windows hidden flag alone determines hidden status
  (default is `false` so that files names starting with dots are hidden on all
  platforms).
 - `T` - Throw (or reject) on failure instead of returning (or resolving) `null`.

Some examples:

    // List non-hidden files/folders:
    dir.list();

    // lists all files/folders (including hidden):
    dir.list('A');

    // lists non-hidden files/folders and cache stat info:
    dir.list('s');

    // lists all files (no folders) and cache stat info:
    dir.list('Asf');

    // lists all files/folders and cache stat info but do not sort:
    dir.list('As-o');

The `s` option can be useful during an `asyncList()` operation to allow subsequent
use of the simpler, synchronous `stat()` method since it will use the cached stat
object.

## File-System Traversal

### Ascent

To climb the file-system to find a parent folder that passes a `test` function or
has a particular file or folder relatively locatable from there:

 - `up(test)` - Starting at this, climb until `test` passes.
 - `upDir(rel)` - Use `up()` with `hasDir(rel)` as the `test`.
 - `upFile(rel)` - Use `up()` with `hasFile(rel)` as the `test`.

To climb the file-system and find a relatively locatable item:

 - `upTo(rel)` - Starting at this, climb until `has(rel)` is `true` and then return
  `join(rel)` from that location.
 - `upToDir(rel)` - Same as `upTo()` but using `hasDir(rel)` as the `test`.
 - `upToFile(rel)` - Same as `upTo()` but using `hasFile(rel)` as the `test`.

The different between these forms can be seen best by example:

    var file = File.cwd().up('.git');
    
    // file is the parent directory that has ".git", not the ".git"
    // folder itself. The file may be File.cwd() or some parent.
    
    var git = File.cwd().upTo('.git');
    
    // git is the ".git" folder from perhaps File.cwd() or some other
    // parent folder.

Asynchronous forms (TODO - not implemented yet):

 - `asyncUp(test)` - TODO
 - `asyncUpDir(rel)` - TODO
 - `asyncUpFile(rel)` - TODO
 - `asyncUpTo(rel)` - TODO
 - `asyncUpToDir(rel)` - TODO
 - `asyncUpToFile(rel)` - TODO

### Descent

 - `tips(mode, test)` - Returns a `File[]` of the top-most items passing the `test`.
  Once a match is found, no descent into that folder is made (hence, the "tips" of
  the sub-tree). Uses `walk(mode)` to descend the file-system.
 - `walk(mode, before, after)` - Calls `before` for all items that
  `list(mode)` generates recursively, then processes those items and
  lastly calls `after`. Both `before` and `after` are optional but one
  should be provided.

The `walk` method's `before` and `after` handlers looks like this:

    function beforeOrAfter (file, state) {
        if (file.isDir() && ...) {
            return false;  // do not recurse into file (before only)
        }
        
        if (...) {
            state.stop = true;  // stop all further walking
        }
    }
    
The `state` object has the following members:

 - `at` - The current `File` being processed.
 - `previous` - The `File` previously passed to the handler.
 - `root` - The `File` used to start the descent.
 - `stack` - A `File[]` of instances starting with the `File` used to start things.
 - `stop` - A boolean property that can be set to `true` to abort the `walk`.
 
The `tips` method's `test` looks like this:

    function test (file, state) {
        if (file.hasFile('package.json')) {
            return true; // file is a tip so gather it up and don't descend
        }
        
        return false; // keep going and/or descending
    }

The `state` parameter is the same as for the `walk` method.
 
Asynchronous forms:

 - `asyncTips(mode, test)`
 - `asyncWalk(mode, before, after)`

The `test`, `before` and `after` handlers of the asynchronous methods
accept the same parameters and return the same results as with the
synchronous forms. They can, alternatively, return a Promise if their
determination is also async.

## Reading and Writing Files

Basic file reading and decoding/parsing are provided by these methods:

 - `asyncLoad(options)` - Same as `load()` except a Promise is returned.
 - `load(options)` - Reads, decodes and parses the file according to 
  the provided `options`.

And serializing, encoding and writing is provided by:

 - `asyncSave(data, options)` - Same as `save()` except a Promise is
  returned.
 - `save(data, options)` - Serializes and encodes the data and writes
  it to this file using the specified `options`.

The act of loading a file consists initially of reading the data (obviously). To
get this part right, you need an `encoding` option which is tedious to setup in
the `fs` API, especially if the file name holds the clues you need.

Compare:

    var pkg = path.join(dir, 'package.json');

    var data = JSON.parse(fs.readfileSync(pkg, 'utf8'));

To loading using `File`:

    var pkg = dir.join('package.json');

    var data = pkg.load();

The basic advantage of the `File` approach is the error messages you get when
things go wrong. Using the first snippet you would get errors like these (based
on the parser used):

    Unexpected number in JSON at position 427

Using `load()` the message would be:

    Cannot parse ~/code/package.json: Unexpected number in JSON at position 427

With `File` there is hope in tracking down what has gone wrong.

When it is time to save the data, the process looks very symmetric:

    pkg.save(data);

Instead of the manual alternative:

    fs.writeFileSync(pkg, JSON.stringify(data, null, '    '), 'utf8');

**NOTE:** Unlike most of the `File` API, these methods throw exceptions (or reject
Promises) on failure.

### Predefined Readers

Readers are objects that manage options for reading and parsing files. The following
readers come predefined:

 - `bin` - An alias for `binary`.
 - `binary` - Reads a file as a buffer.
 - `json` - Extends the `text` reader and provides a `parse` method to
  deserialize JSON data. This uses the `[json5](https://www.npmjs.com/package/json5)`
  module to tolerate human friendly JSON.
 - `json:strict` - Extends `text` reader and uses strict `JSON.parse()`.
 - `text` - Reads a file as `utf8` encoding.
 - `txt` - An alias for `text`.

### Predefined Writers

Writers are objects that manage options for serializing and writing files. The
following writers come predefined:

 - `bin` - An alias for `binary`.
 - `binary` - Writes a file from a buffer.
 - `json` - Extends the `text` writer and provides a `serialize` method to
  write JSON data.
 - `json5` - Extends `json` writer and uses `json5.stringify()`.
 - `text` - Writes a file as `utf8` encoding. Accepts a `join` string option to
  join the data if the data is an array (of lines perhaps).
 - `txt` - An alias for `text`.

### Reader Options

The default reader is selected based on the file's type, but we can override this:
    
    var data = pkg.load('text'); // load as a simple text (not parsed)
    
Other options can be specified (e.g. to split by new-line):
    
    var data = pkg.load({
        type: 'text',
        split: /\n/g
    });

Readers support the following configuration properties:

 - `parse` - A function called to parse the file content. The method accepts two
  arguments: `data` and `reader`. The `data` parameter is the file's content and
  the `reader` is the fully configured `reader` instance.
 - `split` - An optional `RegExp` or `String` for a call to `String.split()`. This
  is used by the default `parse` method.

In addition to `reader` configuration, the `fs.readFile()` options can be supplied:

    var content = file.load({
        // The options object is passed directly to fs.readFile()
        options: {
            ...
        }
    });

The `encoding` can be specified in the `options` or directly to the `reader`:

    var content = file.load({
        encoding: 'utf16'
    });

    // Or on the fs options:
    
    var content = file.load({
        options: {
            encoding: 'utf16'
        }
    });

### Writer Options

The default writer is selected based on the file's type, but we can override this:
    
    pkg.save(data, 'text');
    
Other options can be specified (e.g. to join lines in an array with new-lines):
    
    pkg.save(data, {
        type: 'text',
        join: '\n'
    });

Writers support the following configuration properties:

 - `serialize` - A function called to convert the data and return what will be written
  to disk. The method accepts two arguments: `data` and `writer`. The `data` parameter
  is the raw file data and the `writer` is the fully configured `writer` instance.
 - `join` - An optional `String` for a call to `Array.join()` when file data is
  an array. This is used by the default `serialize` method.

The `json` writer also supports these properties:

 - `indent` maps to the `space` parameter for `JSON.stringify`.
 - `replacer` map to the `replacer` parameter for `JSON.stringify`.

In addition to `writer` configuration, the `fs.writeFile()` options can be supplied:

    file.save(data, {
        // The options object is passed directly to fs.writeFile()
        options: {
            ...
        }
    });

The `encoding` can be specified in the `options` or directly to the `writer`:

    file.save(data, {
        encoding: 'utf16'
    });

    // Or on the fs options:
    
    file.save(data, {
        options: {
            encoding: 'utf16'
        }
    });

## Static Methods

The most useful static methods are for conversion.

    var file = File.from(dir);

Regardless if the value of `dir` above is a `String` or `File`, `file` is a `File`
instance. If `dir` is `null` or `''` then `file` will be `null`.

In reverse:

    var s = File.path(file);

The `path()` method accepts `String` or `File` and returns the path (the original
string or the `path` property of the `File`). Similar to `from()`, the `path()` method
returns `''` when passed `null`. That value is still "falsey" but won't throw null
reference errors if used.

There is also `fspath()` that resolves `"~"` path elements:

    var s = File.fspath(file);

If the argument is already a `String` it is simply returned (just like the `path()`
method). If the string may contain `"~"` elements, the safe conversion would be:

    var s = File.from(file).fspath;

### Utility Methods

 - `access(fs)` - Returns a `FileAccess` for the `File` or `String`.
 - `exists(fs)` - Returns true if the `File` or `String` exists.
 - `isDir(fs)` - Returns true if the `File` or `String` is an existing directory.
 - `isFile(fs)` - Returns true if the `File` or `String` is an existing file.
 - `join(fs...)` - Return `path.join()` on the `File` or `String` args as a `File`.
 - `joinPath(fs...)` - Return `path.join()` on the `File` or `String` args as a `String`.
 - `resolve(fs...)` - Return `path.resolve()` on the `File` or `String` args as a `File`.
 - `resolvePath(fs...)` - Return `path.resolve()` on the `File` or `String` args as a `String`.
 - `split(fs)`- Returns a `String[]` from the `File` or `String`.
 - `stat(fs)` - Returns the `stat()` for the `File` or `String`.
 - `sorter(fs1, fs2)` - Calls `File.from(fs1).compare(fs2)` (useful for sorting
  `File[]` and `String[]`).

There are no asynchronous forms of these utility methods since they wouldn't really
save much:

Since this is not provided:

    File.asyncExists(file).then(exists => {
        ...
    });

Instead just do this:

    File.from(file).asyncExists().then(exists => {
        ...
    });

## Special Folders

 - `cwd()` - Wraps `process.cwd()` as a `File`.
 - `home()` - Wraps `os.homedir()` as a `File`.
 - `profile()` - Returns the platform-favored storage folder for app data.
 - `temp()` - Temporary folder for this application.

### Temp

The `temp()` and `asyncTemp()` static methods use the `[tmp](https://www.npmjs.com/package/tmp)`
module to generate a temporary folder in the appropriate location for the platform.

When these methods are called with no `options` argument, they lazily
create (and cache for future requests) a single temporary folder.

### Profile

The `profile()` method handles the various OS preferences for storing application
data.

 - Windows: `C:\Users\Name\AppData\Roaming\Company`
 - Mac OS X: `/Users/Name/Library/Application Support/Company`
 - Linux: `/home/name/.local/share/data/company`
 - Default: `/home/name/.company`

The "Company" part can be passed as the argument to `profile()` but is better left to
the top-level application to set `File.COMPANY`.

    File.COMPANY = 'Acme';

Now all libraries that use `phylo` will automatically store their profile data in the
proper folder for the user-facing application. In such a scenario it would be wise to
use the module name in the filename to ensure no collisions occur.

### The Magic Tilde

A common "pseudo" root folder for the user's home folder is `"~"`. One often sees
paths like this:

    var dir = new File('~/.acme');

The `"~"` pseudo-root is recognized throughout `File` methods. It is resolved to the
actual location using `absolutify()` or `canonicalize()` (or their other flavors). In
other cases the pseudo-root is preserved. For example:

    var dir = new File('~/.acme');
    
    console.log(dir.parent); // just "~"
    console.log(dir.join('foo'));  // ~/acme/foo

These `File` instances can be read using `load()` as well:

    var data = File.from('~/.acme/settings.json').load();

In addition there is also the `"~~/"` pseudo-root that maps the the `profile()` directory
instead of the raw homedir.

That is:

    File.COMPANY = 'Acme';

    console.log(File.from('~/foo').absolutePath());
    console.log(File.from('~~/foo').absolutePath());

    // Windows:
    > C:\Users\MyName\foo
    > C:\Users\MyName\AppData\Roaming\Acme\foo

    // Mac OS X:
    > /Users/MyName/foo
    > /Users/MyName/Library/Application Support/foo

## Creating Directories

You can create a directory structure using the `mkdir()` method (or `asyncMkdir()`).
These methods create as many directory levels as needed to create the path described
by the `File` instance.

    var dir = File.from('~~/foo').mkdir();

The `mkdir()` method returns the `File` instance after creating the directory tree.

Unlike many other `File` methods, if `mkdir()` fails it will throw an `Error`.
