# phylo

Phylo (pronounced "File-o") is a File operations class designed for maximum
convenience and clarity of expression. Consider some examples:

    const File = require('phylo');
    
    // Starting in cwd, climb up as needed until a directory
    // containing "package.json" is found and then load that
    // file to return an object.
    
    var pkg = File.cwd().upToFile('package.json').load();
    
    // Starting in cwd, climb up as needed to find the Git
    // VCS root directory (not the ".git" folder itself):
    
    var root = File.cwd().up('.git');

## Path Manipulation

Much of the functionality provided by the File class is in the form of "lexical"
path manipulation. These method are only provided in synchronous form since they
only operate on path strings (like the `path` module).

The methods that perform work on the path text and return `File` instances as a
result are:

 - `absolutify()` - Calls `path.resolve(this.path)`
 - `join()` - Joins all arguments using `path.join()`
 - `nativize()` - Make all separators native (`\` on Windows, `/` elsewhere)
 - `normalize()`- Calls `path.normalize(this.path)`
 - `parent` - Readonly `File` property for the parent directory (`null` at root)
 - `relativize()`- Calls `path.relative()`
 - `resolve()`- Calls `path.resolve()` on all the arguments
 - `slashify()`- Make all separators `/` (Windows does understand them)
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

To retrieve the file's type (or extension):

 - `extent` - Reaonly only `String` property (e.g., "json")

Some path operations perform I/O to the file-system and so provide both synchronous
and asynchronous versions.

 - `canonicalize()` - Calls `fs.realpathSync(this.path)` and returns a `File`
 - `canonicalPath()` - Same as `canonicalize` but returns a `String`

In asynchronous form:

 - `asyncCanonicalize()` - Same as `canonicalize` but Promises a `File`
 - `asyncCanonicalPath()` - Same as `asyncCanonicalize` but Promises a `String`

## Path Info and Comparison

You can compare two paths in a few different ways:

 - `compare(o)` - Returns -1, 0 or 1 if `this` is less, equal or greater than `o`
 - `equals(o)` - Returns `true` if `this` is equal to `o` (`compare(o) === 0`)
 - `prefixOf(o)` - Returns `true` if `this` is a path prefix of `o`. Best to
  use `absolutify()` on both instances first to avoid issues with `..` segments.

Some useful information about a file path:

 - `isAbsolute()` - Returns `true` if the file an absolute path (`path.isAbsolute()`)
 - `isRelative()` - Returns `true` if the file a relative path (`path.isRelative()`)

## File-System Information

To get information about the file on disk:

 - `access()` - Returns a `FileAccess` object or `null` if the file doesn't exist.
 - `can(mode)` - Returns `true` if the file exists and has the desired access mode.
 - `exists()` - Returns `true` if the file exists.
 - `has(rel)` - Returns `true` if a file or foledr exists at the `rel` path from this file.
 - `hasDir(rel)` - Returns `true` if a folder exists at the `rel` path from this file.
 - `hasFile(rel)` - Returns `true` if a file exists at the `rel` path from this file.
 - `isHidden()` - Returns `true` if this file does not exist or is hidden.
 - `stat()` / `restat()` - Returns `fs.statSync(this.path)` (an `fs.Stats`).
 - `statLink()` / `restatLink()` - Returns `fs.lstatSync(this.path)` (an `fs.Stats`).

In asynchronous form:

 - `asyncAccess()` - Promises a `FileAccess`
 - `asyncCan(mode)` - Promises `true` or `false`.
 - `asyncExists()` - Promises `true` or `false`.
 - `asyncHas(rel)` - TODO
 - `asyncHasDir(rel)` - TODO
 - `asyncHasFile(rel)` - TODO
 - `asyncIsHidden()` - Promises `true` or `false`
 - `asyncStat()` / `asyncRestat()` - Promises an `fs.Stats` via `fs.stat()`
 - `asyncStatLink()` / `asyncRestatLink()` - Promises an `fs.Stats` via `fs.lstat()`

## Directory Listing

You can get a directory listing of `File` objects using:

 - `list(mode)`
 - `asyncList(mode)`

## File-System Traversal

### Ascent

To climb the file-system to find a parent folder that passes a `test` function or
has a particular file or folder relatively locatable from there:

 - `up(test)` - Starting at this, climb until `test` passes.
 - `upDir(rel)` - Use `up()` with `hasDir(rel)` as the `test.
 - `upFile(rel)` - Use `up()` with `hasFile(rel)` as the `test.

To climb the file-system and find a relatively locatable item:

 - `upTo(rel)` - Starting at this, climb until `has(rel)` and `join(rel)` from there.
 - `upDir(rel)` - Same as `upTo()` but using `hasDir(rel)` as the `test.
 - `upFile(rel)` - Same as `upTo()` but using `hasFile(rel)` as the `test.

The different between these forms can be seen best by example:

    var file = File.cwd().up('.git');
    
    // file is the parent directory that has ".git", not the ".git"
    // folder itself. The file may be File.cwd() or some parent.
    
    var git = File.cwd().upTo('.git');
    
    // git is the ".git" folder from perhaps File.cwd() or some other
    // parent folder.

Asynchronous forms:

 - `asyncUp(test)` - TODO
 - `asyncUpDir(rel)` - TODO
 - `asyncUpFile(rel)` - TODO
 - `asyncUpTo(rel)` - TODO
 - `asyncUpDir(rel)` - TODO
 - `asyncUpFile(rel)` - TODO

### Descent
